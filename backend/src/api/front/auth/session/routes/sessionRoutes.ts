import { prisma } from '@/_sharedTech/db/client.js'
import { featureGateService } from '@/_sharedTech/featureGate/featureGateServiceInstance.js'
import { authMiddleware } from '@/api/middleware/authMiddleware.js'
import { clearAuthCookie } from '@/api/middleware/cookieUtils.js'
import { Router } from 'express'

const router = Router()

/**
 * ログアウト API
 * POST /v1/auth/logout
 *
 * httpOnly Cookie をクリアしてログアウトする。
 */
router.post('/v1/auth/logout', (_req, res) => {
    clearAuthCookie(res)
    res.status(200).json({ message: 'logged out' })
})

/**
 * 認証確認 API
 * GET /v1/auth/me
 *
 * 現在のログイン状態を確認する。
 * httpOnly Cookie または Authorization Bearer ヘッダーからJWTを検証し、
 * ユーザー情報 + プラン + 機能制限 を返す。
 */
router.get('/v1/auth/me', authMiddleware, async (req, res) => {
    const userId = req.user!.userId

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            plan: true,
            displayName: true,
            email: true,
            avatarUrl: true,
            systemRole: true,
        },
    })

    if (!user) {
        res.status(404).json({ code: 'USER_NOT_FOUND', message: 'ユーザーが見つかりません' })
        return
    }

    const [features, limits] = await Promise.all([
        featureGateService.getUserFeatures(user.plan),
        featureGateService.getUserLimits(user.plan),
    ])

    res.status(200).json({
        userId: user.id,
        plan: user.plan,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        systemRole: user.systemRole,
        features,
        limits,
    })
})

export default router
