/**
 * 監査ログ表示用 共通辞書（W6-03）
 *
 * - 物理フィールド名 → 論理ラベル（日本語）
 * - 物理値 → 論理ラベル（日本語）
 * - summary 文字列の整形ヘルパー
 *
 * 監査UIを持つ全画面（コミュニティ設定変更履歴 / 将来の参加履歴等）から本モジュールを共通利用すること。
 * 新規スキーマ項目を追加した際は本辞書も追従更新する。
 */

/** 監査ログの物理フィールド名 → 日本語ラベル */
export const AUDIT_FIELD_LABELS: Record<string, string> = {
    name: 'コミュニティ名',
    description: '説明',
    visibility: '公開設定',
    logoUrl: 'ロゴ画像',
    coverUrl: 'カバー画像',
    grade: 'グレード',
    enabledPaymentMethods: '支払い方法設定',
    payPayId: 'PayPay ID',
    reminderEnabled: 'リマインダー設定',
    role: 'ロール',
    level: 'コミュニティ内レベル',
    joinMethod: '参加方式',
    isPublic: '公開設定',
    activityFrequency: '活動頻度',
    // Wave6 W6-03 拡張
    targetGender: '対象性別',
    ageMin: '年齢下限',
    ageMax: '年齢上限',
    recommendedLevelMin: '推奨レベル下限',
    recommendedLevelMax: '推奨レベル上限',
    maxMembers: '最大メンバー数',
    tags: 'タグ',
    categories: 'カテゴリ',
    locations: '活動拠点',
    activityDays: '活動曜日',
    cancellationAlertEnabled: 'キャンセルアラート',
    participationLevels: '参加レベル',
}

/** before / after の物理値 → 表示用ラベル */
export const AUDIT_VALUE_LABELS: Record<string, string> = {
    // enabledPaymentMethods
    CASH: '現金',
    PAYPAY: 'PayPay',
    CREDIT_CARD: 'カード',
    // visibility / isPublic
    PUBLIC: '公開',
    PRIVATE: '非公開',
    true: 'はい',
    false: 'いいえ',
    // joinMethod
    OPEN: '自由参加',
    FREE_JOIN: '自由参加',
    APPROVAL: '承認制',
    INVITATION: '招待のみ',
    INVITE_ONLY: '招待のみ',
    // role
    OWNER: 'オーナー',
    ADMIN: '管理者',
    MEMBER: 'メンバー',
    // reminderEnabled
    ENABLED: '有効',
    DISABLED: '無効',
    // 曜日
    MON: '月',
    TUE: '火',
    WED: '水',
    THU: '木',
    FRI: '金',
    SAT: '土',
    SUN: '日',
}

/** カンマ区切りの値も含め、物理値を論理名に変換 */
export function humanizeAuditValue(raw: string | null | undefined): string {
    if (raw == null || raw === '') return 'なし'
    if (raw.includes(',')) {
        return raw.split(',').map(v => AUDIT_VALUE_LABELS[v.trim()] ?? v.trim()).join(', ')
    }
    return AUDIT_VALUE_LABELS[raw] ?? raw
}

/** 物理フィールド名を論理ラベルに変換。未登録なら「不明な項目({物理名})」を返し warn ログを出す。 */
export function humanizeAuditField(physical: string): string {
    const label = AUDIT_FIELD_LABELS[physical]
    if (label) return label
    if (typeof console !== 'undefined') {
        console.warn(`[audit-labels] unknown field name: ${physical}`)
    }
    return `不明な項目(${physical})`
}

export interface AuditLogLike {
    summary: string
    actorDisplayName: string | null
    actorUserId: string
    field: string | null
    before: string | null
    after: string | null
}

/** summary 内の物理フィールド名を論理名に置換し、before/after を付与した最終表示文字列を返す。 */
export function formatAuditSummary(log: AuditLogLike): string {
    let text = log.summary
    // 長いキーから先に置換（部分一致の誤置換を防止）
    const sorted = Object.entries(AUDIT_FIELD_LABELS)
        .sort(([a], [b]) => b.length - a.length)
    for (const [physical, logical] of sorted) {
        const regex = new RegExp(`\\b${physical}\\b`, 'g')
        text = text.replace(regex, logical)
    }
    // ユーザー関連アクション（ロール変更・退室・委譲）の (名前) → (ユーザ名：名前)
    const userActionPatterns = [
        /ロールを .+ に変更しました/,
        /退室させました/,
        /委譲しました/,
    ]
    if (userActionPatterns.some(p => p.test(text))) {
        text = text.replace(/\(([^)]+)\)/, '(ユーザ名：$1)')
    }
    // before / after がある場合、変更前後を付与（ロール変更等・画像系は除外）
    const skipBeforeAfterFields = new Set(['logoUrl', 'coverUrl'])
    const skipDiff = userActionPatterns.some(p => p.test(text))
        || (log.field != null && skipBeforeAfterFields.has(log.field))
    if (!skipDiff) {
        if (log.before != null && log.after != null) {
            text += `（${humanizeAuditValue(log.before)} → ${humanizeAuditValue(log.after)}）`
        } else if (log.before == null && log.after != null) {
            text += `（なし → ${humanizeAuditValue(log.after)}）`
        } else if (log.before != null && log.after == null) {
            text += `（${humanizeAuditValue(log.before)} → なし）`
        }
    }
    return text
}
