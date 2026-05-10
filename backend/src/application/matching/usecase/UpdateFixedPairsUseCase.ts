import { HttpError } from '@/application/_sharedApplication/error/HttpError.js'
import type { Prisma, PrismaClient } from '@prisma/client'
import { canManage, loadScheduleContext } from './_matchingSupport.js'

function asObject(input: Prisma.JsonValue): Record<string, unknown> {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return {}
    return input as Record<string, unknown>
}

/**
 * matchingResult.params.fixedPairs のみを更新する。
 * 既に生成済みのラウンドは変更しない（次回の追加生成から反映される）。
 */
export class UpdateFixedPairsUseCase {
    constructor(private readonly prisma: PrismaClient) { }

    async execute(input: { scheduleId: string; userId: string; fixedPairs: Array<[string, string]> }): Promise<void> {
        const { membership } = await loadScheduleContext(this.prisma, input.scheduleId, input.userId)
        if (!canManage(membership)) {
            throw new HttpError({
                statusCode: 403,
                code: 'MATCHING_PERMISSION_DENIED',
                message: '固定ペアの変更はOWNER/ADMINのみ実行できます',
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

        // 重複参加者チェック
        const seen = new Set<string>()
        for (const [a, b] of input.fixedPairs) {
            if (a === b) {
                throw new HttpError({
                    statusCode: 400,
                    code: 'MATCHING_FIXED_PAIR_INVALID',
                    message: '固定ペアに同一参加者が指定されています',
                })
            }
            if (seen.has(a) || seen.has(b)) {
                throw new HttpError({
                    statusCode: 400,
                    code: 'MATCHING_FIXED_PAIR_DUPLICATED',
                    message: '固定ペアに重複参加者が含まれています',
                })
            }
            seen.add(a)
            seen.add(b)
        }

        const params = { ...asObject(current.params), fixedPairs: input.fixedPairs }
        await this.prisma.matchingResult.update({
            where: { scheduleId: input.scheduleId },
            data: { params: params as Prisma.InputJsonValue },
        })
    }
}
