import { IUnitOfWorkWithRepos } from '@/application/_sharedApplication/uow/IUnitOfWork.js'
import { CommunityNotFoundError } from '@/application/community/error/CommunityNotFoundError.js'
import { IIdGenerator } from '@/domains/_sharedDomains/domain/service/IIdGenerator.js'
import { Fee } from '@/domains/_sharedDomains/model/valueObject/Fee.js'
import { UserId } from '@/domains/_sharedDomains/model/valueObject/UserId.js'
import { Activity } from '@/domains/activity/domain/model/entity/Activity.js'
import { ActivityDescription } from '@/domains/activity/domain/model/valueObject/ActivityDescription.js'
import { ActivityId } from '@/domains/activity/domain/model/valueObject/ActivityId.js'
import { ActivityTitle } from '@/domains/activity/domain/model/valueObject/ActivityTitle.js'
import { ActivityVisibility } from '@/domains/activity/domain/model/valueObject/ActivityVisibility.js'
import { TimeOfDay } from '@/domains/activity/domain/model/valueObject/TimeOfDay.js'
import type { IActivityRepository } from '@/domains/activity/domain/repository/IActivityRepository.js'
import { Schedule } from '@/domains/activity/schedule/domain/model/entity/Schedule.js'
import { ScheduleId } from '@/domains/activity/schedule/domain/model/valueObject/ScheduleId.js'
import type { IScheduleRepository } from '@/domains/activity/schedule/domain/repository/IScheduleRepository.js'
import { RecurringScheduleGenerator } from '@/domains/activity/schedule/domain/service/RecurringScheduleGenerator.js'
import { Announcement } from '@/domains/announcement/domain/model/entity/Announcement.js'
import { AnnouncementContent } from '@/domains/announcement/domain/model/valueObject/AnnouncementContent.js'
import { AnnouncementId } from '@/domains/announcement/domain/model/valueObject/AnnouncementId.js'
import { AnnouncementTitle } from '@/domains/announcement/domain/model/valueObject/AnnouncementTitle.js'
import type { IAnnouncementRepository } from '@/domains/announcement/domain/repository/IAnnouncementRepository.js'
import { CommunityId } from '@/domains/community/domain/model/valueObject/CommunityId.js'
import type { ICommunityRepository } from '@/domains/community/domain/repository/ICommunityRepository.js'
import type { ICommunityMembershipRepository } from '@/domains/community/membership/domain/repository/ICommunityMembershipRepository.js'
import { ActivityPermissionError } from '../error/ActivityPermissionError.js'

export type CreateActivityTxRepositories = {
    activity: IActivityRepository
    community: ICommunityRepository
    membership: ICommunityMembershipRepository
    schedule: IScheduleRepository
    announcement: IAnnouncementRepository
}

export class CreateActivityUseCase {
    constructor(
        private readonly idGenerator: IIdGenerator,
        private readonly unitOfWork: IUnitOfWorkWithRepos<CreateActivityTxRepositories>,
    ) { }

    async execute(input: {
        communityId: string
        title: string
        description?: string | null
        defaultPlaceId?: string | null
        defaultLocationCustom?: string | null
        defaultStartTime?: string | null
        defaultEndTime?: string | null
        recurrenceRule?: string | null
        organizerUserId?: string | null
        date?: string | null          // 初回 Schedule の開催日 (YYYY-MM-DD)。Activity の属性ではない
        participationFee?: number | null
        visitorFee?: number | null
        isOnline?: boolean
        meetingUrl?: string | null
        capacity?: number | null
        userId: string
        allowVisitorWaitlist?: boolean
        visibility?: 'PUBLIC' | 'PRIVATE'
        shouldPostAnnouncement?: boolean  // Phase3 #4: お知らせ同時投稿
        recurrenceGenerationMonths?: number  // 繰返しスケジュール生成期間（月数）デフォルト2、最大12
    }): Promise<{ activityId: string; scheduleId?: string }> {
        let activityId = ''
        let scheduleId: string | undefined

        await this.unitOfWork.run(async (repos) => {
            // コミュニティ存在チェック
            const community = await repos.community.findById(input.communityId)
            if (!community) throw new CommunityNotFoundError()

            // 権限チェック: OWNER / ADMIN のみ作成可
            const membership = await repos.membership.findByCommunityAndUser(
                input.communityId, input.userId
            )
            if (!membership || !membership.isActive() || !membership.getRole().canManageMembers()) {
                throw new ActivityPermissionError('アクティビティの作成はOWNERまたはADMINのみ実行できます')
            }

            const id = ActivityId.create(this.idGenerator.generate())
            const activity = Activity.create({
                id,
                communityId: CommunityId.create(input.communityId),
                title: ActivityTitle.create(input.title),
                description: ActivityDescription.createNullable(input.description),
                defaultPlaceId: input.defaultPlaceId ?? null,
                defaultLocationCustom: input.defaultLocationCustom ?? null,
                isOnline: input.isOnline ?? false,
                defaultStartTime: TimeOfDay.createNullable(input.defaultStartTime),
                defaultEndTime: TimeOfDay.createNullable(input.defaultEndTime),
                defaultParticipationFee: Fee.createNullable(input.participationFee),
                defaultVisitorFee: Fee.createNullable(input.visitorFee),
                defaultCapacity: input.capacity ?? null,
                allowVisitorWaitlist: input.allowVisitorWaitlist ?? false,
                visibility: input.visibility ? ActivityVisibility.create(input.visibility) : ActivityVisibility.private(),
                recurrenceRule: input.recurrenceRule ?? null,
                organizerUserId: input.organizerUserId ? UserId.create(input.organizerUserId) : null,
                createdBy: UserId.create(input.userId),
            })

            await repos.activity.save(activity)
            activityId = id.getValue()

            // 日付が指定されていれば初回スケジュールを同一トランザクション内で作成
            if (input.date) {
                const sid = ScheduleId.create(this.idGenerator.generate())
                const schedule = Schedule.create({
                    id: sid,
                    activityId: id,
                    date: new Date(input.date),
                    startTime: TimeOfDay.create(input.defaultStartTime ?? '09:00'),
                    endTime: TimeOfDay.create(input.defaultEndTime ?? '10:00'),
                    location: input.defaultLocationCustom ?? null,
                    participationFee: Fee.createNullable(input.participationFee),
                    visitorFee: Fee.createNullable(input.visitorFee),
                    isOnline: input.isOnline ?? false,
                    meetingUrl: input.meetingUrl ?? null,
                    capacity: input.capacity ?? null,
                })
                await repos.schedule.save(schedule)
                scheduleId = sid.getValue()
            }

            // Phase3 #4: お知らせ同時投稿
            if (input.shouldPostAnnouncement) {
                const announcementId = AnnouncementId.create(this.idGenerator.generate())
                const announcement = Announcement.create({
                    id: announcementId,
                    communityId: CommunityId.create(input.communityId),
                    authorId: UserId.create(input.userId),
                    title: AnnouncementTitle.create('新規予定'),
                    content: AnnouncementContent.create(
                        `アクティビティ「${input.title}」が作成されました。`,
                    ),
                    activityId: id,
                })
                await repos.announcement.save(announcement)
            }

            // recurrenceRule がある場合、ドメインサービスで指定期間分のスケジュールをバルク生成
            if (input.recurrenceRule) {
                const existingDates = new Set<string>()
                // 初回スケジュールの日付を既存として登録（重複防止）
                if (input.date) {
                    existingDates.add(input.date)
                }
                const newSchedules = RecurringScheduleGenerator.generateSchedules(
                    activity, existingDates, this.idGenerator, input.recurrenceGenerationMonths,
                )
                if (newSchedules.length > 0) {
                    await repos.schedule.saveMany(newSchedules)
                }
            }
        })

        return { activityId, scheduleId }
    }
}
