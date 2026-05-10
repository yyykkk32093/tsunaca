/**
 * 課金サービスのポートインターフェース
 *
 * RevenueCat/AppStore/GooglePlay を抽象化する。
 * 現在は RevenueCat をプライマリとして使用する。
 */

export type PlanType = 'FREE' | 'LITE' | 'PRO' | 'LIFETIME'

export interface SubscriptionInfo {
    /** RevenueCat の app_user_id（= 当システムの userId） */
    appUserId: string
    /** 現在のプラン */
    plan: PlanType
    /** サブスク有効期限（PRO のみ。LIFETIME / FREE / LITE は null） */
    expiresAt: Date | null
    /** アクティブかどうか */
    isActive: boolean
}

export interface IBillingService {
    /**
     * RevenueCat の Webhook ペイロードからサブスク情報を抽出
     */
    parseWebhookEvent(payload: unknown): SubscriptionInfo | null

    /**
     * RevenueCat API でユーザーの最新サブスク情報を取得
     */
    getSubscriptionInfo(appUserId: string): Promise<SubscriptionInfo>

    /**
     * Webhook の認証トークンを検証
     */
    verifyWebhookAuth(authHeader: string): boolean

    /**
     * ユーザーのサブスクリプションを Stripe 経由でキャンセル
     */
    cancelSubscription(appUserId: string): Promise<void>
}
