import { UserPlan } from '@/domains/user/domain/model/valueObject/UserPlan.js'
import { CommunityGrade } from '../model/valueObject/CommunityGrade.js'

/**
 * CommunityGradePolicy
 *
 * OWNER の UserPlan と Community の CommunityGrade を連動させるドメインサービス。
 * - PRO / LIFETIME → PREMIUM
 * - FREE / LITE → FREE
 * - OWNER 移譲時: 新 OWNER の plan に基づいて grade を再評価
 */
export class CommunityGradePolicy {
    /**
     * UserPlan から CommunityGrade を決定する。
     * PRO / LIFETIME → PREMIUM、FREE / LITE → FREE
     */
    static gradeFromPlan(plan: UserPlan): CommunityGrade {
        return plan.isPremiumPlan()
            ? CommunityGrade.premium()
            : CommunityGrade.free()
    }
}
