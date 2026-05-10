import { Fee } from '@/domains/_sharedDomains/model/valueObject/Fee.js'
import { ActivityId } from '@/domains/activity/domain/model/valueObject/ActivityId.js'
import { ActivityVisibility } from '@/domains/activity/domain/model/valueObject/ActivityVisibility.js'
import { TimeOfDay } from '@/domains/activity/domain/model/valueObject/TimeOfDay.js'
import type { Prisma, PrismaClient, Schedule as PrismaSchedule } from '@prisma/client'
import { Schedule } from '../../domain/model/entity/Schedule.js'
import { ScheduleCapacity } from '../../domain/model/valueObject/ScheduleCapacity.js'
import { ScheduleId } from '../../domain/model/valueObject/ScheduleId.js'
import { ScheduleStatus } from '../../domain/model/valueObject/ScheduleStatus.js'
import type { IScheduleRepository } from '../../domain/repository/IScheduleRepository.js'

type PrismaClientLike = PrismaClient | Prisma.TransactionClient

export class ScheduleRepositoryImpl implements IScheduleRepository {
    constructor(private readonly prisma: PrismaClientLike) { }

    async findById(id: string): Promise<Schedule | null> {
        const row = await this.prisma.schedule.findFirst({ where: { id, deletedAt: null } })
        return row ? this.toDomain(row) : null
    }

    async findsByActivityId(activityId: string): Promise<Schedule[]> {
        const rows = await this.prisma.schedule.findMany({
            where: { activityId, deletedAt: null },
            orderBy: { date: 'asc' },
        })
        return rows.map((r) => this.toDomain(r))
    }

    async findUpcomingByActivityIds(activityIds: string[]): Promise<Map<string, Schedule[]>> {
        if (activityIds.length === 0) return new Map()

        // DateTime @db.Date フィールドには Date オブジェクトを渡す
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const rows = await this.prisma.schedule.findMany({
            where: {
                activityId: { in: activityIds },
                date: { gte: today },
                deletedAt: null,
            },
            orderBy: { date: 'asc' },
        })

        const map = new Map<string, Schedule[]>()
        for (const row of rows) {
            const domain = this.toDomain(row)
            const key = row.activityId
            if (!map.has(key)) map.set(key, [])
            map.get(key)!.push(domain)
        }
        return map
    }

    async findFutureByCommunityId(communityId: string): Promise<Schedule[]> {
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const rows = await this.prisma.schedule.findMany({
            where: {
                activity: { communityId, deletedAt: null },
                date: { gte: today },
                status: 'SCHEDULED',
                deletedAt: null,
            },
            orderBy: { date: 'asc' },
        })
        return rows.map((r) => this.toDomain(r))
    }

    async save(schedule: Schedule): Promise<void> {
        await this.prisma.schedule.upsert({
            where: { id: schedule.getId().getValue() },
            create: {
                id: schedule.getId().getValue(),
                activityId: schedule.getActivityId().getValue(),
                date: schedule.getDate(),
                startTime: schedule.getStartTime().getValue(),
                endTime: schedule.getEndTime().getValue(),
                location: schedule.getLocation(),
                note: schedule.getNote(),
                status: schedule.getStatus().getValue(),
                capacity: schedule.getCapacity().getValue(),
                participationFee: schedule.getParticipationFee().amount,
                visitorFee: schedule.getVisitorFee()?.amount ?? null,
                isOnline: schedule.getIsOnline(),
                meetingUrl: schedule.getMeetingUrl(),
                visibility: schedule.getVisibilityOverride()?.getValue() ?? null,
                deletedAt: schedule.getDeletedAt(),
            },
            update: {
                date: schedule.getDate(),
                startTime: schedule.getStartTime().getValue(),
                endTime: schedule.getEndTime().getValue(),
                location: schedule.getLocation(),
                note: schedule.getNote(),
                status: schedule.getStatus().getValue(),
                capacity: schedule.getCapacity().getValue(),
                participationFee: schedule.getParticipationFee().amount,
                visitorFee: schedule.getVisitorFee()?.amount ?? null,
                isOnline: schedule.getIsOnline(),
                meetingUrl: schedule.getMeetingUrl(),
                visibility: schedule.getVisibilityOverride()?.getValue() ?? null,
                deletedAt: schedule.getDeletedAt(),
            },
        })
    }

    async saveMany(schedules: Schedule[]): Promise<void> {
        if (schedules.length === 0) return
        await this.prisma.schedule.createMany({
            data: schedules.map((s) => ({
                id: s.getId().getValue(),
                activityId: s.getActivityId().getValue(),
                date: s.getDate(),
                startTime: s.getStartTime().getValue(),
                endTime: s.getEndTime().getValue(),
                location: s.getLocation(),
                note: s.getNote(),
                status: s.getStatus().getValue(),
                capacity: s.getCapacity().getValue(),
                participationFee: s.getParticipationFee().amount,
                visitorFee: s.getVisitorFee()?.amount ?? null,
                isOnline: s.getIsOnline(),
                meetingUrl: s.getMeetingUrl(),
                visibility: s.getVisibilityOverride()?.getValue() ?? null,
            })),
        })
    }

    async deleteMany(ids: string[]): Promise<void> {
        if (ids.length === 0) return
        await this.prisma.schedule.deleteMany({
            where: { id: { in: ids } },
        })
    }

    private toDomain(row: PrismaSchedule): Schedule {
        return Schedule.reconstruct({
            id: ScheduleId.reconstruct(row.id),
            activityId: ActivityId.reconstruct(row.activityId),
            date: row.date,
            startTime: TimeOfDay.reconstruct(row.startTime),
            endTime: TimeOfDay.reconstruct(row.endTime),
            location: row.location,
            note: row.note,
            status: ScheduleStatus.reconstruct(row.status),
            capacity: ScheduleCapacity.reconstruct(row.capacity),
            participationFee: Fee.reconstruct(row.participationFee ?? 0),
            visitorFee: row.visitorFee != null ? Fee.reconstruct(row.visitorFee) : null,
            isOnline: row.isOnline,
            meetingUrl: row.meetingUrl,
            visibility: row.visibility ? ActivityVisibility.reconstruct(row.visibility) : null,
            deletedAt: row.deletedAt,
        })
    }
}