import type { IActivityRepository } from '@/domains/activity/domain/repository/IActivityRepository.js'
import type { IScheduleRepository } from '@/domains/activity/schedule/domain/repository/IScheduleRepository.js'

export class ListActivitiesUseCase {
    constructor(
        private readonly activityRepository: IActivityRepository,
        private readonly scheduleRepository: IScheduleRepository,
    ) { }

    async execute(input: { communityId: string }): Promise<{
        activities: Array<{
            id: string
            communityId: string
            title: string
            description: string | null
            defaultPlaceId: string | null
            defaultLocationCustom: string | null
            isOnline: boolean
            defaultStartTime: string | null
            defaultEndTime: string | null
            organizerUserId: string | null
            createdBy: string
            upcomingSchedules: Array<{
                id: string
                date: string
                startTime: string
                endTime: string
            }>
        }>
    }> {
        const activities = await this.activityRepository.findsByCommunityId(input.communityId)

        // バッチで upcoming スケジュールを取得
        const activityIds = activities.map((a) => a.getId().getValue())
        const upcomingMap = await this.scheduleRepository.findUpcomingByActivityIds(activityIds)

        return {
            activities: activities.map((a) => {
                const upcoming = upcomingMap.get(a.getId().getValue()) ?? []
                return {
                    id: a.getId().getValue(),
                    communityId: a.getCommunityId().getValue(),
                    title: a.getTitle().getValue(),
                    description: a.getDescription()?.getValue() ?? null,
                    defaultPlaceId: a.getDefaultPlaceId(),
                    defaultLocationCustom: a.getDefaultLocationCustom(),
                    isOnline: a.getIsOnline(),
                    defaultStartTime: a.getDefaultStartTime()?.getValue() ?? null,
                    defaultEndTime: a.getDefaultEndTime()?.getValue() ?? null,
                    organizerUserId: a.getOrganizerUserId()?.getValue() ?? null,
                    createdBy: a.getCreatedBy().getValue(),
                    upcomingSchedules: upcoming.map((s) => ({
                        id: s.getId().getValue(),
                        date: s.getDate().toISOString().slice(0, 10),
                        startTime: s.getStartTime().getValue(),
                        endTime: s.getEndTime().getValue(),
                    })),
                }
            }),
        }
    }
}
