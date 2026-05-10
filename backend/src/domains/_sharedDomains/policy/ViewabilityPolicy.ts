import type { Activity } from '@/domains/activity/domain/model/entity/Activity.js'
import type { Schedule } from '@/domains/activity/schedule/domain/model/entity/Schedule.js'
import type { Community } from '@/domains/community/domain/model/entity/Community.js'
import type { ICommunityMembershipRepository } from '@/domains/community/membership/domain/repository/ICommunityMembershipRepository.js'

/**
 * Wave6 W6-04: 閲覧可能性ポリシー
 *
 * - Community: isPublic == true OR viewer is active member
 * - Activity: viewable(community) AND (visibility == PUBLIC OR viewer is active member)
 * - Schedule: viewable(activity)（Schedule.visibilityOverride があれば優先）
 *
 * ※ 「active member」は退出済み (leftAt != null) を除外する。
 */
export class ViewabilityPolicy {
    constructor(private readonly membershipRepo: ICommunityMembershipRepository) { }

    /** viewer が指定コミュニティのアクティブ会員か */
    async isMemberOf(communityId: string, viewerUserId: string | null | undefined): Promise<boolean> {
        if (!viewerUserId) return false
        const membership = await this.membershipRepo.findByCommunityAndUser(communityId, viewerUserId)
        if (!membership) return false
        // leftAt がある場合は退出済み
        const leftAt = (membership as unknown as { getLeftAt?: () => Date | null }).getLeftAt?.()
        if (leftAt) return false
        return true
    }

    async canViewCommunity(community: Community, viewerUserId: string | null | undefined): Promise<boolean> {
        if (community.getIsPublic()) return true
        return this.isMemberOf(community.getId().getValue(), viewerUserId)
    }

    async canViewActivity(
        activity: Activity,
        community: Community,
        viewerUserId: string | null | undefined,
    ): Promise<boolean> {
        // Community が閲覧不可なら Activity も閲覧不可
        if (!(await this.canViewCommunity(community, viewerUserId))) return false
        // Activity が PUBLIC なら誰でも閲覧可
        if (activity.getVisibility().isPublic()) return true
        // PRIVATE は会員のみ
        return this.isMemberOf(community.getId().getValue(), viewerUserId)
    }

    async canViewSchedule(
        schedule: Schedule,
        activity: Activity,
        community: Community,
        viewerUserId: string | null | undefined,
    ): Promise<boolean> {
        if (!(await this.canViewCommunity(community, viewerUserId))) return false
        // Schedule.visibilityOverride があれば優先
        const override = schedule.getVisibilityOverride()
        const effective = override ?? activity.getVisibility()
        if (effective.isPublic()) return true
        return this.isMemberOf(community.getId().getValue(), viewerUserId)
    }
}
