import { IUnitOfWorkWithRepos } from '@/application/_sharedApplication/uow/IUnitOfWork.js'
import { IIdGenerator } from '@/domains/_sharedDomains/domain/service/IIdGenerator.js'
import { Fee } from '@/domains/_sharedDomains/model/valueObject/Fee.js'
import { UserId } from '@/domains/_sharedDomains/model/valueObject/UserId.js'
import { ActivityDescription } from '@/domains/activity/domain/model/valueObject/ActivityDescription.js'
import { ActivityTitle } from '@/domains/activity/domain/model/valueObject/ActivityTitle.js'
import { ActivityVisibility } from '@/domains/activity/domain/model/valueObject/ActivityVisibility.js'
import { TimeOfDay } from '@/domains/activity/domain/model/valueObject/TimeOfDay.js'
import type { IActivityRepository } from '@/domains/activity/domain/repository/IActivityRepository.js'
import type { IScheduleRepository } from '@/domains/activity/schedule/domain/repository/IScheduleRepository.js'
import { RecurringScheduleGenerator } from '@/domains/activity/schedule/domain/service/RecurringScheduleGenerator.js'
import type { IParticipationRepository } from '@/domains/activity/schedule/participation/domain/repository/IParticipationRepository.js'
import type { IWaitlistEntryRepository } from '@/domains/activity/schedule/waitlist/domain/repository/IWaitlistEntryRepository.js'
import type { ICommunityMembershipRepository } from '@/domains/community/membership/domain/repository/ICommunityMembershipRepository.js'
import { ActivityNotFoundError } from '../error/ActivityNotFoundError.js'
import { ActivityPermissionError } from '../error/ActivityPermissionError.js'

export type UpdateActivityTxRepositories = {
    activity: IActivityRepository
    membership: ICommunityMembershipRepository
    schedule: IScheduleRepository
    participation: IParticipationRepository
    waitlistEntry: IWaitlistEntryRepository
}

export class UpdateActivityUseCase {
    constructor(
        private readonly idGenerator: IIdGenerator,
        private readonly unitOfWork: IUnitOfWorkWithRepos<UpdateActivityTxRepositories>,
    ) { }

    async execute(input: {
        activityId: string
        userId: string
        title?: string
        description?: string | null
        defaultPlaceId?: string | null
        defaultLocationCustom?: string | null
        isOnline?: boolean
        defaultStartTime?: string | null
        defaultEndTime?: string | null
        defaultParticipationFee?: number | null
        defaultVisitorFee?: number | null
        defaultCapacity?: number | null
        allowVisitorWaitlist?: boolean
        visibility?: 'PUBLIC' | 'PRIVATE'
        recurrenceRule?: string | null
        organizerUserId?: string | null
        recurrenceGenerationMonths?: number  // 繰返しスケジュール生成期間（月数）デフォルト2、最大12
    }): Promise<void> {
        await this.unitOfWork.run(async (repos) => {
            const activity = await repos.activity.findById(input.activityId)
            if (!activity) throw new ActivityNotFoundError()

            // 権限チェック: OWNER / ADMIN のみ更新可
            const membership = await repos.membership.findByCommunityAndUser(
                activity.getCommunityId().getValue(), input.userId
            )
            if (!membership || !membership.isActive() || !membership.getRole().canManageMembers()) {
                throw new ActivityPermissionError('アクティビティの更新はOWNERまたはADMINのみ実行できます')
            }

            // recurrenceRule 変更検知のため update 前に旧値を保持
            const oldRecurrenceRule = activity.getRecurrenceRule()

            activity.update({
                title: input.title ? ActivityTitle.create(input.title) : undefined,
                description: input.description !== undefined
                    ? ActivityDescription.createNullable(input.description)
                    : undefined,
                defaultPlaceId: input.defaultPlaceId !== undefined ? input.defaultPlaceId : undefined,
                defaultLocationCustom: input.defaultLocationCustom !== undefined ? input.defaultLocationCustom : undefined,
                isOnline: input.isOnline !== undefined ? input.isOnline : undefined,
                defaultStartTime: input.defaultStartTime !== undefined
                    ? TimeOfDay.createNullable(input.defaultStartTime)
                    : undefined,
                defaultEndTime: input.defaultEndTime !== undefined
                    ? TimeOfDay.createNullable(input.defaultEndTime)
                    : undefined,
                defaultParticipationFee: input.defaultParticipationFee !== undefined
                    ? Fee.createNullable(input.defaultParticipationFee)
                    : undefined,
                defaultVisitorFee: input.defaultVisitorFee !== undefined
                    ? Fee.createNullable(input.defaultVisitorFee)
                    : undefined,
                defaultCapacity: input.defaultCapacity !== undefined
                    ? input.defaultCapacity
                    : undefined,
                allowVisitorWaitlist: input.allowVisitorWaitlist !== undefined
                    ? input.allowVisitorWaitlist
                    : undefined,
                visibility: input.visibility !== undefined
                    ? ActivityVisibility.create(input.visibility)
                    : undefined,
                recurrenceRule: input.recurrenceRule !== undefined ? input.recurrenceRule : undefined,
                organizerUserId: input.organizerUserId !== undefined
                    ? (input.organizerUserId ? UserId.create(input.organizerUserId) : null)
                    : undefined,
            })

            await repos.activity.save(activity)

            // recurrenceRule が変更された場合、スケジュールを差分管理
            const newRule = activity.getRecurrenceRule()
            if (input.recurrenceRule !== undefined && oldRecurrenceRule !== newRule) {
                const existingSchedules = await repos.schedule.findsByActivityId(input.activityId)

                // 1. 新ルールに合致しない未来のスケジュールを特定
                const schedulesToRemove = RecurringScheduleGenerator.findSchedulesToRemove(
                    newRule, existingSchedules, input.recurrenceGenerationMonths,
                )

                if (schedulesToRemove.length > 0) {
                    const removeIds = schedulesToRemove.map((s) => s.getId().getValue())

                    // 2. 参加者・待機者の有無を一括チェック
                    const participationCounts = await repos.participation.countByScheduleIds(removeIds)
                    const waitlistCounts = await repos.waitlistEntry.countByScheduleIds(removeIds)

                    const toDelete: string[] = []
                    const toCancel: typeof schedulesToRemove = []

                    for (const schedule of schedulesToRemove) {
                        const sid = schedule.getId().getValue()
                        const hasParticipants = (participationCounts.get(sid) ?? 0) > 0
                        const hasWaitlist = (waitlistCounts.get(sid) ?? 0) > 0
                        if (hasParticipants || hasWaitlist) {
                            toCancel.push(schedule)
                        } else {
                            toDelete.push(sid)
                        }
                    }

                    // 3. 参加者ゼロ → 物理削除、参加者あり → 論理キャンセル
                    if (toDelete.length > 0) {
                        await repos.schedule.deleteMany(toDelete)
                    }
                    for (const schedule of toCancel) {
                        schedule.cancel()
                        await repos.schedule.save(schedule)
                    }
                }

                // 4. 新ルールに基づく新規スケジュールをバルク生成
                if (newRule) {
                    const refreshedSchedules = await repos.schedule.findsByActivityId(input.activityId)
                    const existingDates = new Set(
                        refreshedSchedules.map((s) => s.getDate().toISOString().slice(0, 10)),
                    )
                    const newSchedules = RecurringScheduleGenerator.generateSchedules(
                        activity, existingDates, this.idGenerator, input.recurrenceGenerationMonths,
                    )
                    if (newSchedules.length > 0) {
                        await repos.schedule.saveMany(newSchedules)
                    }
                }
            }
        })
    }
}
