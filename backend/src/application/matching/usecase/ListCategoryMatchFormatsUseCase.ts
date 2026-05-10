import type { PrismaClient } from '@prisma/client'

export class ListCategoryMatchFormatsUseCase {
    constructor(private readonly prisma: PrismaClient) { }

    async execute(_input: { communityId: string }) {
        const all = await this.prisma.categoryMaster.findMany({
            where: {
                matchFormats: { some: {} },
            },
            select: {
                id: true,
                name: true,
                nameEn: true,
                matchFormats: {
                    select: {
                        id: true,
                        name: true,
                        playersPerGroup: true,
                        groupsPerCourt: true,
                        sortOrder: true,
                        isDefault: true,
                    },
                    orderBy: [
                        { sortOrder: 'asc' },
                        { name: 'asc' },
                    ],
                },
            },
            orderBy: { sortOrder: 'asc' },
        })

        const categories = all.map((c) => ({
            id: c.id,
            name: c.name,
            nameEn: c.nameEn,
            formats: c.matchFormats,
        }))

        return { categories }
    }
}
