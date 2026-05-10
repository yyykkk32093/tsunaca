// test/e2e/helpers/dbCleanup.ts
import { prisma } from '@/_sharedTech/db/client.js'

/**
 * E2Eテスト用 DB 全クリーンアップ
 * FK 制約を考慮し、子テーブルから先に削除する
 */
export async function cleanAllTables() {
    // Notification
    await prisma.notification.deleteMany({})

    // MessageReaction (FK → Message, Stamp)
    await prisma.messageReaction.deleteMany({})

    // MessageAttachment (FK → Message)
    await prisma.messageAttachment.deleteMany({})

    // Message (FK → ChatChannel, 自己参照: parentMessageId)
    // スレッド返信（子）を先に削除
    await prisma.message.deleteMany({ where: { parentMessageId: { not: null } } })
    await prisma.message.deleteMany({})

    // DMParticipant (FK → ChatChannel)
    await prisma.dMParticipant.deleteMany({})

    // ChatChannel (FK → Community, Activity)
    await prisma.chatChannel.deleteMany({})

    // Stamp
    await prisma.stamp.deleteMany({})

    // AnnouncementRead (FK → Announcement)
    await prisma.announcementRead.deleteMany({})

    // Announcement (FK → Community)
    await prisma.announcement.deleteMany({})

    // Payment (FK → Schedule, Participation)
    await prisma.payment.deleteMany({})

    // Participation / WaitlistEntry + AuditLogs (FK → Schedule)
    await prisma.participationAuditLog.deleteMany({})
    await prisma.waitlistAuditLog.deleteMany({})
    await prisma.participation.deleteMany({})
    await prisma.waitlistEntry.deleteMany({})

    // Schedule (FK → Activity)
    await prisma.schedule.deleteMany({})

    // Activity (FK → Community)
    await prisma.activity.deleteMany({})

    // CommunityMembership (FK → Community)
    await prisma.communityMembership.deleteMany({})

    // Community (自己参照: 子→親の順)
    // depth の深い順に削除
    await prisma.community.deleteMany({ where: { depth: 2 } })
    await prisma.community.deleteMany({ where: { depth: 1 } })
    await prisma.community.deleteMany({ where: { depth: 0 } })

    // Outbox / Audit
    await prisma.authAuditLog.deleteMany({})
    await prisma.outboxEvent.deleteMany({})
    await prisma.outboxDeadLetter.deleteMany({})

    // Auth / User
    await prisma.passwordCredential.deleteMany({})
    await prisma.googleCredential.deleteMany({})
    await prisma.lineCredential.deleteMany({})
    await prisma.appleCredential.deleteMany({})
    await prisma.authSecurityState.deleteMany({})
    await prisma.user.deleteMany({})
}

/**
 * テスト用 RetryPolicy を upsert する
 */
export async function ensureRetryPolicy(params: {
    routingKey: string
    baseInterval: number
    maxInterval: number
    maxRetries: number
}) {
    await prisma.outboxRetryPolicy.upsert({
        where: { routingKey: params.routingKey },
        update: {
            baseInterval: params.baseInterval,
            maxInterval: params.maxInterval,
            maxRetries: params.maxRetries,
        },
        create: {
            routingKey: params.routingKey,
            baseInterval: params.baseInterval,
            maxInterval: params.maxInterval,
            maxRetries: params.maxRetries,
        },
    })
}
