/**
 * サブスクリプション解約 UseCase
 *
 * ユーザーの Stripe サブスクリプションをキャンセルする。
 * - FREE / LIFETIME ユーザーはキャンセル不可
 * - Stripe でキャンセル → RevenueCat が Stripe webhook で自動同期
 * - plan 更新は RevenueCat → 当サーバー webhook で処理される
 */

import { logger } from '@/_sharedTech/logger/logger.js'
import type { IUserRepository } from '@/domains/user/domain/repository/IUserRepository.js'
import type { IBillingService } from '@/integration/billing/IBillingService.js'

export interface CancelSubscriptionInput {
    userId: string
}

export class CancelSubscriptionUseCase {
    constructor(
        private readonly billingService: IBillingService,
        private readonly userRepo: IUserRepository,
    ) { }

    async execute(input: CancelSubscriptionInput): Promise<void> {
        const user = await this.userRepo.findById(input.userId)
        if (!user) {
            throw new Error('ユーザーが見つかりません')
        }

        const currentPlan = user.getPlan().getValue()

        if (currentPlan === 'FREE') {
            throw new Error('FREE プランのユーザーは解約できません')
        }

        if (currentPlan === 'LIFETIME') {
            throw new Error('LIFETIME プランは解約できません')
        }

        await this.billingService.cancelSubscription(input.userId)
        logger.info(`CancelSubscription: Cancelled subscription for user ${input.userId} (was ${currentPlan})`)
    }
}
