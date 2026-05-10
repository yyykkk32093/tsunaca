import type { INotificationRepository } from '@/application/_sharedApplication/notification/INotificationRepository.js'
import type { NotificationService } from '@/application/_sharedApplication/notification/NotificationService.js'
import { IUnitOfWorkWithRepos } from '@/application/_sharedApplication/uow/IUnitOfWork.js'
import { ActivityNotFoundError } from '@/application/activity/error/ActivityNotFoundError.js'
import type { IIdGenerator } from '@/domains/_sharedDomains/domain/service/IIdGenerator.js'
import { UserId } from '@/domains/_sharedDomains/model/valueObject/UserId.js'
import type { IActivityRepository } from '@/domains/activity/domain/repository/IActivityRepository.js'
import type { IScheduleRepository } from '@/domains/activity/schedule/domain/repository/IScheduleRepository.js'
import type { IParticipationRepository } from '@/domains/activity/schedule/participation/domain/repository/IParticipationRepository.js'
import type { IWaitlistEntryRepository } from '@/domains/activity/schedule/waitlist/domain/repository/IWaitlistEntryRepository.js'
import { Announcement } from '@/domains/announcement/domain/model/entity/Announcement.js'
import { AnnouncementContent } from '@/domains/announcement/domain/model/valueObject/AnnouncementContent.js'
import { AnnouncementId } from '@/domains/announcement/domain/model/valueObject/AnnouncementId.js'
import { AnnouncementTitle } from '@/domains/announcement/domain/model/valueObject/AnnouncementTitle.js'
import type { IAnnouncementRepository } from '@/domains/announcement/domain/repository/IAnnouncementRepository.js'
import { CommunityId } from '@/domains/community/domain/model/valueObject/CommunityId.js'
import type { ICommunityMembershipRepository } from '@/domains/community/membership/domain/repository/ICommunityMembershipRepository.js'
import type { IOutboxRepository } from '@/integration/outbox/repository/IOutboxRepository.js'
import { ScheduleNotFoundError } from '../error/ScheduleNotFoundError.js'
import { SchedulePermissionError } from '../error/SchedulePermissionError.js'

export type CancelOrDeleteScheduleTxRepositories = {
    schedule: IScheduleRepository
    activity: IActivityRepository
    membership: ICommunityMembershipRepository
    participation: IParticipationRepository
    waitlist: IWaitlistEntryRepository
    notification: INotificationRepository
    outbox: IOutboxRepository
    announcement: IAnnouncementRepository
}

export type ScheduleOperation = 'cancel' | 'delete'
export type ScheduleScope = 'single' | 'all'
export type NotifyOption = 'announcement' | 'push_only' | 'none'

export class CancelOrDeleteScheduleUseCase {
    constructor(
        private readonly unitOfWork: IUnitOfWorkWithRepos<CancelOrDeleteScheduleTxRepositories>,
        private readonly notificationService: NotificationService,
        private readonly idGenerator: IIdGenerator,
    ) { }

    async execute(input: {
        scheduleId: string
        userId: string
        operation: ScheduleOperation
        scope: ScheduleScope
        notifyOption: NotifyOption
    }): Promise<{ activityDeleted: boolean }> {
        // Wave6 W6-10: 削除時は「お知らせ投稿」は作成しない（UI も選択肢を隠している）
        // push_only / none はそのまま尊重する
        if (input.operation === 'delete' && input.notifyOption === 'announcement') {
            input = { ...input, notifyOption: 'push_only' }
        }
        let activityDeleted = false
        await this.unitOfWork.run(async (repos) => {
            const schedule = await repos.schedule.findById(input.scheduleId)
            if (!schedule) throw new ScheduleNotFoundError()

            const activity = await repos.activity.findById(schedule.getActivityId().getValue())
            if (!activity) throw new ActivityNotFoundError()

            const communityId = activity.getCommunityId().getValue()
            const activityTitle = activity.getTitle().getValue()

            // 権限チェック: OWNER/ADMIN のみ
            const membership = await repos.membership.findByCommunityAndUser(communityId, input.userId)
            if (!membership || !membership.isActive() || !membership.getRole().canManageMembers()) {
                throw new SchedulePermissionError('スケジュールのキャンセル/削除はOWNERまたはADMINのみ実行できます')
            }

            // 対象スケジュールを収集
            const targets = input.scope === 'all'
                ? await repos.schedule.findsByActivityId(activity.getId().getValue())
                : [schedule]

            // 操作実行 + 参加者収集
            const recipientUserIds = new Set<string>()

            for (const target of targets) {
                if (input.operation === 'cancel') {
                    if (!target.isCancelled() && !target.isDeleted()) {
                        target.cancel()
                        await repos.schedule.save(target)
                    }
                } else {
                    if (!target.isDeleted()) {
                        target.softDelete()
                        await repos.schedule.save(target)
                    }
                }

                // 参加者を収集
                const participations = await repos.participation.findsByScheduleId(target.getId().getValue())
                for (const p of participations) {
                    const uid = p.getUserId()?.getValue()
                    if (uid && uid !== input.userId) {
                        recipientUserIds.add(uid)
                    }
                }

                // Wave6 W6-09: キャンセル待ちユーザーも通知対象に含める
                const waitlist = await repos.waitlist.findsByScheduleId(target.getId().getValue())
                for (const w of waitlist) {
                    const uid = w.getUserId()?.getValue()
                    if (uid && uid !== input.userId) {
                        recipientUserIds.add(uid)
                    }
                }
            }

            // Activity softDelete 判定
            if (input.operation === 'delete') {
                if (input.scope === 'all') {
                    activity.softDelete()
                    await repos.activity.save(activity)
                    activityDeleted = true
                } else {
                    // 単独削除: 残存スケジュールが0件ならActivityも削除
                    const remaining = await repos.schedule.findsByActivityId(activity.getId().getValue())
                    if (remaining.length === 0) {
                        activity.softDelete()
                        await repos.activity.save(activity)
                        activityDeleted = true
                    }
                }
            }

            // アクティビティ削除時: 関連お知らせも連動 soft-delete
            if (activityDeleted) {
                const relatedAnnouncements = await repos.announcement.findsByActivityId(activity.getId().getValue())
                for (const ann of relatedAnnouncements) {
                    ann.softDelete()
                    await repos.announcement.save(ann)
                }
            }

            // 通知なしの場合はここで終了
            if (input.notifyOption === 'none') return

            // Wave6 W6-09: 単発 / 全件 / Activity 全体中止 で文言を分岐
            const operationLabel = input.operation === 'cancel' ? '中止' : '削除'
            const isActivityWide = activityDeleted || (input.scope === 'all' && input.operation === 'cancel')
            // タイトル / 本文（アクティビティ作成時の文言と統一。
            // 開催日時はお知らせ詳細側で `scheduleInfo` を解決してリンク描画する）
            const titleText = input.operation === 'cancel' ? '予定中止' : '予定削除'
            const bodyText = isActivityWide
                ? (input.operation === 'delete'
                    ? `アクティビティ「${activityTitle}」が削除されました。関連スケジュールはすべて中止されます。`
                    : `アクティビティ「${activityTitle}」の全スケジュールが中止となりました。`)
                : `アクティビティ「${activityTitle}」が${operationLabel}となりました。`

            // Announcement 作成（キャンセル時のみ。削除時はお知らせ自体を消すため通知お知らせは作成しない）
            // ※ 0 参加者でも notifyOption === 'announcement' なら投稿する
            if (input.notifyOption === 'announcement' && input.operation !== 'delete') {
                const announcementId = AnnouncementId.create(this.idGenerator.generate())
                const announcement = Announcement.create({
                    id: announcementId,
                    communityId: CommunityId.create(communityId),
                    authorId: UserId.create(input.userId),
                    title: AnnouncementTitle.create(titleText),
                    content: AnnouncementContent.create(bodyText),
                    activityId: activity.getId(),
                })
                await repos.announcement.save(announcement)
            }

            // プッシュ通知（受信者がいなければスキップ）
            if (recipientUserIds.size === 0) return
            const notificationType = input.operation === 'cancel' ? 'SCHEDULE_CANCELLED' : 'ACTIVITY_CANCELLED'
            for (const uid of recipientUserIds) {
                await this.notificationService.prepareNotification(repos, {
                    userId: uid,
                    type: notificationType,
                    title: titleText,
                    body: bodyText,
                    referenceId: input.scheduleId,
                    referenceType: 'SCHEDULE',
                    metadata: {
                        communityId,
                        activityId: activity.getId().getValue(),
                        activityTitle,
                    },
                })
            }
        })

        // TX commit 後に WS 配信
        if (input.notifyOption !== 'none') {
            this.notificationService.flush()
        }

        return { activityDeleted }
    }
}
