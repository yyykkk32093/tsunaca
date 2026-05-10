import type { PrismaClient } from '@prisma/client';

type PrismaLike = Pick<PrismaClient, 'channelReadState'>

export class MarkChannelReadUseCase {
    constructor(private readonly db: PrismaLike) { }

    async execute(input: { channelId: string; userId: string }): Promise<void> {
        await this.db.channelReadState.upsert({
            where: {
                channelId_userId: {
                    channelId: input.channelId,
                    userId: input.userId,
                },
            },
            create: {
                channelId: input.channelId,
                userId: input.userId,
                lastReadAt: new Date(),
            },
            update: {
                lastReadAt: new Date(),
            },
        })
    }
}
