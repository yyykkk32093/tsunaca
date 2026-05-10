import { HttpError } from '@/application/_sharedApplication/error/HttpError.js'
import type { PrismaClient } from '@prisma/client'

export type MatchingMode = 'RANDOM' | 'MIXED_LEVEL' | 'SAME_LEVEL'

type ParticipantForRound = {
    participationId: string
    userId: string | null
    displayName: string
    level: number
    isVisitor: boolean
}

type ParticipantWithCount = ParticipantForRound & {
    appearanceCount: number
    /** 直前のラウンドで休憩した（出場しなかった）か。連続休憩回避のため次回優先選出に使う */
    restedLastRound: boolean
}

type ExistingRoundParticipant = {
    participationId: string
}

type ExistingRoundGroup = {
    participants: ExistingRoundParticipant[]
}

type ExistingRoundCourt = {
    groups: ExistingRoundGroup[]
}

type ExistingRound = {
    courts: ExistingRoundCourt[]
}

export type GeneratedRound = {
    roundNo: number
    looped?: boolean
    courts: Array<{
        courtNo: number
        /** このコートの「同一の参加者の組み合わせ」が初出したラウンド番号。初出ラウンドでは undefined */
        duplicatedFromRoundNo?: number
        groups: Array<{
            groupNo: number
            participants: Array<{
                participationId: string
                userId: string | null
                displayName: string
                level: number
                isVisitor: boolean
            }>
        }>
    }>
}

export type GenerateMatchingInput = {
    mode: MatchingMode
    rounds: number
    courtCount: number
    groupsPerCourt: number
    playersPerGroup: number
    fixedPairs?: Array<[string, string]>
}

export async function loadScheduleContext(prisma: PrismaClient, scheduleId: string, userId: string) {
    const schedule = await prisma.schedule.findUnique({
        where: { id: scheduleId },
        include: {
            activity: {
                select: {
                    id: true,
                    communityId: true,
                },
            },
        },
    })

    if (!schedule || !schedule.activity) {
        throw new HttpError({
            statusCode: 404,
            code: 'SCHEDULE_NOT_FOUND',
            message: 'スケジュールが見つかりません',
        })
    }

    const membership = await prisma.communityMembership.findUnique({
        where: {
            communityId_userId: {
                communityId: schedule.activity.communityId,
                userId,
            },
        },
    })

    return { schedule, membership }
}

export function canManage(membership: { role: string; leftAt: Date | null } | null): boolean {
    if (!membership || membership.leftAt) return false
    return membership.role === 'OWNER' || membership.role === 'ADMIN'
}

export async function assertCanViewMatching(
    prisma: PrismaClient,
    scheduleId: string,
    userId: string,
    communityId: string,
): Promise<void> {
    const membership = await prisma.communityMembership.findUnique({
        where: {
            communityId_userId: {
                communityId,
                userId,
            },
        },
    })

    if (canManage(membership)) return

    const participation = await prisma.participation.findFirst({
        where: {
            scheduleId,
            userId,
        },
        select: { id: true },
    })

    if (participation) return

    throw new HttpError({
        statusCode: 403,
        code: 'MATCHING_PERMISSION_DENIED',
        message: 'この組み合わせ結果を閲覧する権限がありません',
    })
}

function shuffle<T>(items: T[]): T[] {
    const next = [...items]
    for (let i = next.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1))
        const tmp = next[i]
        next[i] = next[j]
        next[j] = tmp
    }
    return next
}

function signatureOfGroup(group: ParticipantForRound[]): string {
    return group.map((p) => p.participationId).sort().join(':')
}

// コート単位の対戦シグネチャ（コート上の全グループの参加者を統合してソート）
// 同一の「対戦の組み合わせ」を検知するため、グループ単位ではなくコート単位で判定する
function signatureOfCourt(groups: ParticipantForRound[][]): string {
    const ids: string[] = []
    for (const g of groups) {
        for (const p of g) ids.push(p.participationId)
    }
    return ids.sort().join(':')
}

function chunkGroups(items: ParticipantForRound[], groupSize: number): ParticipantForRound[][] {
    const groups: ParticipantForRound[][] = []
    for (let i = 0; i < items.length; i += groupSize) {
        groups.push(items.slice(i, i + groupSize))
    }
    return groups
}

function snakeDistribute(items: ParticipantForRound[], groupCount: number, groupSize: number): ParticipantForRound[][] {
    const groups = Array.from({ length: groupCount }, () => [] as ParticipantForRound[])
    let direction: 1 | -1 = 1
    let idx = 0

    for (const item of items) {
        while (groups[idx].length >= groupSize) {
            if (direction === 1) {
                idx += 1
                if (idx >= groupCount) {
                    direction = -1
                    idx = groupCount - 1
                }
            } else {
                idx -= 1
                if (idx < 0) {
                    direction = 1
                    idx = 0
                }
            }
        }

        groups[idx].push(item)

        if (direction === 1) {
            idx += 1
            if (idx >= groupCount) {
                direction = -1
                idx = groupCount - 1
            }
        } else {
            idx -= 1
            if (idx < 0) {
                direction = 1
                idx = 0
            }
        }
    }

    return groups
}

function toRoundsFromJson(input: unknown): ExistingRound[] {
    if (!Array.isArray(input)) return []
    const rounds: ExistingRound[] = []
    for (const maybeRound of input) {
        if (!maybeRound || typeof maybeRound !== 'object') continue
        const roundLike = maybeRound as { courts?: unknown }
        if (!Array.isArray(roundLike.courts)) continue
        const courts: ExistingRoundCourt[] = []

        for (const maybeCourt of roundLike.courts) {
            if (!maybeCourt || typeof maybeCourt !== 'object') continue
            const courtLike = maybeCourt as { groups?: unknown }
            if (!Array.isArray(courtLike.groups)) continue
            const groups: ExistingRoundGroup[] = []
            for (const maybeGroup of courtLike.groups) {
                if (!maybeGroup || typeof maybeGroup !== 'object') continue
                const groupLike = maybeGroup as { participants?: unknown }
                if (!Array.isArray(groupLike.participants)) continue
                const participants: ExistingRoundParticipant[] = []
                for (const maybeParticipant of groupLike.participants) {
                    if (!maybeParticipant || typeof maybeParticipant !== 'object') continue
                    const p = maybeParticipant as { participationId?: unknown }
                    if (typeof p.participationId !== 'string') continue
                    participants.push({ participationId: p.participationId })
                }
                groups.push({ participants })
            }
            courts.push({ groups })
        }

        rounds.push({ courts })
    }

    return rounds
}

function countAppearances(rounds: ExistingRound[]): Map<string, number> {
    const map = new Map<string, number>()
    for (const round of rounds) {
        for (const court of round.courts) {
            for (const group of court.groups) {
                for (const p of group.participants) {
                    map.set(p.participationId, (map.get(p.participationId) ?? 0) + 1)
                }
            }
        }
    }
    return map
}

function collectUsedCourtSignatures(rounds: ExistingRound[]): Map<string, number> {
    // コートのシグネチャ -> 初出の roundNo
    const map = new Map<string, number>()
    for (let i = 0; i < rounds.length; i += 1) {
        const round = rounds[i]
        const roundNo = i + 1
        for (const court of round.courts) {
            const ids: string[] = []
            for (const group of court.groups) {
                for (const p of group.participants) ids.push(p.participationId)
            }
            const sig = ids.sort().join(':')
            if (!map.has(sig)) map.set(sig, roundNo)
        }
    }
    return map
}

function buildGroupsByMode(
    mode: MatchingMode,
    participants: ParticipantForRound[],
    groupCount: number,
    groupSize: number,
): ParticipantForRound[][] {
    if (mode === 'RANDOM') {
        return chunkGroups(shuffle(participants), groupSize)
    }

    if (mode === 'SAME_LEVEL') {
        const sorted = [...participants].sort((a, b) => b.level - a.level)
        return chunkGroups(sorted, groupSize)
    }

    const sorted = [...participants].sort((a, b) => b.level - a.level)
    return snakeDistribute(sorted, groupCount, groupSize)
}

function assertEnoughParticipants(input: GenerateMatchingInput, participantCount: number): number {
    const groupCount = input.courtCount * input.groupsPerCourt
    const required = groupCount * input.playersPerGroup
    if (participantCount < required) {
        throw new HttpError({
            statusCode: 400,
            code: 'MATCHING_NOT_ENOUGH_PARTICIPANTS',
            message: `参加者が不足しています（必要: ${required}人, 実際: ${participantCount}人）`,
        })
    }
    return groupCount
}

function pickRoundParticipants(pool: ParticipantWithCount[], needed: number): ParticipantForRound[] {
    // ペナルティ付きスコア方式で休憩バランスと連続休憩回避を両立する。
    //   score = appearanceCount - (restedLastRound ? 1 : 0)
    //   昇順ソート → 上位 needed 人を選出
    //
    // 効果:
    //   - 出場回数(count)に大きな差があれば count 昇順が優先される（出場バランス）
    //   - count が同等なら「前回休憩した人」が先に選ばれる（連続休憩回避）
    //   - 「前回休憩」は「1回少なく出場した」と同等に扱うので、過度に休憩した人を救済しすぎない
    const sorted = [...pool].sort((a, b) => {
        const scoreA = a.appearanceCount - (a.restedLastRound ? 1 : 0)
        const scoreB = b.appearanceCount - (b.restedLastRound ? 1 : 0)
        if (scoreA !== scoreB) return scoreA - scoreB
        return Math.random() - 0.5
    })

    return sorted.slice(0, needed).map((p) => ({
        participationId: p.participationId,
        userId: p.userId,
        displayName: p.displayName,
        level: p.level,
        isVisitor: p.isVisitor,
    }))
}

function applyFixedPairs(
    participants: ParticipantForRound[],
    fixedPairs: Array<[string, string]>,
    playersPerGroup: number,
): { lockedGroups: ParticipantForRound[][]; remaining: ParticipantForRound[] } {
    if (fixedPairs.length === 0) {
        return { lockedGroups: [], remaining: participants }
    }

    if (playersPerGroup !== 2) {
        throw new HttpError({
            statusCode: 400,
            code: 'MATCHING_FIXED_PAIR_INVALID',
            message: '固定ペアは1組あたり2人の設定時のみ使用できます',
        })
    }

    const byId = new Map(participants.map((p) => [p.participationId, p]))
    const used = new Set<string>()
    const lockedGroups: ParticipantForRound[][] = []

    for (const [aId, bId] of fixedPairs) {
        if (used.has(aId) || used.has(bId)) {
            throw new HttpError({
                statusCode: 400,
                code: 'MATCHING_FIXED_PAIR_DUPLICATED',
                message: '固定ペアに重複参加者が含まれています',
            })
        }

        const a = byId.get(aId)
        const b = byId.get(bId)
        if (!a || !b) continue

        used.add(aId)
        used.add(bId)
        lockedGroups.push([a, b])
    }

    const remaining = participants.filter((p) => !used.has(p.participationId))
    return { lockedGroups, remaining }
}

function buildRound(
    input: GenerateMatchingInput,
    selected: ParticipantForRound[],
    usedCourtSignatures: Map<string, number>,
    roundNo: number,
): GeneratedRound {
    const totalGroups = input.courtCount * input.groupsPerCourt
    const fixedPairs = input.fixedPairs ?? []
    const { lockedGroups, remaining } = applyFixedPairs(selected, fixedPairs, input.playersPerGroup)

    const groupsNeeded = totalGroups - lockedGroups.length
    if (groupsNeeded < 0) {
        throw new HttpError({
            statusCode: 400,
            code: 'MATCHING_FIXED_PAIR_TOO_MANY',
            message: '固定ペア数が多すぎます',
        })
    }

    let generatedGroups: ParticipantForRound[][] = []
    let looped = false
    const maxAttempts = 50

    // candidate（フラットなグループ配列）から、コート単位のシグネチャ集合を作る
    const buildCourtSignatures = (groups: ParticipantForRound[][]): string[] => {
        const sigs: string[] = []
        for (let courtIdx = 0; courtIdx < input.courtCount; courtIdx += 1) {
            const start = courtIdx * input.groupsPerCourt
            const courtGroups = groups.slice(start, start + input.groupsPerCourt)
            sigs.push(signatureOfCourt(courtGroups))
        }
        return sigs
    }

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        // MIXED_LEVEL/SAME_LEVEL は決定的なため、
        // 同点（同レベル）参加者の順序を入れ替えて再試行のバリエーションを作る
        const shuffledRemaining = shuffle(remaining)
        const built = buildGroupsByMode(input.mode, shuffledRemaining, groupsNeeded, input.playersPerGroup)
        const candidate = [...lockedGroups, ...built]

        // 「コート上の対戦の組み合わせ」が過去ラウンドで既出なら重複扱い
        const courtSignatures = buildCourtSignatures(candidate)
        const hasDuplicate = courtSignatures.some((sig) => usedCourtSignatures.has(sig))
        if (!hasDuplicate) {
            generatedGroups = candidate
            break
        }
        // On last attempt, fall back to this candidate and mark as looped
        if (attempt === maxAttempts - 1) {
            generatedGroups = candidate
            looped = true
        }
    }

    if (generatedGroups.length !== totalGroups) {
        throw new HttpError({
            statusCode: 400,
            code: 'MATCHING_GENERATION_FAILED',
            message: '組み合わせを生成できませんでした。参加者数・面数の設定を確認してください。',
        })
    }

    // 本ラウンドの各コートについて、初出ラウンド番号を判定してから登録する
    const finalCourtSignatures = buildCourtSignatures(generatedGroups)
    const courtDuplicateRoundNos: Array<number | undefined> = finalCourtSignatures.map((sig) => usedCourtSignatures.get(sig))
    for (const sig of finalCourtSignatures) {
        if (!usedCourtSignatures.has(sig)) usedCourtSignatures.set(sig, roundNo)
    }

    const courts: GeneratedRound['courts'] = []
    let groupOffset = 0
    for (let courtNo = 1; courtNo <= input.courtCount; courtNo += 1) {
        const courtGroups = generatedGroups.slice(groupOffset, groupOffset + input.groupsPerCourt)
        groupOffset += input.groupsPerCourt

        courts.push({
            courtNo,
            duplicatedFromRoundNo: courtDuplicateRoundNos[courtNo - 1],
            groups: courtGroups.map((group, idx) => ({
                groupNo: groupOffset - input.groupsPerCourt + idx + 1,
                participants: group,
            })),
        })
    }

    return {
        roundNo,
        looped,
        courts,
    }
}

export async function buildGeneratedRounds(
    prisma: PrismaClient,
    scheduleId: string,
    communityId: string,
    input: GenerateMatchingInput,
    existingRoundsRaw: unknown,
): Promise<GeneratedRound[]> {
    const participations = await prisma.participation.findMany({
        where: { scheduleId },
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
        ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, displayName: true } })
        : []
    const userNameMap = new Map(users.map((u) => [u.id, u.displayName ?? 'ユーザー']))

    const memberships = userIds.length
        ? await prisma.communityMembership.findMany({
            where: {
                communityId,
                userId: { in: userIds },
                leftAt: null,
            },
            select: {
                userId: true,
                level: true,
            },
        })
        : []

    const levelByUserId = new Map(memberships.map((m) => [m.userId, m.level]))
    const levelValues = memberships
        .map((m) => m.level)
        .filter((v) => typeof v === 'number') as number[]
    const fallbackLevel = levelValues.length > 0
        ? Math.round(levelValues.reduce((sum, v) => sum + v, 0) / levelValues.length)
        : 4

    const pool = participations.map((p): ParticipantWithCount => {
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
            appearanceCount: 0,
            restedLastRound: false,
        }
    })

    const totalGroups = assertEnoughParticipants(input, pool.length)
    const playersNeeded = totalGroups * input.playersPerGroup

    const existingRounds = toRoundsFromJson(existingRoundsRaw)
    const usedCourtSignatures = collectUsedCourtSignatures(existingRounds)
    const existingAppearances = countAppearances(existingRounds)

    // 追加生成時: 最終既存ラウンドで休憩した人に restedLastRound=true を付与
    const lastExistingRound = existingRounds[existingRounds.length - 1]
    const playedInLastRound = new Set<string>()
    if (lastExistingRound) {
        for (const court of lastExistingRound.courts) {
            for (const group of court.groups) {
                for (const p of group.participants) playedInLastRound.add(p.participationId)
            }
        }
    }

    for (const item of pool) {
        item.appearanceCount = existingAppearances.get(item.participationId) ?? 0
        // 最終既存ラウンドが存在し、そのラウンドに出場していない人を rested 扱い
        item.restedLastRound = lastExistingRound != null && !playedInLastRound.has(item.participationId)
    }

    const createdRounds: GeneratedRound[] = []
    for (let i = 0; i < input.rounds; i += 1) {
        const selected = pickRoundParticipants(pool, playersNeeded)
        const selectedIds = new Set(selected.map((p) => p.participationId))
        const round = buildRound(input, selected, usedCourtSignatures, existingRounds.length + i + 1)
        createdRounds.push(round)

        for (const item of pool) {
            if (selectedIds.has(item.participationId)) {
                item.appearanceCount += 1
                item.restedLastRound = false
            } else {
                item.restedLastRound = true
            }
        }
    }

    return createdRounds
}
