import { prisma } from '@/_sharedTech/db/client.js'
import { featureGateService } from '@/_sharedTech/featureGate/featureGateServiceInstance.js'
import type { CommunityFeatureType, CommunityLimitKeyType } from '@/domains/_sharedDomains/featureGate/CommunityFeature.js'
import type { UserFeatureType, UserLimitKeyType } from '@/domains/_sharedDomains/featureGate/UserFeature.js'
import type { NextFunction, Request, Response } from 'express'

/**
 * requireFeature — ユーザープラン × 機能ON/OFF ミドルウェア
 *
 * 使い方:
 *   router.post('/v1/dm/channels', authMiddleware, requireFeature('DM_CREATE'), handler)
 */
export function requireFeature(feature: UserFeatureType) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const userId = req.user?.userId
        if (!userId) {
            res.status(401).json({ code: 'UNAUTHORIZED', message: '認証が必要です' })
            return
        }

        const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } })
        if (!user) {
            res.status(404).json({ code: 'USER_NOT_FOUND', message: 'ユーザーが見つかりません' })
            return
        }

        const enabled = await featureGateService.canUse(user.plan, feature)
        if (!enabled) {
            res.status(403).json({
                code: 'FEATURE_RESTRICTED',
                message: 'この機能を利用するには有料プランへのアップグレードが必要です',
                feature,
            })
            return
        }

        next()
    }
}

/**
 * requireLimit — ユーザープラン × 数量上限チェック ミドルウェア
 *
 * currentCountFn: 現在の使用数を返すコールバック
 *
 * 使い方:
 *   router.post('/v1/stamps', authMiddleware,
 *     requireLimit('maxCustomStamps', async (req) => {
 *       return prisma.stamp.count({ where: { createdByUserId: req.user!.userId } })
 *     }),
 *     handler)
 */
export function requireLimit(
    limitKey: UserLimitKeyType,
    currentCountFn: (req: Request) => Promise<number>,
) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const userId = req.user?.userId
        if (!userId) {
            res.status(401).json({ code: 'UNAUTHORIZED', message: '認証が必要です' })
            return
        }

        const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } })
        if (!user) {
            res.status(404).json({ code: 'USER_NOT_FOUND', message: 'ユーザーが見つかりません' })
            return
        }

        const limit = await featureGateService.getLimit(user.plan, limitKey)
        if (limit === -1) {
            next() // 無制限
            return
        }

        const currentCount = await currentCountFn(req)
        if (currentCount >= limit) {
            res.status(403).json({
                code: 'LIMIT_EXCEEDED',
                message: `上限に達しています（上限: ${limit}）`,
                limitKey,
                limit,
                current: currentCount,
            })
            return
        }

        next()
    }
}

/**
 * requireCommunityFeature — コミュニティグレード × 機能ON/OFF ミドルウェア
 *
 * communityIdExtractor: req から communityId を取得する関数
 *
 * 使い方:
 *   router.post('/v1/schedules', authMiddleware,
 *     requireCommunityFeature('PAID_SCHEDULE', (req) => req.body.communityId),
 *     handler)
 */
export function requireCommunityFeature(
    feature: CommunityFeatureType,
    communityIdExtractor: (req: Request) => string | undefined,
) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const communityId = communityIdExtractor(req)
        if (!communityId) {
            res.status(400).json({ code: 'BAD_REQUEST', message: 'communityId が必要です' })
            return
        }

        const community = await prisma.community.findUnique({
            where: { id: communityId },
            select: { grade: true },
        })
        if (!community) {
            res.status(404).json({ code: 'COMMUNITY_NOT_FOUND', message: 'コミュニティが見つかりません' })
            return
        }

        const enabled = await featureGateService.canUseCommunity(community.grade, feature)
        if (!enabled) {
            res.status(403).json({
                code: 'COMMUNITY_FEATURE_RESTRICTED',
                message: 'この機能はPREMIUMグレードのコミュニティでのみ利用可能です',
                feature,
            })
            return
        }

        next()
    }
}

/**
 * requireCommunityLimit — コミュニティグレード × 数量上限チェック
 */
export function requireCommunityLimit(
    limitKey: CommunityLimitKeyType,
    communityIdExtractor: (req: Request) => string | undefined,
    currentCountFn: (req: Request, communityId: string) => Promise<number>,
) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const communityId = communityIdExtractor(req)
        if (!communityId) {
            res.status(400).json({ code: 'BAD_REQUEST', message: 'communityId が必要です' })
            return
        }

        const community = await prisma.community.findUnique({
            where: { id: communityId },
            select: { grade: true },
        })
        if (!community) {
            res.status(404).json({ code: 'COMMUNITY_NOT_FOUND', message: 'コミュニティが見つかりません' })
            return
        }

        const limit = await featureGateService.getCommunityLimit(community.grade, limitKey)
        if (limit === -1) {
            next() // 無制限
            return
        }

        const currentCount = await currentCountFn(req, communityId)
        if (currentCount >= limit) {
            res.status(403).json({
                code: 'COMMUNITY_LIMIT_EXCEEDED',
                message: `コミュニティの上限に達しています（上限: ${limit}）`,
                limitKey,
                limit,
                current: currentCount,
            })
            return
        }

        next()
    }
}

/**
 * requireScheduleCommunityFeature — Schedule 配下のルートで、所属コミュニティのグレードを判定する
 *
 * 使い方:
 *   router.post('/v1/schedules/:id/matching', authMiddleware,
 *     requireScheduleCommunityFeature('MATCHING', (req) => req.params.id),
 *     handler)
 */
export function requireScheduleCommunityFeature(
    feature: CommunityFeatureType,
    scheduleIdExtractor: (req: Request) => string | undefined,
) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const scheduleId = scheduleIdExtractor(req)
        if (!scheduleId) {
            res.status(400).json({ code: 'BAD_REQUEST', message: 'scheduleId が必要です' })
            return
        }

        const schedule = await prisma.schedule.findUnique({
            where: { id: scheduleId },
            select: { activity: { select: { community: { select: { grade: true } } } } },
        })
        if (!schedule) {
            res.status(404).json({ code: 'SCHEDULE_NOT_FOUND', message: 'スケジュールが見つかりません' })
            return
        }

        const grade = schedule.activity.community.grade
        const enabled = await featureGateService.canUseCommunity(grade, feature)
        if (!enabled) {
            res.status(403).json({
                code: 'COMMUNITY_FEATURE_RESTRICTED',
                message: 'この機能はPREMIUMグレードのコミュニティでのみ利用可能です',
                feature,
            })
            return
        }

        next()
    }
}

/**
 * requireParticipationCommunityFeature — Participation 配下のルートで、所属コミュニティのグレードを判定する
 */
export function requireParticipationCommunityFeature(
    feature: CommunityFeatureType,
    participationIdExtractor: (req: Request) => string | undefined,
) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const participationId = participationIdExtractor(req)
        if (!participationId) {
            res.status(400).json({ code: 'BAD_REQUEST', message: 'participationId が必要です' })
            return
        }

        const participation = await prisma.participation.findUnique({
            where: { id: participationId },
            select: {
                schedule: {
                    select: {
                        activity: { select: { community: { select: { grade: true } } } },
                    },
                },
            },
        })
        if (!participation) {
            res.status(404).json({ code: 'PARTICIPATION_NOT_FOUND', message: '参加情報が見つかりません' })
            return
        }

        const grade = participation.schedule.activity.community.grade
        const enabled = await featureGateService.canUseCommunity(grade, feature)
        if (!enabled) {
            res.status(403).json({
                code: 'COMMUNITY_FEATURE_RESTRICTED',
                message: 'この機能はPREMIUMグレードのコミュニティでのみ利用可能です',
                feature,
            })
            return
        }

        next()
    }
}
