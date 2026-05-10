/**
 * Stripe Connect / Payment のポートインターフェース
 *
 * アプリケーション層から呼ばれ、Stripe SDK への依存を隔離する。
 */

export interface CreateConnectAccountResult {
    stripeAccountId: string
}

export interface CreateConnectAccountInput {
    mcc?: string | null
    websiteUrl?: string | null
    productDescription?: string | null
}

export interface CreateAccountLinkResult {
    url: string
}

export interface CreateLoginLinkResult {
    url: string
}

export interface ConnectAccountStatus {
    chargesEnabled: boolean
    payoutsEnabled: boolean
    detailsSubmitted: boolean
}

export interface CreatePaymentIntentResult {
    clientSecret: string
    paymentIntentId: string
}

export interface RetrievePaymentIntentResult {
    status: string
    clientSecret: string | null
    metadata: Record<string, string>
}

export interface IStripeService {
    /**
     * Stripe Connect Express アカウントを作成
     */
    createConnectAccount(input?: CreateConnectAccountInput): Promise<CreateConnectAccountResult>

    /**
     * 既存 Connect アカウントへ事前入力情報を反映
     */
    updateConnectAccountPrefill(params: {
        stripeAccountId: string
        mcc?: string | null
        websiteUrl?: string | null
        productDescription?: string | null
    }): Promise<void>

    /**
     * オンボーディング用の Account Link を生成
     */
    createAccountLink(params: {
        stripeAccountId: string
        refreshUrl: string
        returnUrl: string
    }): Promise<CreateAccountLinkResult>

    /**
     * ダッシュボードログインリンクを生成
     */
    createLoginLink(stripeAccountId: string): Promise<CreateLoginLinkResult>

    /**
     * Connect アカウントのステータスを取得
     */
    getAccountStatus(stripeAccountId: string): Promise<ConnectAccountStatus>

    /**
     * Destination Charges で PaymentIntent を作成
     */
    createPaymentIntent(params: {
        amount: number
        currency: string
        destinationAccountId: string
        transferAmount: number
        metadata?: Record<string, string>
    }): Promise<CreatePaymentIntentResult>

    /**
     * PaymentIntent のステータスと metadata を取得
     */
    retrievePaymentIntent(paymentIntentId: string): Promise<RetrievePaymentIntentResult>

    /**
     * 返金（全額または部分）
     */
    refundPaymentIntent(paymentIntentId: string, amount?: number): Promise<void>

    /**
     * サブスクリプションをキャンセル（即時終了）
     */
    cancelSubscription(subscriptionId: string): Promise<void>

    /**
     * Webhook 署名検証
     */
    verifyWebhookSignature(payload: string | Buffer, signature: string): ReturnType<typeof import('stripe').default.prototype.webhooks.constructEvent>
}
