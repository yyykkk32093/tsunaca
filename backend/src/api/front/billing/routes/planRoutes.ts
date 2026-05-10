import { authMiddleware } from '@/api/middleware/authMiddleware.js'
import { Router } from 'express'
import { planController } from '../controllers/planController.js'

const router = Router()

// GET /v1/plans — 現在販売中のプラン一覧（認証不要 — 購入画面で公開表示）
router.get('/v1/plans', planController.listAvailablePlans)

// POST /v1/billing/cancel — サブスクリプション解約（認証必須）
router.post('/v1/billing/cancel', authMiddleware, planController.cancelSubscription)

export default router
