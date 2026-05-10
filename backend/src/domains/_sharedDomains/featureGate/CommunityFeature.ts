/**
 * コミュニティグレード別 機能ON/OFF 制限 — CommunityFeature enum
 * DB テーブル: CommunityFeatureRestriction.feature に対応
 */
export const CommunityFeature = {
    /** 副管理者（ADMIN）設定 */
    ADMIN_ROLE: 'ADMIN_ROLE',
    /** コミュニティカスタマイズ（ロゴ・カバー画像） */
    COMMUNITY_CUSTOMIZATION: 'COMMUNITY_CUSTOMIZATION',
    /** 参加費の決済受付 */
    PAID_SCHEDULE: 'PAID_SCHEDULE',
    /** 定例Schedule自動生成 */
    AUTO_SCHEDULE: 'AUTO_SCHEDULE',
    /** 支払い催促・支払い状態可視化 */
    PAYMENT_VISIBILITY: 'PAYMENT_VISIBILITY',
    /** 参加状況CSV出力 */
    CSV_EXPORT: 'CSV_EXPORT',
    /** 会計情報出力 */
    ACCOUNTING_EXPORT: 'ACCOUNTING_EXPORT',
    /** ビジター/登録参加者の色分け */
    VISITOR_HIGHLIGHT: 'VISITOR_HIGHLIGHT',
    /** 一括リマインド */
    BULK_REMIND: 'BULK_REMIND',
    /** 参加率レポート */
    ANALYTICS_REPORT: 'ANALYTICS_REPORT',
    /** AI連携 */
    AI_INTEGRATION: 'AI_INTEGRATION',
    /** マッチング（組み合わせ）生成・確認 */
    MATCHING: 'MATCHING',
} as const

export type CommunityFeatureType =
    (typeof CommunityFeature)[keyof typeof CommunityFeature]

/**
 * コミュニティグレード別 数量上限 — CommunityLimitKey enum
 * DB テーブル: CommunityLimitRestriction.limitKey に対応
 */
export const CommunityLimitKey = {
    /** メンバー上限 */
    MAX_MEMBERS: 'maxMembers',
    /** タグ上限 */
    MAX_TAGS: 'maxTags',
} as const

export type CommunityLimitKeyType =
    (typeof CommunityLimitKey)[keyof typeof CommunityLimitKey]
