import { Fee } from '@/domains/_sharedDomains/model/valueObject/Fee.js'
import { UserId } from '@/domains/_sharedDomains/model/valueObject/UserId.js'
import { CommunityId } from '@/domains/community/domain/model/valueObject/CommunityId.js'
import type { Prisma, Activity as PrismaActivity, PrismaClient } from '@prisma/client'
import { Activity } from '../../domain/model/entity/Activity.js'
import { ActivityDescription } from '../../domain/model/valueObject/ActivityDescription.js'
import { ActivityId } from '../../domain/model/valueObject/ActivityId.js'
import { ActivityTitle } from '../../domain/model/valueObject/ActivityTitle.js'
import { ActivityVisibility } from '../../domain/model/valueObject/ActivityVisibility.js'
import { TimeOfDay } from '../../domain/model/valueObject/TimeOfDay.js'
import type { IActivityRepository } from '../../domain/repository/IActivityRepository.js'

type PrismaClientLike = PrismaClient | Prisma.TransactionClient

export class ActivityRepositoryImpl implements IActivityRepository {
    constructor(private readonly prisma: PrismaClientLike) { }

    async findById(id: string): Promise<Activity | null> {
        const row = await this.prisma.activity.findFirst({
            where: { id, deletedAt: null },
        })
        return row ? this.toDomain(row) : null
    }

    async findByIdIncludingDeleted(id: string): Promise<Activity | null> {
        const row = await this.prisma.activity.findFirst({
            where: { id },
        })
        return row ? this.toDomain(row) : null
    }

    async findsByCommunityId(communityId: string): Promise<Activity[]> {
        const rows = await this.prisma.activity.findMany({
            where: { communityId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
        })
        return rows.map((r) => this.toDomain(r))
    }

    async findByRecurrenceRuleNotNull(): Promise<Activity[]> {
        const rows = await this.prisma.activity.findMany({
            where: { recurrenceRule: { not: null }, deletedAt: null },
        })
        return rows.map((r) => this.toDomain(r))
    }

    async save(activity: Activity): Promise<void> {
        await this.prisma.activity.upsert({
            where: { id: activity.getId().getValue() },
            create: {
                id: activity.getId().getValue(),
                communityId: activity.getCommunityId().getValue(),
                title: activity.getTitle().getValue(),
                description: activity.getDescription()?.getValue() ?? null,
                defaultPlaceId: activity.getDefaultPlaceId(),
                defaultLocationCustom: activity.getDefaultLocationCustom(),
                isOnline: activity.getIsOnline(),
                defaultStartTime: activity.getDefaultStartTime()?.getValue() ?? null,
                defaultEndTime: activity.getDefaultEndTime()?.getValue() ?? null,
                defaultParticipationFee: activity.getDefaultParticipationFee()?.amount ?? null,
                defaultVisitorFee: activity.getDefaultVisitorFee()?.amount ?? null,
                defaultCapacity: activity.getDefaultCapacity(),
                allowVisitorWaitlist: activity.getAllowVisitorWaitlist(),
                visibility: activity.getVisibility().getValue(),
                recurrenceRule: activity.getRecurrenceRule(),
                organizerUserId: activity.getOrganizerUserId()?.getValue() ?? null,
                createdBy: activity.getCreatedBy().getValue(),
                deletedAt: activity.getDeletedAt(),
            },
            update: {
                title: activity.getTitle().getValue(),
                description: activity.getDescription()?.getValue() ?? null,
                defaultPlaceId: activity.getDefaultPlaceId(),
                defaultLocationCustom: activity.getDefaultLocationCustom(),
                isOnline: activity.getIsOnline(),
                defaultStartTime: activity.getDefaultStartTime()?.getValue() ?? null,
                defaultEndTime: activity.getDefaultEndTime()?.getValue() ?? null,
                defaultParticipationFee: activity.getDefaultParticipationFee()?.amount ?? null,
                defaultVisitorFee: activity.getDefaultVisitorFee()?.amount ?? null,
                defaultCapacity: activity.getDefaultCapacity(),
                allowVisitorWaitlist: activity.getAllowVisitorWaitlist(),
                visibility: activity.getVisibility().getValue(),
                recurrenceRule: activity.getRecurrenceRule(),
                organizerUserId: activity.getOrganizerUserId()?.getValue() ?? null,
                deletedAt: activity.getDeletedAt(),
            },
        })
    }

    private toDomain(row: PrismaActivity): Activity {
        return Activity.reconstruct({
            id: ActivityId.reconstruct(row.id),
            communityId: CommunityId.reconstruct(row.communityId),
            title: ActivityTitle.reconstruct(row.title),
            description: row.description ? ActivityDescription.reconstruct(row.description) : null,
            defaultPlaceId: row.defaultPlaceId ?? null,
            defaultLocationCustom: row.defaultLocationCustom ?? null,
            isOnline: row.isOnline,
            defaultStartTime: row.defaultStartTime ? TimeOfDay.reconstruct(row.defaultStartTime) : null,
            defaultEndTime: row.defaultEndTime ? TimeOfDay.reconstruct(row.defaultEndTime) : null,
            defaultParticipationFee: row.defaultParticipationFee != null ? Fee.reconstruct(row.defaultParticipationFee) : null,
            defaultVisitorFee: row.defaultVisitorFee != null ? Fee.reconstruct(row.defaultVisitorFee) : null,
            defaultCapacity: row.defaultCapacity,
            allowVisitorWaitlist: row.allowVisitorWaitlist,
            visibility: ActivityVisibility.reconstruct(row.visibility),
            recurrenceRule: row.recurrenceRule,
            organizerUserId: row.organizerUserId ? UserId.create(row.organizerUserId) : null,
            createdBy: UserId.create(row.createdBy),
            deletedAt: row.deletedAt,
        })
    }
}
