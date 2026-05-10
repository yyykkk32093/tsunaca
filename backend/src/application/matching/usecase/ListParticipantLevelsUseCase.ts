import type { PrismaClient } from '@prisma/client'
import { assertCanViewMatching, loadScheduleContext } from './_matchingSupport.js'

export type ParticipantLevelEntry = {
    participationId: string
    userId: string | null
    displayName: string
    level: number
    isVisitor: boolean
}

/**
 * スケジュール参加者の現在レベル一覧を返す。
 * 生成前/生成後でレベル表示が一致するように、生成ロジックと同じレベル解決ロジックを使う。
 */
export class ListParticipantLevelsUseCase {
    constructor(private readonly prisma: PrismaClient) { }

    async execute(input: { scheduleId: string; userId: string }): Promise<{ participants: ParticipantLevelEntry[] }> {
        const { schedule } = await loadScheduleContext(this.prisma, input.scheduleId, input.userId)
        const communityId = schedule.activity.communityId

        await assertCanViewMatching(this.prisma, input.scheduleId, input.userId, communityId)

        const participations = await this.prisma.participation.findMany({
            where: { scheduleId: input.scheduleId },
            select: {
                id: true,
                userId: true,
                isVisitor: true,
                visitorName: true,
                visitorLevel: true,
            },
        })

        const userIds = participations.map((p) => p.userId).filter((id): id is string => Boolean(id))
        const users = userIds.length
            ? await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, displayName: true } })
            : []
        const userNameMap = new Map(users.map((u) => [u.id, u.displayName ?? 'ユーザー']))

        const memberships = userIds.length
            ? await this.prisma.communityMembership.findMany({
                where: { communityId, userId: { in: userIds }, leftAt: null },
                select: { userId: true, level: true },
            })
            : []
        const levelByUserId = new Map(memberships.map((m) => [m.userId, m.level]))

        const levelValues = memberships
            .map((m) => m.level)
            .filter((v): v is number => typeof v === 'number')
        const fallbackLevel = levelValues.length > 0
            ? Math.round(levelValues.reduce((s, v) => s + v, 0) / levelValues.length)
            : 4

        const participants: ParticipantLevelEntry[] = participations.map((p) => {
            const level = p.isVisitor
                ? (p.visitorLevel ?? fallbackLevel)
                : (p.userId ? (levelByUserId.get(p.userId) ?? fallbackLevel) : fallbackLevel)

            return {
                participationId: p.id,
                userId: p.userId,
                displayName: p.isVisitor
                    ? (p.visitorName ?? 'ビジター')
                    : (p.userId ? (userNameMap.get(p.userId) ?? 'ユーザー') : 'ユーザー'),
                level,
                isVisitor: p.isVisitor,
            }
        })

        participants.sort((a, b) => a.displayName.localeCompare(b.displayName))

        return { participants }
    }
}
