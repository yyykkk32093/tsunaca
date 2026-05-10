import { HttpError } from '@/application/_sharedApplication/error/HttpError.js'
import type { Prisma, PrismaClient } from '@prisma/client'
import { buildGeneratedRounds, canManage, type GenerateMatchingInput, loadScheduleContext } from './_matchingSupport.js'

function asObject(input: Prisma.JsonValue): Record<string, unknown> {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return {}
    return input as Record<string, unknown>
}

function asArray(input: Prisma.JsonValue): unknown[] {
    if (!Array.isArray(input)) return []
    return input as unknown[]
}

export class AppendMatchingRoundsUseCase {
    constructor(private readonly prisma: PrismaClient) { }

    async execute(input: { scheduleId: string; userId: string; addRounds: number }): Promise<{ matchingResultId: string }> {
        if (input.addRounds <= 0) {
            throw new HttpError({
                statusCode: 400,
                code: 'MATCHING_INVALID_ADD_ROUNDS',
                message: '追加回数は1以上で指定してください',
            })
        }

        const { schedule, membership } = await loadScheduleContext(this.prisma, input.scheduleId, input.userId)
        if (!canManage(membership)) {
            throw new HttpError({
                statusCode: 403,
                code: 'MATCHING_PERMISSION_DENIED',
                message: '組み合わせ追加はOWNER/ADMINのみ実行できます',
            })
        }

        const current = await this.prisma.matchingResult.findUnique({
            where: { scheduleId: input.scheduleId },
        })

        if (!current) {
            throw new HttpError({
                statusCode: 404,
                code: 'MATCHING_RESULT_NOT_FOUND',
                message: '追加対象の組み合わせが存在しません',
            })
        }

        const params = asObject(current.params)
        const mode = current.mode as GenerateMatchingInput['mode']
        const courtCount = Number(params.courtCount ?? 0)
        const groupsPerCourt = Number(params.groupsPerCourt ?? 0)
        const playersPerGroup = Number(params.playersPerGroup ?? 0)
        const fixedPairsRaw = Array.isArray(params.fixedPairs) ? params.fixedPairs : []
        const fixedPairs = fixedPairsRaw
            .map((pair) => Array.isArray(pair) ? pair : null)
            .filter((pair): pair is unknown[] => Array.isArray(pair) && pair.length === 2)
            .map((pair) => [String(pair[0]), String(pair[1])] as [string, string])

        if (courtCount <= 0 || groupsPerCourt <= 0 || playersPerGroup <= 0) {
            throw new HttpError({
                statusCode: 400,
                code: 'MATCHING_PARAMS_INVALID',
                message: '保存済みパラメータが不正です',
            })
        }

        // 全体上限100回チェック
        const existingCount = Array.isArray(current.rounds) ? current.rounds.length : 0
        if (existingCount + input.addRounds > 100) {
            throw new HttpError({
                statusCode: 400,
                code: 'MATCHING_TOTAL_ROUNDS_EXCEEDED',
                message: `全体の生成回数は100回までです（現在: ${existingCount}回, 追加: ${input.addRounds}回）`,
            })
        }

        const generateInput: GenerateMatchingInput = {
            mode,
            rounds: input.addRounds,
            courtCount,
            groupsPerCourt,
            playersPerGroup,
            fixedPairs,
        }

        const newRounds = await buildGeneratedRounds(
            this.prisma,
            input.scheduleId,
            schedule.activity.communityId,
            generateInput,
            current.rounds,
        )

        const mergedRounds = [...asArray(current.rounds), ...newRounds]
        const next = await this.prisma.matchingResult.update({
            where: { scheduleId: input.scheduleId },
            data: {
                rounds: mergedRounds as unknown as Prisma.InputJsonValue,
                createdBy: input.userId,
            },
        })

        return { matchingResultId: next.id }
    }
}
