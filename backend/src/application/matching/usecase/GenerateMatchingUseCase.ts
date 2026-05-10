import { HttpError } from '@/application/_sharedApplication/error/HttpError.js'
import type { Prisma, PrismaClient } from '@prisma/client'
import { buildGeneratedRounds, canManage, type GenerateMatchingInput, loadScheduleContext } from './_matchingSupport.js'

export type GenerateMatchingRequest = {
    scheduleId: string
    userId: string
    mode: 'RANDOM' | 'MIXED_LEVEL' | 'SAME_LEVEL'
    rounds?: number
    courtCount: number
    groupsPerCourt: number
    playersPerGroup: number
    categoryId?: string | null
    categoryName?: string | null
    formatName?: string | null
    fixedPairs?: Array<[string, string]>
}

export class GenerateMatchingUseCase {
    constructor(private readonly prisma: PrismaClient) { }

    async execute(input: GenerateMatchingRequest): Promise<{ matchingResultId: string }> {
        const { schedule, membership } = await loadScheduleContext(this.prisma, input.scheduleId, input.userId)
        if (!canManage(membership)) {
            throw new HttpError({
                statusCode: 403,
                code: 'MATCHING_PERMISSION_DENIED',
                message: '組み合わせの生成はOWNER/ADMINのみ実行できます',
            })
        }

        const rounds = input.rounds ?? 10
        if (rounds <= 0) {
            throw new HttpError({
                statusCode: 400,
                code: 'MATCHING_INVALID_ROUNDS',
                message: '回数は1以上で指定してください',
            })
        }

        const generateInput: GenerateMatchingInput = {
            mode: input.mode,
            rounds,
            courtCount: input.courtCount,
            groupsPerCourt: input.groupsPerCourt,
            playersPerGroup: input.playersPerGroup,
            fixedPairs: input.fixedPairs,
        }

        const generatedRounds = await buildGeneratedRounds(
            this.prisma,
            input.scheduleId,
            schedule.activity.communityId,
            generateInput,
            [],
        )

        const params: Prisma.InputJsonValue = {
            rounds,
            courtCount: input.courtCount,
            groupsPerCourt: input.groupsPerCourt,
            playersPerGroup: input.playersPerGroup,
            categoryId: input.categoryId ?? null,
            categoryName: input.categoryName ?? null,
            formatName: input.formatName ?? null,
            fixedPairs: input.fixedPairs ?? [],
        }

        const saved = await this.prisma.matchingResult.upsert({
            where: { scheduleId: input.scheduleId },
            create: {
                scheduleId: input.scheduleId,
                createdBy: input.userId,
                mode: input.mode,
                params,
                rounds: generatedRounds as unknown as Prisma.InputJsonValue,
            },
            update: {
                createdBy: input.userId,
                mode: input.mode,
                params,
                rounds: generatedRounds as unknown as Prisma.InputJsonValue,
            },
        })

        return { matchingResultId: saved.id }
    }
}
