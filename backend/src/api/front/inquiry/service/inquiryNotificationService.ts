import { prisma } from '@/_sharedTech/db/client.js'

/**
 * Wave6 Phase 8-B: 問い合わせ関連の副作用通知サービス。
 *
 * - notifyOperatorsOfNewInquiry: Slack Webhook で運営チャンネルへ通知
 * - notifyUserOfOperatorReply : 既存 Notification テーブルにアプリ内通知レコードを挿入
 *
 * 環境変数:
 *   - SLACK_INQUIRY_WEBHOOK_URL : 設定がなければ no-op（ローカル開発用）
 *
 * 設計メモ:
 *   どちらも fire-and-forget で呼び出すこと。失敗しても問い合わせ作成自体は成功させる。
 *   後続 Wave で OutboxEvent + DomainEvent に乗せて疎結合化する（バックログ I-10 を参照）。
 */

// ============================================================
// Slack 通知（運営側へ）
// ============================================================

interface NewInquiryNotificationInput {
    inquiryId: string
    title: string
    categoryLabel: Record<string, string>
    isAnonymous: boolean
}

export async function notifyOperatorsOfNewInquiry(
    input: NewInquiryNotificationInput,
): Promise<void> {
    const webhook = process.env.SLACK_INQUIRY_WEBHOOK_URL
    if (!webhook) {
        // ローカル開発・テスト時は no-op
        console.info('[inquiry] Slack 通知 (NO-OP / SLACK_INQUIRY_WEBHOOK_URL 未設定):', input)
        return
    }

    const label = input.categoryLabel.ja ?? input.categoryLabel.en ?? '(no label)'
    const text =
        `:envelope_with_arrow: 新規問い合わせ\n` +
        `*カテゴリ*: ${label}${input.isAnonymous ? ' (匿名ルート)' : ''}\n` +
        `*タイトル*: ${input.title}\n` +
        `*ID*: \`${input.inquiryId}\``

    const res = await fetch(webhook, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
    })
    if (!res.ok) {
        throw new Error(`Slack webhook returned ${res.status}`)
    }
}

// ============================================================
// アプリ内通知（運営返信時）
// ============================================================

interface OperatorReplyNotificationInput {
    userId: string
    inquiryId: string
    inquiryTitle: string
}

export async function notifyUserOfOperatorReply(
    input: OperatorReplyNotificationInput,
): Promise<void> {
    // Wave6 Phase 9b-15: Notification 挿入と OutboxEvent (notification.push) を同一 TX で書き込み、
    // PushNotificationIntegrationHandler が FCM 経由で配信する。
    // ローカル/CI で firebase-admin 未設定の場合は handler 側で no-op となる。
    const { randomUUID } = await import('crypto')
    const notificationId = randomUUID()
    const now = new Date()

    await prisma.$transaction(async (tx) => {
        await tx.notification.create({
            data: {
                id: notificationId,
                userId: input.userId,
                type: 'INQUIRY_REPLY',
                title: '運営から返信がありました',
                body: input.inquiryTitle,
                referenceId: input.inquiryId,
                referenceType: 'INQUIRY',
                metadata: { inquiryId: input.inquiryId },
            },
        })

        await tx.outboxEvent.create({
            data: {
                id: randomUUID(),
                idempotencyKey: `notification:${notificationId}`,
                aggregateId: input.userId,
                eventName: 'NotificationCreated',
                eventType: 'notification.inquiry_reply',
                routingKey: 'notification.push',
                payload: {
                    notificationId,
                    targetUserId: input.userId,
                    type: 'INQUIRY_REPLY',
                    title: '運営から返信がありました',
                    body: input.inquiryTitle,
                    referenceId: input.inquiryId,
                    referenceType: 'INQUIRY',
                    metadata: { inquiryId: input.inquiryId },
                },
                occurredAt: now,
            },
        })
    })
}
