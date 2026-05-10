import type { IActivityRepository } from '@/domains/activity/domain/repository/IActivityRepository.js'
import type { ICommunityRepository } from '@/domains/community/domain/repository/ICommunityRepository.js'
import type { ICommunityMembershipRepository } from '@/domains/community/membership/domain/repository/ICommunityMembershipRepository.js'
import type { IPlaceRepository } from '@/domains/place/domain/repository/IPlaceRepository.js'
import type { IUserRepository } from '@/domains/user/domain/repository/IUserRepository.js'
import { ActivityNotFoundError } from '../error/ActivityNotFoundError.js'

export class FindActivityUseCase {
    constructor(
        private readonly activityRepository: IActivityRepository,
        private readonly userRepository: IUserRepository,
        private readonly communityRepository: ICommunityRepository,
        private readonly membershipRepository: ICommunityMembershipRepository,
        private readonly placeRepository: IPlaceRepository,
    ) { }

    async execute(input: { activityId: string; viewerUserId?: string | null }): Promise<{
        id: string
        communityId: string
        communityName: string | null
        title: string
        description: string | null
        defaultPlaceId: string | null
        defaultLocationCustom: string | null
        isOnline: boolean
        defaultPlace: {
            id: string
            name: string
            address: string
            lat: number
            lng: number
        } | null
        defaultStartTime: string | null
        defaultEndTime: string | null
        defaultParticipationFee: number | null
        defaultVisitorFee: number | null
        defaultCapacity: number | null
        allowVisitorWaitlist: boolean
        visibility: 'PUBLIC' | 'PRIVATE'
        recurrenceRule: string | null
        organizerUserId: string | null
        organizerDisplayName: string | null
        createdBy: string
        createdByDisplayName: string | null
        deleted: boolean
        communityPaymentSettings: {
            enabledPaymentMethods: string[]
            paypayId: string | null
            stripeAccountId: string | null
        }
    }> {
        let activity = await this.activityRepository.findById(input.activityId)

        // 通常検索で見つからない場合、削除済みも含めて検索
        if (!activity) {
            activity = await this.activityRepository.findByIdIncludingDeleted(input.activityId)
        }
        if (!activity) throw new ActivityNotFoundError()

        const deleted = activity.isDeleted()

        // コミュニティを取得して認可判定に使う
        const community = await this.communityRepository.findById(
            activity.getCommunityId().getValue(),
        )
        if (!community) throw new ActivityNotFoundError()

        // Wave6 W6-04: 認可チェック
        // - 非公開Communityは会員のみ
        // - PRIVATE Activity は会員のみ
        // - PUBLIC Activity に関しても v1 ではビジター参加未実装のため、Communityのアクセスルールに従う
        const isMember = await this.isActiveMember(community.getId().getValue(), input.viewerUserId)
        if (!community.getIsPublic() && !isMember) {
            throw new ActivityNotFoundError() // 存在秘匿
        }
        if (!isMember && activity.getVisibility().isPrivate()) {
            throw new ActivityNotFoundError() // 存在秘匿
        }

        const createdByUserId = activity.getCreatedBy().getValue()
        const user = await this.userRepository.findById(createdByUserId)

        // 幹事の displayName を取得
        const organizerUserId = activity.getOrganizerUserId()?.getValue() ?? null
        let organizerDisplayName: string | null = null
        if (organizerUserId) {
            if (organizerUserId === createdByUserId) {
                organizerDisplayName = user?.getDisplayName()?.getValue() ?? null
            } else {
                const organizerUser = await this.userRepository.findById(organizerUserId)
                organizerDisplayName = organizerUser?.getDisplayName()?.getValue() ?? null
            }
        }

        // defaultPlaceId がある場合、Place 情報を embed
        const defaultPlaceId = activity.getDefaultPlaceId()
        let defaultPlace: { id: string; name: string; address: string; lat: number; lng: number } | null = null
        if (defaultPlaceId) {
            const place = await this.placeRepository.findById(defaultPlaceId)
            if (place) {
                defaultPlace = {
                    id: place.getId().getValue(),
                    name: place.getName().getValue(),
                    address: place.getAddress().getValue(),
                    lat: place.getCoordinate().getLatitude(),
                    lng: place.getCoordinate().getLongitude(),
                }
            }
        }

        return {
            id: activity.getId().getValue(),
            communityId: activity.getCommunityId().getValue(),
            communityName: community?.getName().getValue() ?? null,
            title: activity.getTitle().getValue(),
            description: activity.getDescription()?.getValue() ?? null,
            defaultPlaceId: activity.getDefaultPlaceId(),
            defaultLocationCustom: activity.getDefaultLocationCustom(),
            isOnline: activity.getIsOnline(),
            defaultPlace,
            defaultStartTime: activity.getDefaultStartTime()?.getValue() ?? null,
            defaultEndTime: activity.getDefaultEndTime()?.getValue() ?? null,
            defaultParticipationFee: activity.getDefaultParticipationFee()?.amount ?? null,
            defaultVisitorFee: activity.getDefaultVisitorFee()?.amount ?? null,
            defaultCapacity: activity.getDefaultCapacity(),
            allowVisitorWaitlist: activity.getAllowVisitorWaitlist(),
            visibility: activity.getVisibility().getValue(),
            recurrenceRule: activity.getRecurrenceRule(),
            organizerUserId,
            organizerDisplayName,
            createdBy: createdByUserId,
            createdByDisplayName: user?.getDisplayName()?.getValue() ?? null,
            deleted,
            communityPaymentSettings: {
                enabledPaymentMethods: community?.getEnabledPaymentMethods() ?? ['CASH'],
                paypayId: community?.getPayPayId() ?? null,
                stripeAccountId: community?.getStripeAccountId() ?? null,
            },
        }
    }

    private async isActiveMember(communityId: string, viewerUserId: string | null | undefined): Promise<boolean> {
        if (!viewerUserId) return false
        const m = await this.membershipRepository.findByCommunityAndUser(communityId, viewerUserId)
        if (!m) return false
        return m.getLeftAt() === null
    }
}
