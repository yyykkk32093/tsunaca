/**
 * RevenueCat 実装の IBillingService
 *
 * - Webhook イベントの解析
 * - RevenueCat REST API からサブスク状態取得
 * - Webhook 認証トークン検証
 *
 * @see https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields
 */

import { AppSecretsLoader } from '@/_sharedTech/config/AppSecretsLoader.js'
import { logger } from '@/_sharedTech/logger/logger.js'
import type { IStripeService } from '@/integration/stripe/IStripeService.js'
import type { IBillingService, SubscriptionInfo } from './IBillingService.js'

/**
 * RevenueCat Webhook イベントの型（必要最小限）
 */
interface RevenueCatWebhookPayload {
    event: {
        type: string // INITIAL_PURCHASE | RENEWAL | CANCELLATION | EXPIRATION | NON_RENEWING_PURCHASE 等
        app_user_id: string
        product_id: string
        expiration_at_ms?: number | null
    }
}

/**
 * RevenueCat Subscriber API レスポンスの型（必要最小限）
 */
interface RevenueCatSubscriberResponse {
    subscriber: {
        entitlements: Record<string, {
            expires_date: string | null
            product_identifier: string
        }>
        subscriptions: Record<string, {
            store: string
            expires_date: string | null
            unsubscribe_detected_at: string | null
        }>
        non_subscriptions: Record<string, Array<{
            id: string
            purchase_date: string
        }>>
    }
}

// RevenueCat の entitlement 識別子
const ENTITLEMENT_PRO = 'pro'
const ENTITLEMENT_LITE = 'lite'
// 商品 ID（RevenueCat の product_id と一致させる）
const LIFETIME_PRODUCT_ID = 'tsunaca_lifetime'
const LITE_PRODUCT_ID = 'tsunaca_lite'

export class RevenueCatBillingService implements IBillingService {
    constructor(private readonly stripeService: IStripeService) { }

    parseWebhookEvent(payload: unknown): SubscriptionInfo | null {
        try {
            const data = payload as RevenueCatWebhookPayload
            const event = data?.event
            if (!event || !event.app_user_id || !event.type) {
                return null
            }

            const appUserId = event.app_user_id
            const eventType = event.type

            // LIFETIME: NON_RENEWING_PURCHASE
            if (eventType === 'NON_RENEWING_PURCHASE' && event.product_id === LIFETIME_PRODUCT_ID) {
                return {
                    appUserId,
                    plan: 'LIFETIME',
                    expiresAt: null,
                    isActive: true,
                }
            }

            // サブスクリプション系イベント
            switch (eventType) {
                case 'INITIAL_PURCHASE':
                case 'RENEWAL':
                case 'PRODUCT_CHANGE':
                case 'UNCANCELLATION': {
                    const expiresAt = event.expiration_at_ms
                        ? new Date(event.expiration_at_ms)
                        : null
                    // product_id で LITE / PRO を判定
                    const plan = event.product_id === LITE_PRODUCT_ID ? 'LITE' as const : 'PRO' as const
                    return {
                        appUserId,
                        plan,
                        expiresAt,
                        isActive: true,
                    }
                }

                case 'CANCELLATION':
                case 'EXPIRATION': {
                    return {
                        appUserId,
                        plan: 'FREE',
                        expiresAt: null,
                        isActive: false,
                    }
                }

                default:
                    logger.info(`RevenueCat: Unhandled event type: ${eventType}`)
                    return null
            }
        } catch (err) {
            logger.error(`RevenueCat: Failed to parse webhook event: ${String(err)}`)
            return null
        }
    }

    async getSubscriptionInfo(appUserId: string): Promise<SubscriptionInfo> {
        const config = AppSecretsLoader.getRevenueCat()

        const res = await fetch(
            `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
            {
                headers: {
                    Authorization: `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json',
                },
            },
        )

        if (!res.ok) {
            throw new Error(`RevenueCat API error: ${res.status} ${res.statusText}`)
        }

        const data = (await res.json()) as RevenueCatSubscriberResponse

        // LIFETIME チェック（non_subscriptions にある場合）
        const nonSubs = data.subscriber.non_subscriptions
        if (nonSubs && nonSubs[LIFETIME_PRODUCT_ID]?.length > 0) {
            return {
                appUserId,
                plan: 'LIFETIME',
                expiresAt: null,
                isActive: true,
            }
        }

        // Entitlement チェック（PRO entitlement）
        const proEntitlement = data.subscriber.entitlements[ENTITLEMENT_PRO]
        if (proEntitlement) {
            const expiresAt = proEntitlement.expires_date
                ? new Date(proEntitlement.expires_date)
                : null

            // 有効期限切れか判定
            const isActive = expiresAt ? expiresAt > new Date() : true

            return {
                appUserId,
                plan: isActive ? 'PRO' : 'FREE',
                expiresAt,
                isActive,
            }
        }

        // Entitlement チェック（LITE entitlement）
        const liteEntitlement = data.subscriber.entitlements[ENTITLEMENT_LITE]
        if (liteEntitlement) {
            const expiresAt = liteEntitlement.expires_date
                ? new Date(liteEntitlement.expires_date)
                : null

            const isActive = expiresAt ? expiresAt > new Date() : true

            return {
                appUserId,
                plan: isActive ? 'LITE' : 'FREE',
                expiresAt,
                isActive,
            }
        }

        return {
            appUserId,
            plan: 'FREE',
            expiresAt: null,
            isActive: false,
        }
    }

    verifyWebhookAuth(authHeader: string): boolean {
        const config = AppSecretsLoader.getRevenueCat()
        // RevenueCat Webhook は Bearer トークン形式で送られる
        const token = authHeader.startsWith('Bearer ')
            ? authHeader.slice(7)
            : authHeader
        return token === config.webhookAuthToken
    }

    async cancelSubscription(appUserId: string): Promise<void> {
        const config = AppSecretsLoader.getRevenueCat()

        // RevenueCat API からサブスク情報を取得し、Stripe subscription ID を特定
        const res = await fetch(
            `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
            {
                headers: {
                    Authorization: `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json',
                },
            },
        )

        if (!res.ok) {
            throw new Error(`RevenueCat API error: ${res.status} ${res.statusText}`)
        }

        const data = (await res.json()) as RevenueCatSubscriberResponse
        const subscriptions = data.subscriber.subscriptions

        // Stripe 経由のアクティブなサブスクリプションを探す
        const stripeSubId = Object.keys(subscriptions).find((key) => {
            const sub = subscriptions[key]
            return sub.store === 'stripe' && !sub.unsubscribe_detected_at
        })

        if (!stripeSubId) {
            throw new Error('キャンセル対象の Stripe サブスクリプションが見つかりません')
        }

        // Stripe API でキャンセル（RevenueCat は Stripe webhook で自動同期）
        await this.stripeService.cancelSubscription(stripeSubId)
        logger.info(`Cancelled Stripe subscription ${stripeSubId} for user ${appUserId}`)
    }
}
