import type { CommunityDetail, ICommunityRepository } from '@/domains/community/domain/repository/ICommunityRepository.js';
import type { ICommunityMembershipRepository } from '@/domains/community/membership/domain/repository/ICommunityMembershipRepository.js';
import { CommunityNotFoundError } from '../error/CommunityNotFoundError.js';

export class FindCommunityUseCase {
    constructor(
        private readonly communityRepository: ICommunityRepository,
        private readonly membershipRepository: ICommunityMembershipRepository,
    ) { }

    /**
     * Wave6 W6-04: 非公開コミュニティへの非加入ユーザーアクセスを 404 で遮断する。
     * - viewerUserId == null: 公開コミュニティのみ閲覧可能
     * - viewerUserId が active member: すべて閲覧可能
     */
    async execute(input: { communityId: string; viewerUserId?: string | null }): Promise<CommunityDetail> {
        const detail = await this.communityRepository.findDetailById(input.communityId)
        if (!detail) throw new CommunityNotFoundError()

        if (!detail.isPublic) {
            const isMember = await this.isActiveMember(input.communityId, input.viewerUserId)
            if (!isMember) {
                // 存在秘匿のため 404
                throw new CommunityNotFoundError()
            }
        }
        return detail
    }

    private async isActiveMember(communityId: string, viewerUserId: string | null | undefined): Promise<boolean> {
        if (!viewerUserId) return false
        const membership = await this.membershipRepository.findByCommunityAndUser(communityId, viewerUserId)
        if (!membership) return false
        return membership.getLeftAt() === null
    }
}
