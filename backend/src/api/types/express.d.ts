/**
 * Express の Request 型を拡張し、認証ミドルウェアが設定する user プロパティの型安全性を確保する。
 */
declare namespace Express {
    interface Request {
        user?: {
            userId: string
            email: string
            /**
             * Wave6 Phase 8-A: プラットフォーム（運営側）権限。
             * authMiddleware では設定されない（JWT 軽量化のため）。
             * requireSystemAdmin ミドルウェア通過後にのみ確実にセットされる。
             * 値: 'USER' | 'OPERATOR' | 'SUPER_ADMIN'
             */
            systemRole?: string
        }
    }
}
