/**
 * Wave6 Phase 7-2: Help endpoint ルーティング
 */
import { authMiddleware } from '@/api/middleware/authMiddleware.js'
import { requireSystemAdmin } from '@/api/middleware/requireSystemAdmin.js'
import { Router, type NextFunction, type Request, type Response } from 'express'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import { adminHelpFeedbackController, helpController } from '../controllers/helpController.js'

const router = Router()

// IP/ユーザーあたり制限（フィードバック spam 抑止）
const feedbackLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) =>
        (req as { user?: { userId: string } }).user?.userId ?? ipKeyGenerator(req.ip ?? ''),
    message: { code: 'RATE_LIMITED', message: 'リクエストが多すぎます' },
})

// optional auth: トークンが付いていれば検証、無くても通す
const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
    const hasAuth = !!req.headers.authorization || !!(req as { cookies?: { token?: string } }).cookies?.token
    if (!hasAuth) return next()
    return authMiddleware(req, res, next)
}

router.post('/v1/help/feedback', optionalAuth, feedbackLimiter, helpController.submitFeedback)

// ── 運営側: HelpFeedback 集計（Phase 9b-04） ──
router.get(
    '/v1/admin/help/feedback/summary',
    authMiddleware,
    requireSystemAdmin(),
    adminHelpFeedbackController.summary,
)
router.get(
    '/v1/admin/help/feedback/export',
    authMiddleware,
    requireSystemAdmin(),
    adminHelpFeedbackController.exportCsv,
)

export default router
