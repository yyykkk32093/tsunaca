/**
 * Stripe SDK を使った IStripeService 実装（Connect / Payment）
 *
 * AppSecretsLoader.getStripe() から API キーを取得する。
 */

import { AppSecretsLoader } from '@/_sharedTech/config/AppSecretsLoader.js'
import Stripe from 'stripe'
import type {
    ConnectAccountStatus,
    CreateAccountLinkResult,
    CreateConnectAccountInput,
    CreateConnectAccountResult,
    CreateLoginLinkResult,
    CreatePaymentIntentResult,
    IStripeService,
} from './IStripeService.js'

export class StripeServiceImpl implements IStripeService {
    private static readonly DEFAULT_BUSINESS_WEBSITE_URL = 'https://tsunaca.com'
    private static readonly DEFAULT_BUSINESS_MCC = '8699'

    private _stripe: Stripe | null = null

    private get stripe(): Stripe {
        if (!this._stripe) {
            const config = AppSecretsLoader.getStripe()
            this._stripe = new Stripe(config.secretKey)
        }
        return this._stripe
    }

    async createConnectAccount(input?: CreateConnectAccountInput): Promise<CreateConnectAccountResult> {
        const mcc = input?.mcc?.trim() || StripeServiceImpl.DEFAULT_BUSINESS_MCC
        const websiteUrl = input?.websiteUrl?.trim() || StripeServiceImpl.DEFAULT_BUSINESS_WEBSITE_URL
        const productDescription = input?.productDescription?.trim() || '会費・参加費の集金'

        const account = await this.stripe.accounts.create({
            type: 'express',
            country: 'JP',
            // 本サービスの想定は固定（管理者個人による会費・参加費集金）
            business_type: 'individual',
            // ビジネス詳細の必須項目を固定値で事前入力する（業種・Webサイト・商品説明）
            business_profile: {
                mcc,
                url: websiteUrl,
                product_description: productDescription,
            },
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
        })

        return { stripeAccountId: account.id }
    }

    async updateConnectAccountPrefill(params: {
        stripeAccountId: string
        mcc?: string | null
        websiteUrl?: string | null
        productDescription?: string | null
    }): Promise<void> {
        const mcc = params.mcc?.trim() || StripeServiceImpl.DEFAULT_BUSINESS_MCC
        const websiteUrl = params.websiteUrl?.trim() || StripeServiceImpl.DEFAULT_BUSINESS_WEBSITE_URL
        const productDescription = params.productDescription?.trim() || '会費・参加費の集金'

        await this.stripe.accounts.update(params.stripeAccountId, {
            business_profile: {
                mcc,
                url: websiteUrl,
                product_description: productDescription,
            },
        })
    }

    async createAccountLink(params: {
        stripeAccountId: string
        refreshUrl: string
        returnUrl: string
    }): Promise<CreateAccountLinkResult> {
        const link = await this.stripe.accountLinks.create({
            account: params.stripeAccountId,
            refresh_url: params.refreshUrl,
            return_url: params.returnUrl,
            type: 'account_onboarding',
        })

        return { url: link.url }
    }

    async createLoginLink(stripeAccountId: string): Promise<CreateLoginLinkResult> {
        const link = await this.stripe.accounts.createLoginLink(stripeAccountId)
        return { url: link.url }
    }

    async getAccountStatus(stripeAccountId: string): Promise<ConnectAccountStatus> {
        const account = await this.stripe.accounts.retrieve(stripeAccountId)
        return {
            chargesEnabled: account.charges_enabled ?? false,
            payoutsEnabled: account.payouts_enabled ?? false,
            detailsSubmitted: account.details_submitted ?? false,
        }
    }

    async createPaymentIntent(params: {
        amount: number
        currency: string
        destinationAccountId: string
        transferAmount: number
        metadata?: Record<string, string>
    }): Promise<CreatePaymentIntentResult> {
        const paymentIntent = await this.stripe.paymentIntents.create({
            amount: params.amount,
            currency: params.currency,
            transfer_data: {
                destination: params.destinationAccountId,
                amount: params.transferAmount,
            },
            metadata: params.metadata,
        })

        return {
            clientSecret: paymentIntent.client_secret!,
            paymentIntentId: paymentIntent.id,
        }
    }

    async retrievePaymentIntent(paymentIntentId: string): Promise<{ status: string; clientSecret: string | null; metadata: Record<string, string> }> {
        const pi = await this.stripe.paymentIntents.retrieve(paymentIntentId)
        return {
            status: pi.status,
            clientSecret: pi.client_secret ?? null,
            metadata: (pi.metadata ?? {}) as Record<string, string>,
        }
    }

    async refundPaymentIntent(paymentIntentId: string, amount?: number): Promise<void> {
        await this.stripe.refunds.create({
            payment_intent: paymentIntentId,
            ...(amount !== undefined ? { amount } : {}),
        })
    }

    async cancelSubscription(subscriptionId: string): Promise<void> {
        await this.stripe.subscriptions.cancel(subscriptionId)
    }

    verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
        const config = AppSecretsLoader.getStripe()
        return this.stripe.webhooks.constructEvent(
            payload,
            signature,
            config.webhookSecret,
        )
    }
}
