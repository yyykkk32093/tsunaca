import { authMiddleware } from '@/api/middleware/authMiddleware.js'
import { requireSystemAdmin } from '@/api/middleware/requireSystemAdmin.js'
import { Router } from 'express'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import { adminInquiryController, inquiryController } from '../controllers/inquiryController.js'

const router = Router()

/**
 * Wave6 Phase 8-B / 8-C: 問い合わせ API ルート。
 *
 * 公開ルート (`/v1/inquiries/anonymous`) はレート制限を厳しめに（IP あたり 1 時間 5 回）。
 * 認証ルートは標準的な制限（ユーザーあたり 1 時間 30 回）。
 */

// IP ベースの厳しい制限（匿名ルート用）
const anonymousLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { code: 'RATE_LIMITED', message: 'リクエストが多すぎます。時間を置いて再度お試しください。' },
})

// 認証ユーザー単位の標準制限
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => (req as { user?: { userId: string } }).user?.userId ?? ipKeyGenerator(req.ip ?? ''),
    message: { code: 'RATE_LIMITED', message: 'リクエストが多すぎます。時間を置いて再度お試しください。' },
})

// ── カテゴリ一覧（ログイン状態に関わらず取得可能。匿名フォーム表示にも使う） ──
router.get('/v1/inquiries/categories', inquiryController.listCategories)

// ── 匿名問い合わせ作成（未認証） ──
router.post('/v1/inquiries/anonymous', anonymousLimiter, inquiryController.createAnonymous)

// ── 認証ユーザー向け ──
router.post('/v1/inquiries', authMiddleware, authLimiter, inquiryController.create)
router.get('/v1/inquiries', authMiddleware, inquiryController.listMine)
router.get('/v1/inquiries/:id', authMiddleware, inquiryController.findMineById)
router.post('/v1/inquiries/:id/messages', authMiddleware, authLimiter, inquiryController.addMyMessage)

// ── 運営側（Phase 8-C） ──
router.get('/v1/admin/inquiries', authMiddleware, requireSystemAdmin(), adminInquiryController.list)
router.get('/v1/admin/inquiries/:id', authMiddleware, requireSystemAdmin(), adminInquiryController.findById)
router.patch('/v1/admin/inquiries/:id/status', authMiddleware, requireSystemAdmin(), adminInquiryController.updateStatus)
router.post('/v1/admin/inquiries/:id/messages', authMiddleware, requireSystemAdmin(), adminInquiryController.addOperatorMessage)

// ── Wave6 Phase 9b-16: 担当者割当（SUPER_ADMIN 限定） ──
router.patch('/v1/admin/inquiries/:id/assignee', authMiddleware, requireSystemAdmin('SUPER_ADMIN'), adminInquiryController.updateAssignee)
router.get('/v1/admin/system-admins', authMiddleware, requireSystemAdmin('SUPER_ADMIN'), adminInquiryController.listSystemAdmins)

export default router
