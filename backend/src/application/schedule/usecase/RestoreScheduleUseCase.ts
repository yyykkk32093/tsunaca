import { HttpError } from '@/application/_sharedApplication/error/HttpError.js'
import { IUnitOfWorkWithRepos } from '@/application/_sharedApplication/uow/IUnitOfWork.js'
import { ActivityNotFoundError } from '@/application/activity/error/ActivityNotFoundError.js'
import type { IActivityRepository } from '@/domains/activity/domain/repository/IActivityRepository.js'
import type { IScheduleRepository } from '@/domains/activity/schedule/domain/repository/IScheduleRepository.js'
import type { IPaymentRepository } from '@/domains/activity/schedule/participation/domain/repository/IPaymentRepository.js'
import type { ICommunityMembershipRepository } from '@/domains/community/membership/domain/repository/ICommunityMembershipRepository.js'
import { ScheduleNotFoundError } from '../error/ScheduleNotFoundError.js'
import { SchedulePermissionError } from '../error/SchedulePermissionError.js'

export type RestoreScheduleTxRepositories = {
    schedule: IScheduleRepository
    activity: IActivityRepository
    membership: ICommunityMembershipRepository
    payment: IPaymentRepository
}

/**
 * Wave6 W6-08: 中止したスケジュールを復元する UseCase。
 *
 * 仕様:
 * - 対象: status=CANCELLED かつ 開催日 >= 当日（Schedule.restore() で強制）
 * - 操作主体: コミュニティの OWNER/ADMIN のみ
 * - 未済(UNPAID)/返金完了(REFUNDED)/返金不要(NO_REFUND) のみの場合は復元可
 *   要対応の Payment(REPORTED/CONFIRMED/REFUND_PENDING など) が残っている場合は復元不可（返金経路と競合させない）
 * - サイレント実行（参加者通知なし）
 * - Participation/WaitlistEntry は中止時に削除されないため自動復帰する
 */
export class RestoreScheduleUseCase {
    constructor(
        private readonly unitOfWork: IUnitOfWorkWithRepos<RestoreScheduleTxRepositories>,
    ) { }

    async execute(input: { scheduleId: string; userId: string }): Promise<void> {
        await this.unitOfWork.run(async (repos) => {
            const schedule = await repos.schedule.findById(input.scheduleId)
            if (!schedule) throw new ScheduleNotFoundError()

            const activity = await repos.activity.findById(schedule.getActivityId().getValue())
            if (!activity) throw new ActivityNotFoundError()

            const membership = await repos.membership.findByCommunityAndUser(
                activity.getCommunityId().getValue(), input.userId,
            )
            if (!membership || !membership.isActive() || !membership.getRole().canManageMembers()) {
                throw new SchedulePermissionError('スケジュールの復元はOWNERまたはADMINのみ実行できます')
            }

            // 要対応の Payment(REPORTED/CONFIRMED/REFUND_PENDING 等) が残っている場合のみブロック。
            // UNPAID/REFUNDED/NO_REFUND は会計上クローズ済みのため復元を許可する。
            const payments = await repos.payment.findsByScheduleId(input.scheduleId)
            const blockingStatuses = new Set(['REPORTED', 'CONFIRMED', 'REFUND_PENDING', 'REJECTED'])
            const hasBlockingPayment = payments.some((p) => blockingStatuses.has(p.getPaymentStatus().getValue()))
            if (hasBlockingPayment) {
                throw new HttpError({
                    statusCode: 409,
                    code: 'SCHEDULE_RESTORE_BLOCKED_BY_PAYMENT',
                    message: '決済処理中のレコードが存在するスケジュールは復元できません',
                })
            }

            // ドメインモデルの restore() が状態遷移と業務ルール（中止状態か / 開催日が未来か）を強制する
            schedule.restore()
            await repos.schedule.save(schedule)
        })
    }
}
