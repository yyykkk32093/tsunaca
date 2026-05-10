import { HttpError } from '@/application/_sharedApplication/error/HttpError.js';
import type { PrismaClient } from '@prisma/client';
import { assertCanViewMatching, loadScheduleContext } from './_matchingSupport.js';

export class GetMatchingResultUseCase {
    constructor(private readonly prisma: PrismaClient) { }

    async execute(input: { scheduleId: string; userId: string }) {
        const { schedule } = await loadScheduleContext(this.prisma, input.scheduleId, input.userId)
        await assertCanViewMatching(this.prisma, input.scheduleId, input.userId, schedule.activity.communityId)

        const result = await this.prisma.matchingResult.findUnique({
            where: { scheduleId: input.scheduleId },
        })

        if (!result) {
            throw new HttpError({
                statusCode: 404,
                code: 'MATCHING_RESULT_NOT_FOUND',
                message: 'このスケジュールの組み合わせは未生成です',
            })
        }

        return {
            id: result.id,
            scheduleId: result.scheduleId,
            mode: result.mode,
            params: result.params,
            rounds: result.rounds,
            createdBy: result.createdBy,
            createdAt: result.createdAt.toISOString(),
            updatedAt: result.updatedAt.toISOString(),
        }
    }
}
