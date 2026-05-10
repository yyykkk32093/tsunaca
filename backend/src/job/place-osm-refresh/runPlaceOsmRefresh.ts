/**
 * Place OSM 月次最新化ジョブ — スケルトン
 *
 * Wave6 Phase6 W6-07 で骨格のみ用意。本実装は CF-5（committed-features 参照）。
 *
 * 概要:
 * - 月次（毎月1日 03:00 JST 想定）で OSM スナップショットを再取得し Place を upsert
 * - 実体は `backend/infra/database/seeds/osm/` の `osm:run-all` を呼び出すラッパ
 * - blue/green切替・監視通知・ロールバック等は CF-5 で実装
 *
 * 起動例（cron / systemd timer から）:
 *   NODE_ENV=production node dist/job/place-osm-refresh/runPlaceOsmRefresh.js
 */
import { loadEnv } from '@/_sharedTech/config/loadEnv.js'
import { logger } from '@/_sharedTech/logger/logger.js'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

loadEnv({ envDir: path.resolve(process.cwd(), 'env') })

const OSM_DIR = path.resolve(process.cwd(), 'infra/database/seeds/osm')

async function main(): Promise<void> {
    const startedAt = new Date()
    logger.info({ msg: 'place-osm-refresh: started', startedAt: startedAt.toISOString() })

    // CF-5 で本実装する範囲:
    // - blue/green ステージング切替
    // - 件数異常検知（前回比 ±X% で警告）
    // - Slack通知
    // - ロールバック
    // 本スケルトンでは osm:run-all を直接実行するのみ
    const result = spawnSync('pnpm', ['osm:run-all'], {
        cwd: OSM_DIR,
        stdio: 'inherit',
        env: process.env,
    })

    const finishedAt = new Date()
    const durationMs = finishedAt.getTime() - startedAt.getTime()

    if (result.status !== 0) {
        logger.error({
            msg: 'place-osm-refresh: failed',
            exitCode: result.status,
            durationMs,
        })
        process.exit(result.status ?? 1)
    }

    logger.info({
        msg: 'place-osm-refresh: completed',
        finishedAt: finishedAt.toISOString(),
        durationMs,
    })
}

main().catch((err) => {
    logger.error({ msg: 'place-osm-refresh: unhandled error', err })
    process.exit(1)
})
