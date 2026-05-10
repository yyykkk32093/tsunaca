import { ActivityNotFoundError } from '@/application/activity/error/ActivityNotFoundError.js'
import type { IActivityRepository } from '@/domains/activity/domain/repository/IActivityRepository.js'
import type { IScheduleRepository } from '@/domains/activity/schedule/domain/repository/IScheduleRepository.js'
import type { IParticipationRepository } from '@/domains/activity/schedule/participation/domain/repository/IParticipationRepository.js'
import type { IPaymentRepository } from '@/domains/activity/schedule/participation/domain/repository/IPaymentRepository.js'
import type { ICommunityRepository } from '@/domains/community/domain/repository/ICommunityRepository.js'
import type { ICommunityMembershipRepository } from '@/domains/community/membership/domain/repository/ICommunityMembershipRepository.js'

export class ListSchedulesUseCase {
    constructor(
        private readonly scheduleRepository: IScheduleRepository,
        private readonly participationRepository: IParticipationRepository,
        private readonly activityRepository: IActivityRepository,
        private readonly communityRepository: ICommunityRepository,
        private readonly membershipRepository: ICommunityMembershipRepository,
        private readonly paymentRepository: IPaymentRepository,
    ) { }

    async execute(input: { activityId: string; viewerUserId?: string | null }): Promise<{
        schedules: Array<{
            id: string
            activityId: string
            date: string
            startTime: string
            endTime: string
            location: string | null
            note: string | null
            status: string
            capacity: number | null
            participationFee: number | null
            visitorFee: number | null
            isOnline: boolean
            meetingUrl: string | null
            participantCount: number
            hasPayments: boolean
        }>
    }> {
        // Wave6 W6-04: アクティビティの認可チェック
        const activity = await this.activityRepository.findById(input.activityId)
        if (!activity) throw new ActivityNotFoundError()
        const community = await this.communityRepository.findById(activity.getCommunityId().getValue())
        if (!community) throw new ActivityNotFoundError()
        const isMember = await this.isActiveMember(community.getId().getValue(), input.viewerUserId)
        if (!community.getIsPublic() && !isMember) throw new ActivityNotFoundError()
        if (!isMember && activity.getVisibility().isPrivate()) throw new ActivityNotFoundError()

        const allSchedules = await this.scheduleRepository.findsByActivityId(input.activityId)
        // PRIVATE override スケジュールは非会員から隠す
        const schedules = allSchedules.filter((s) => {
            const eff = s.getVisibilityOverride() ?? activity.getVisibility()
            return isMember || eff.isPublic()
        })

        // 参加人数を並列取得
        const counts = await Promise.all(
            schedules.map((s) => this.participationRepository.count(s.getId().getValue()))
        )

        // Wave6 W6-08: 復元ボタン非活性化判定。
        // UNPAID/REFUNDED/NO_REFUND のみなら復元可能なので hasPayments=false を返す。
        const blockingStatuses = new Set(['REPORTED', 'CONFIRMED', 'REFUND_PENDING', 'REJECTED'])
        const paymentLists = await Promise.all(
            schedules.map((s) => this.paymentRepository.findsByScheduleId(s.getId().getValue()))
        )
        const hasBlockingPaymentFlags = paymentLists.map((list) =>
            list.some((p) => blockingStatuses.has(p.getPaymentStatus().getValue()))
        )

        return {
            schedules: schedules.map((s, i) => ({
                id: s.getId().getValue(),
                activityId: s.getActivityId().getValue(),
                date: s.getDate().toISOString().split('T')[0],
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
                participantCount: counts[i],
                hasPayments: hasBlockingPaymentFlags[i],
            })),
        }
    }

    private async isActiveMember(communityId: string, viewerUserId: string | null | undefined): Promise<boolean> {
        if (!viewerUserId) return false
        const m = await this.membershipRepository.findByCommunityAndUser(communityId, viewerUserId)
        if (!m) return false
        return m.getLeftAt() === null
    }
}
