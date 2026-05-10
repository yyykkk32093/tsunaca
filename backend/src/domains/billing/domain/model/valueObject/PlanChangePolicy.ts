/**
 * PlanChangePolicy — プラン変更時のビジネスルール判定
 *
 * ダウングレード影響の評価と許可/拒否判定を行う。
 */

import type { UserPlan } from '@/domains/user/domain/model/valueObject/UserPlan.js'

export interface PlanChangeImpact {
    allowed: boolean
    reason?: string
    affectedCommunities: number
    /** ダウングレードで PREMIUM → FREE になるコミュニティ数 */
    downgradeCount: number
}

export class PlanChangePolicy {
    /**
     * プラン変更のビジネスルール:
     * - FREE → LITE/PRO: 常に許可
     * - LITE → PRO: 常に許可（アップグレード）
     * - LITE → FREE: 許可（ダウングレード）
     * - PRO → LITE: 許可（PREMIUM コミュニティが FREE に）
     * - PRO → FREE: 許可（PREMIUM コミュニティが FREE に）
     * - LIFETIME: 降格不可
     */
    static evaluate(params: {
        currentPlan: UserPlan
        newPlan: UserPlan
        ownedPremiumCommunityCount: number
    }): PlanChangeImpact {
        const { currentPlan, newPlan, ownedPremiumCommunityCount } = params

        // LIFETIME ユーザーは降格不可
        if (currentPlan.isLifetime() && !newPlan.isLifetime()) {
            return {
                allowed: false,
                reason: 'LIFETIME プランからの変更はできません',
                affectedCommunities: 0,
                downgradeCount: 0,
            }
        }

        // アップグレード: FREE → 有料、LITE → PRO
        if (
            (currentPlan.isFree() && newPlan.isPaid()) ||
            (currentPlan.isLite() && newPlan.isPremiumPlan())
        ) {
            return {
                allowed: true,
                affectedCommunities: 0,
                downgradeCount: 0,
            }
        }

        // ダウングレード: PRO → FREE/LITE（PREMIUM コミュニティに影響）
        if (currentPlan.isPro() && !newPlan.isPremiumPlan()) {
            return {
                allowed: true,
                reason: ownedPremiumCommunityCount > 0
                    ? `${ownedPremiumCommunityCount} 件のコミュニティが FREE グレードに変更されます`
                    : undefined,
                affectedCommunities: ownedPremiumCommunityCount,
                downgradeCount: ownedPremiumCommunityCount,
            }
        }

        // ダウングレード: LITE → FREE
        if (currentPlan.isLite() && newPlan.isFree()) {
            return {
                allowed: true,
                affectedCommunities: 0,
                downgradeCount: 0,
            }
        }

        // 同一プラン
        return { allowed: true, affectedCommunities: 0, downgradeCount: 0 }
    }
}
