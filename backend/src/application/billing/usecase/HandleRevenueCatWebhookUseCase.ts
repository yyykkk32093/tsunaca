/**
 * RevenueCat Webhook 処理 UseCase
 *
 * RevenueCat からのイベントに基づいてユーザーの plan を更新する。
 * - INITIAL_PURCHASE / RENEWAL → PRO or LITE（product_id で判定）
 * - CANCELLATION / EXPIRATION → FREE
 * - NON_RENEWING_PURCHASE (LIFETIME) → LIFETIME
 *
 * プラン変更後、オーナーのコミュニティグレードも連動して更新する。
 */

import { logger } from '@/_sharedTech/logger/logger.js'
import { CommunityGrade } from '@/domains/community/domain/model/valueObject/CommunityGrade.js'
import type { ICommunityRepository } from '@/domains/community/domain/repository/ICommunityRepository.js'
import { UserPlan } from '@/domains/user/domain/model/valueObject/UserPlan.js'
import type { IUserRepository } from '@/domains/user/domain/repository/IUserRepository.js'
import type { IBillingService } from '@/integration/billing/IBillingService.js'

export interface HandleRevenueCatWebhookInput {
    payload: unknown
}

/**
 * プランに対応するコミュニティグレードを返す
 * PRO / LIFETIME → PREMIUM、それ以外 → FREE
 */
function gradeFromPlan(plan: string): CommunityGrade {
    return plan === 'PRO' || plan === 'LIFETIME'
        ? CommunityGrade.premium()
        : CommunityGrade.free()
}

export class HandleRevenueCatWebhookUseCase {
    constructor(
        private readonly billingService: IBillingService,
        private readonly userRepo: IUserRepository,
        private readonly communityRepo: ICommunityRepository,
    ) { }

    async execute(input: HandleRevenueCatWebhookInput): Promise<void> {
        const info = this.billingService.parseWebhookEvent(input.payload)
        if (!info) {
            logger.info('RevenueCat webhook: Ignored event (no subscription info parsed)')
            return
        }

        const user = await this.userRepo.findById(info.appUserId)
        if (!user) {
            logger.warn(`RevenueCat webhook: User not found: ${info.appUserId}`)
            return
        }

        const currentPlan = user.getPlan().getValue()
        const newPlan = info.plan

        // LIFETIME ユーザーは降格させない（LIFETIME は最上位）
        if (currentPlan === 'LIFETIME' && newPlan !== 'LIFETIME') {
            logger.info(`RevenueCat webhook: Skipping downgrade for LIFETIME user ${info.appUserId}`)
            return
        }

        // プランが変わる場合のみ更新
        if (currentPlan !== newPlan) {
            user.changePlan(UserPlan.create(newPlan))
            await this.userRepo.save(user)
            logger.info(`RevenueCat webhook: Updated user ${info.appUserId} plan: ${currentPlan} → ${newPlan}`)

            // コミュニティグレード連動
            await this.syncCommunityGrades(info.appUserId, newPlan)
        }
    }

    /**
     * オーナーが所有する全コミュニティのグレードを新プランに合わせて更新
     */
    private async syncCommunityGrades(userId: string, newPlan: string): Promise<void> {
        const communities = await this.communityRepo.findsByCreatedBy(userId)
        const newGrade = gradeFromPlan(newPlan)

        for (const community of communities) {
            const currentGrade = community.getGrade().getValue()
            if (currentGrade !== newGrade.getValue()) {
                community.changeGrade(newGrade)
                await this.communityRepo.save(community)
                logger.info(
                    `RevenueCat webhook: Community ${community.getId().getValue()} grade: ${currentGrade} → ${newGrade.getValue()}`,
                )
            }
        }
    }
}
