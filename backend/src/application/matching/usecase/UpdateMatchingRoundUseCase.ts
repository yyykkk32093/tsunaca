import { HttpError } from '@/application/_sharedApplication/error/HttpError.js'
import type { Prisma, PrismaClient } from '@prisma/client'
import { canManage, loadScheduleContext } from './_matchingSupport.js'

type RoundUpdateInput = {
    courts: Array<{
        courtNo: number
        groups: Array<{
            groupNo: number
            participantIds: string[]
        }>
    }>
}

function asArray(input: Prisma.JsonValue): unknown[] {
    if (!Array.isArray(input)) return []
    return input as unknown[]
}

/**
 * 既存の特定ラウンドのコート/組構成を上書きする。
 * 参加者の入れ替えのみを想定。コート数・組数・1組人数は変更不可（バリデーションで担保）。
 */
export class UpdateMatchingRoundUseCase {
    constructor(private readonly prisma: PrismaClient) { }

    async execute(input: { scheduleId: string; userId: string; roundNo: number; round: RoundUpdateInput }): Promise<void> {
        const { schedule, membership } = await loadScheduleContext(this.prisma, input.scheduleId, input.userId)
        if (!canManage(membership)) {
            throw new HttpError({
                statusCode: 403,
                code: 'MATCHING_PERMISSION_DENIED',
                message: '組み合わせの編集はOWNER/ADMINのみ実行できます',
            })
        }

        const current = await this.prisma.matchingResult.findUnique({
            where: { scheduleId: input.scheduleId },
        })
        if (!current) {
            throw new HttpError({
                statusCode: 404,
                code: 'MATCHING_RESULT_NOT_FOUND',
                message: '組み合わせが存在しません',
            })
        }

        const rounds = asArray(current.rounds) as Array<{ roundNo: number; courts: Array<{ courtNo: number; groups: Array<{ groupNo: number; participants: Array<{ participationId: string; userId: string | null; displayName: string; level: number; isVisitor: boolean }> }> }> }>
        const targetIdx = rounds.findIndex((r) => r.roundNo === input.roundNo)
        if (targetIdx < 0) {
            throw new HttpError({
                statusCode: 404,
                code: 'MATCHING_ROUND_NOT_FOUND',
                message: '対象ラウンドが見つかりません',
            })
        }
        const target = rounds[targetIdx]

        // 構成チェック（コート数・組数・1組人数）
        if (input.round.courts.length !== target.courts.length) {
            throw new HttpError({
                statusCode: 400,
                code: 'MATCHING_ROUND_STRUCTURE_INVALID',
                message: 'コート数が一致しません',
            })
        }
        for (let ci = 0; ci < target.courts.length; ci += 1) {
            const tc = target.courts[ci]
            const nc = input.round.courts[ci]
            if (tc.groups.length !== nc.groups.length) {
                throw new HttpError({ statusCode: 400, code: 'MATCHING_ROUND_STRUCTURE_INVALID', message: '組数が一致しません' })
            }
            for (let gi = 0; gi < tc.groups.length; gi += 1) {
                if (tc.groups[gi].participants.length !== nc.groups[gi].participantIds.length) {
                    throw new HttpError({ statusCode: 400, code: 'MATCHING_ROUND_STRUCTURE_INVALID', message: '1組あたり人数が一致しません' })
                }
            }
        }

        // 参加者集合チェック: このラウンドに含まれる全 participationId は元と同じ集合であること（休憩の入れ替えも許容するなら scheduleId 配下なら何でも可）
        const newAllIds: string[] = []
        for (const c of input.round.courts) {
            for (const g of c.groups) {
                for (const pid of g.participantIds) newAllIds.push(pid)
            }
        }
        const dupCheck = new Set<string>()
        for (const pid of newAllIds) {
            if (dupCheck.has(pid)) {
                throw new HttpError({ statusCode: 400, code: 'MATCHING_ROUND_DUPLICATE_PARTICIPANT', message: '同一参加者が複数組に含まれています' })
            }
            dupCheck.add(pid)
        }

        // 参加者は schedule の participations に属することを確認
        const validParticipations = await this.prisma.participation.findMany({
            where: { scheduleId: input.scheduleId, id: { in: newAllIds } },
            select: { id: true, userId: true, isVisitor: true, visitorName: true, visitorLevel: true },
        })
        if (validParticipations.length !== newAllIds.length) {
            throw new HttpError({ statusCode: 400, code: 'MATCHING_ROUND_INVALID_PARTICIPANT', message: 'スケジュールに属さない参加者が含まれています' })
        }

        // 表示用メタ取得（既存 round 内の participants から流用、足りない分は DB から補完）
        const metaById = new Map<string, { userId: string | null; displayName: string; level: number; isVisitor: boolean }>()
        for (const c of target.courts) {
            for (const g of c.groups) {
                for (const p of g.participants) metaById.set(p.participationId, { userId: p.userId, displayName: p.displayName, level: p.level, isVisitor: p.isVisitor })
            }
        }
        // 既存メタにない participationId は他ラウンドから補完
        const missing = newAllIds.filter((id) => !metaById.has(id))
        if (missing.length > 0) {
            for (const r of rounds) {
                for (const c of r.courts) {
                    for (const g of c.groups) {
                        for (const p of g.participants) {
                            if (!metaById.has(p.participationId)) metaById.set(p.participationId, { userId: p.userId, displayName: p.displayName, level: p.level, isVisitor: p.isVisitor })
                        }
                    }
                }
            }
        }
        // それでも欠けている分は DB から
        const stillMissing = newAllIds.filter((id) => !metaById.has(id))
        if (stillMissing.length > 0) {
            const userIds = validParticipations.filter((p) => p.userId).map((p) => p.userId as string)
            const users = userIds.length > 0
                ? await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, displayName: true } })
                : []
            const userNameMap = new Map(users.map((u) => [u.id, u.displayName ?? 'ユーザー']))
            const memberships = userIds.length > 0
                ? await this.prisma.communityMembership.findMany({
                    where: { communityId: schedule.activity.communityId, userId: { in: userIds }, leftAt: null },
                    select: { userId: true, level: true },
                })
                : []
            const levelByUserId = new Map(memberships.map((m) => [m.userId, m.level]))
            for (const p of validParticipations) {
                if (metaById.has(p.id)) continue
                metaById.set(p.id, {
                    userId: p.userId,
                    displayName: p.isVisitor ? (p.visitorName ?? 'ビジター') : (p.userId ? (userNameMap.get(p.userId) ?? 'ユーザー') : 'ユーザー'),
                    level: p.isVisitor ? (p.visitorLevel ?? 4) : (p.userId ? (levelByUserId.get(p.userId) ?? 4) : 4),
                    isVisitor: p.isVisitor,
                })
            }
        }

        // 新ラウンド構築（duplicatedFromRoundNo は再計算しない＝undefined にする）
        const newRound = {
            roundNo: input.roundNo,
            courts: input.round.courts.map((c) => ({
                courtNo: c.courtNo,
                groups: c.groups.map((g) => ({
                    groupNo: g.groupNo,
                    participants: g.participantIds.map((pid) => {
                        const meta = metaById.get(pid)!
                        return { participationId: pid, userId: meta.userId, displayName: meta.displayName, level: meta.level, isVisitor: meta.isVisitor }
                    }),
                })),
            })),
        }

        rounds[targetIdx] = newRound as typeof rounds[number]
        await this.prisma.matchingResult.update({
            where: { scheduleId: input.scheduleId },
            data: { rounds: rounds as unknown as Prisma.InputJsonValue },
        })
    }
}
