import { HttpError } from '@/application/_sharedApplication/error/HttpError.js';
import type { PrismaClient } from '@prisma/client';
import { canManage, loadScheduleContext } from './_matchingSupport.js';

export class DeleteMatchingResultUseCase {
    constructor(private readonly prisma: PrismaClient) { }

    async execute(input: { scheduleId: string; userId: string }): Promise<void> {
        const { membership } = await loadScheduleContext(this.prisma, input.scheduleId, input.userId)
        if (!canManage(membership)) {
            throw new HttpError({
                statusCode: 403,
                code: 'MATCHING_PERMISSION_DENIED',
                message: '組み合わせ削除はOWNER/ADMINのみ実行できます',
            })
        }

        await this.prisma.matchingResult.deleteMany({ where: { scheduleId: input.scheduleId } })
    }
}
