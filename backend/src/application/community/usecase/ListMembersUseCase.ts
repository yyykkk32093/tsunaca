import type { ICommunityMembershipRepository } from '@/domains/community/membership/domain/repository/ICommunityMembershipRepository.js'
import type { IUserRepository } from '@/domains/user/domain/repository/IUserRepository.js'

export class ListMembersUseCase {
    constructor(
        private readonly membershipRepository: ICommunityMembershipRepository,
        private readonly userRepository: IUserRepository,
    ) { }

    async execute(input: { communityId: string }): Promise<{
        members: Array<{
            id: string
            userId: string
            role: string
            joinedAt: Date
            displayName: string | null
            avatarUrl: string | null
            level: number | null
        }>
    }> {
        const memberships = await this.membershipRepository.findsByCommunityId(input.communityId)

        // Batch fetch user info to avoid N+1
        const userIds = memberships.map((m) => m.getUserId().getValue())
        const users = await this.userRepository.findByIds(userIds)
        const userMap = new Map(users.map((u) => [u.getId().getValue(), u]))

        return {
            members: memberships.map((m) => {
                const user = userMap.get(m.getUserId().getValue())
                return {
                    id: m.getId().getValue(),
                    userId: m.getUserId().getValue(),
                    role: m.getRole().getValue(),
                    joinedAt: m.getJoinedAt(),
                    displayName: user?.getDisplayName()?.getValue() ?? null,
                    avatarUrl: user?.getAvatarUrl()?.getValue() ?? null,
                    level: m.getLevel(),
                }
            }),
        }
    }
}
