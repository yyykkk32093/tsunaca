import { HttpError } from '@/application/_sharedApplication/error/HttpError.js'
import type { PrismaClient } from '@prisma/client'
import { canManage } from './_matchingSupport.js'

function validateLevel(level: number | null): void {
    if (level === null) return
    if (!Number.isInteger(level) || level < 0 || level > 8) {
        throw new HttpError({
            statusCode: 400,
            code: 'MATCHING_LEVEL_INVALID',
            message: 'レベルは0〜8の整数で指定してください',
        })
    }
}

export class UpdateMemberLevelUseCase {
    constructor(private readonly prisma: PrismaClient) { }

    async execute(input: { communityId: string; targetUserId: string; actorUserId: string; level: number | null }): Promise<void> {
        validateLevel(input.level)

        const actor = await this.prisma.communityMembership.findUnique({
            where: {
                communityId_userId: {
                    communityId: input.communityId,
                    userId: input.actorUserId,
                },
            },
        })

        if (!canManage(actor)) {
            throw new HttpError({
                statusCode: 403,
                code: 'MATCHING_PERMISSION_DENIED',
                message: 'レベル更新はOWNER/ADMINのみ実行できます',
            })
        }

        await this.prisma.communityMembership.update({
            where: {
                communityId_userId: {
                    communityId: input.communityId,
                    userId: input.targetUserId,
                },
            },
            data: {
                level: input.level,
            },
        })
    }
}

export class UpdateVisitorLevelUseCase {
    constructor(private readonly prisma: PrismaClient) { }

    async execute(input: { participationId: string; actorUserId: string; level: number | null }): Promise<void> {
        validateLevel(input.level)

        const participation = await this.prisma.participation.findUnique({
            where: { id: input.participationId },
            select: {
                id: true,
                schedule: {
                    select: {
                        activity: {
                            select: {
                                communityId: true,
                            },
                        },
                    },
                },
            },
        })

        if (!participation?.schedule?.activity) {
            throw new HttpError({
                statusCode: 404,
                code: 'PARTICIPATION_NOT_FOUND',
                message: '参加情報が見つかりません',
            })
        }

        const actor = await this.prisma.communityMembership.findUnique({
            where: {
                communityId_userId: {
                    communityId: participation.schedule.activity.communityId,
                    userId: input.actorUserId,
                },
            },
        })

        if (!canManage(actor)) {
            throw new HttpError({
                statusCode: 403,
                code: 'MATCHING_PERMISSION_DENIED',
                message: 'ビジターレベル更新はOWNER/ADMINのみ実行できます',
            })
        }

        await this.prisma.participation.update({
            where: { id: input.participationId },
            data: {
                visitorLevel: input.level,
            },
        })
    }
}
