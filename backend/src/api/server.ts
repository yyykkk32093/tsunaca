// src/server.ts

import { ApplicationEventBootstrap } from '@/_bootstrap/ApplicationEventBootstrap.js';
import { DomainEventBootstrap } from '@/_bootstrap/DomainEventBootstrap.js';
import { RealtimeEmitterBootstrap } from '@/_bootstrap/RealtimeEmitterBootstrap.js';
import { TransactionalDomainEventBootstrap } from '@/_bootstrap/TransactionalDomainEventBootstrap.js';
import { AppSecretsLoader } from '@/_sharedTech/config/AppSecretsLoader.js';
import { loadEnv } from '@/_sharedTech/config/loadEnv.js';
import { prisma } from '@/_sharedTech/db/client.js';
import { errorHandler } from '@/api/middleware/errorHandler.js';
import { PlaceMemoryCache } from '@/domains/place/infrastructure/cache/PlaceMemoryCache.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import fs from 'fs/promises';
import http from 'http';
import path, { dirname } from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { loadConfig, register } from 'tsconfig-paths';
import { fileURLToPath, pathToFileURL } from 'url';
import util from 'util';
// ============================================================
// 🧭 ESM用 __dirname
// ============================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================
// 🌱 env 読み込み（backend/env）
// ============================================================
loadEnv({ envDir: path.resolve(__dirname, '../../env') })
console.log('🌿 env loaded. NODE_ENV =', process.env.NODE_ENV);

// ============================================================
// 🧩 tsconfig-paths
// backend/tsconfig.json を厳密に参照する
// ============================================================
// const projectRoot = path.resolve(__dirname, '..'); // backend/
// const tsConfig = loadConfig(projectRoot);

const projectRoot = path.resolve(__dirname, '../..');
const tsConfig = loadConfig(projectRoot);

if (tsConfig.resultType === 'success') {
    register({
        baseUrl: tsConfig.absoluteBaseUrl,
        paths: tsConfig.paths,
    });
    console.log('✅ tsconfig-paths registered');
} else {
    console.warn('⚠️ tsconfig-paths failed:', tsConfig.message ?? '');
}

// ============================================================
// 🚀 Express 初期化
// ============================================================
const app = express();

// CORS: credentials (httpOnly Cookie) を送受信するため明示的にオリジン指定
const allowedOrigins = [
    'http://localhost:5173',  // Vite dev server
    'http://localhost:4173',  // Vite preview
];
app.use(cors({
    origin: (origin, callback) => {
        // origin が undefined の場合は同一オリジン（サーバー間通信等）
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS not allowed for origin: ${origin}`));
        }
    },
    credentials: true,
}));

app.use(cookieParser());

// Stripe Webhook は raw body が必要なため、/v1/webhooks/stripe を除外
app.use((req, res, next) => {
    if (req.originalUrl === '/v1/webhooks/stripe') {
        next();
    } else {
        express.json()(req, res, next);
    }
});
app.use(express.urlencoded({ extended: true }));

// 静的ファイル配信（アップロードファイル）
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

console.log('🟡 Starting server boot sequence...');
const apiRoot = path.resolve(__dirname, '.');

// ============================================================
// 📦 ルート自動ロード
// ============================================================
const loadRoutes = async (dir: string) => {
    console.log(`📂 Loading routes from: ${dir}`);
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            await loadRoutes(fullPath);
            continue;
        }

        if (entry.isFile() && (entry.name.endsWith('Routes.js') || entry.name.endsWith('Routes.ts'))) {
            // if (entry.isFile() && entry.name.endsWith('Routes.ts')) {
            console.log(`📦 Importing route: ${fullPath}`);

            try {
                const routeModule = await import(pathToFileURL(fullPath).href);
                const router = routeModule.default;

                if (router) {
                    app.use('/', router);
                    console.log(`✅ Registered route: ${path.relative(apiRoot, fullPath)}`);
                } else {
                    console.warn(`⚠️ No default export found in ${entry.name}`);
                }
            } catch (err) {
                console.error(`❌ Failed to import route: ${entry.name}`);
                console.error(err);
                throw err;
            }
        }
    }
};

// ============================================================
// 🩺 サーバ起動
// ============================================================
try {
    // アプリケーションシークレットをロード（起動時に1回だけ）
    await AppSecretsLoader.load()
    console.log('🔑 App secrets loaded (OAuth + Database)');

    await loadRoutes(apiRoot);

    // ============================================================
    // �️  PlaceMemoryCache 起動時ロード（失敗時はDBフォールバック）
    // ============================================================
    await PlaceMemoryCache.get().initialize(prisma);

    // ============================================================
    // �🔔  EventSubscriber 登録
    // ===========================================================
    ApplicationEventBootstrap.bootstrap()
    DomainEventBootstrap.bootstrap()
    TransactionalDomainEventBootstrap.bootstrap()


    app.get('/health', (_req, res) => {
        res.status(200).json({ status: 'ok', env: process.env.NODE_ENV });
    });

    // ============================================================
    // 🧯 Error handler（routesの後に登録）
    // ============================================================
    app.use(errorHandler)

    // ============================================================
    // 🔌 HTTP Server + Socket.io
    // ============================================================
    const httpServer = http.createServer(app);
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: allowedOrigins,
            credentials: true,
        },
    });

    // Socket.io を app に保存（他モジュールから参照可能に）
    app.set('io', io);

    // IRealtimeEmitter シングルトン初期化（NotificationService 等で使用）
    RealtimeEmitterBootstrap.initialize(io);

    // WebSocket 認証ミドルウェア
    io.use(async (socket, next) => {
        const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
        const { JwtTokenService } = await import('@/_sharedTech/security/JwtTokenService.js');
        const jwtService = new JwtTokenService(jwtSecret);

        // 1. handshake.auth.token → 2. Cookie
        let token = socket.handshake.auth?.token as string | undefined;
        if (!token) {
            const cookieHeader = socket.handshake.headers.cookie;
            if (cookieHeader) {
                const match = cookieHeader.match(/token=([^;]+)/);
                if (match) token = match[1];
            }
        }

        if (!token) {
            return next(new Error('UNAUTHORIZED'));
        }

        try {
            const payload = jwtService.verify(token);
            (socket as any).user = { userId: payload.sub, email: payload.email };
            next();
        } catch {
            next(new Error('INVALID_TOKEN'));
        }
    });

    // WebSocket イベントハンドラを動的ロード
    const { registerSocketHandlers } = await import('@/api/ws/socketHandlers.js');
    registerSocketHandlers(io);

    const PORT = Number(process.env.PORT || 3000);
    httpServer.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
} catch (err) {
    console.error('🔥 Fatal error during startup:');
    console.error(util.inspect(err, { depth: 10, colors: true }));
}

