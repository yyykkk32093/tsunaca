import type { PrismaClient } from '@prisma/client'

export interface PlanMasterDTO {
    id: string
    displayName: string
    description: string | null
    monthlyPrice: number | null
    oneTimePrice: number | null
    sortOrder: number
}

export class ListAvailablePlansUseCase {
    constructor(private readonly prisma: PrismaClient) { }

    async execute(): Promise<{ plans: PlanMasterDTO[] }> {
        const now = new Date()

        const plans = await this.prisma.planMaster.findMany({
            where: {
                OR: [
                    // availableFrom/availableTo が両方 null → 常に販売中
                    { availableFrom: null, availableTo: null },
                    // availableFrom のみ設定 → from 以降ならOK
                    { availableFrom: { lte: now }, availableTo: null },
                    // availableTo のみ設定 → to 以前ならOK
                    { availableFrom: null, availableTo: { gte: now } },
                    // 両方設定 → 範囲内
                    { availableFrom: { lte: now }, availableTo: { gte: now } },
                ],
            },
            orderBy: { sortOrder: 'asc' },
        })

        return {
            plans: plans.map((p) => ({
                id: p.id,
                displayName: p.displayName,
                description: p.description,
                monthlyPrice: p.monthlyPrice,
                oneTimePrice: p.oneTimePrice,
                sortOrder: p.sortOrder,
            })),
        }
    }
}
