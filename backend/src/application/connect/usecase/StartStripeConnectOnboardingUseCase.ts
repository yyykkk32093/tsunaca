/**
 * Stripe Connect Express オンボーディング開始 UseCase
 *
 * 1. 既存の stripeAccountId があれば再利用、なければ新規作成
 * 2. Account Link（オンボーディングURL）を生成して返す
 * 3. Community.stripeAccountId を保存
 */

import { logger } from '@/_sharedTech/logger/logger.js'
import type { ICommunityRepository } from '@/domains/community/domain/repository/ICommunityRepository.js'
import type { IStripeService } from '@/integration/stripe/IStripeService.js'

interface Input {
    communityId: string
    /** オンボーディング中断時のリダイレクト先 */
    refreshUrl: string
    /** オンボーディング完了後のリダイレクト先 */
    returnUrl: string
}

interface Output {
    accountLinkUrl: string
    stripeAccountId: string
}

export class StartStripeConnectOnboardingUseCase {
    constructor(
        private readonly communityRepo: ICommunityRepository,
        private readonly stripeService: IStripeService,
    ) { }

    async execute(input: Input): Promise<Output> {
        const community = await this.communityRepo.findById(input.communityId)
        if (!community) {
            throw new Error(`Community not found: ${input.communityId}`)
        }

        let stripeAccountId = community.getStripeAccountId()
        const productDescription = 'コミュニティの会費・参加費の集金'
        const websiteUrl = 'https://tsunaca.com'
        const mcc = '8699'
        const isFirstSetup = !stripeAccountId

        // まだ Connect アカウントが無い場合は新規作成
        if (!stripeAccountId) {
            const result = await this.stripeService.createConnectAccount({
                mcc,
                websiteUrl,
                productDescription,
            })
            stripeAccountId = result.stripeAccountId

            community.update({ stripeAccountId })
            await this.communityRepo.save(community)
        }

        // 既存アカウントにも事前入力（説明文）を反映して、オンボーディングでの初期値を揃える。
        // Stripe 側の制約で更新不可の場合でも、オンボーディング継続は可能にする。
        try {
            await this.stripeService.updateConnectAccountPrefill({
                stripeAccountId,
                mcc,
                websiteUrl,
                productDescription,
            })
        } catch (err) {
            if (isFirstSetup) {
                throw err
            }
            logger.warn(`Stripe account prefill update skipped: ${String(err)}`)
        }

        // オンボーディング用 Account Link を生成
        const { url } = await this.stripeService.createAccountLink({
            stripeAccountId,
            refreshUrl: input.refreshUrl,
            returnUrl: input.returnUrl,
        })

        return { accountLinkUrl: url, stripeAccountId }
    }
}
