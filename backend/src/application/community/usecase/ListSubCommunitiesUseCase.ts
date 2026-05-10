import type { ICommunityRepository, SubCommunityListItem } from '@/domains/community/domain/repository/ICommunityRepository.js';

export class ListSubCommunitiesUseCase {
    constructor(
        private readonly communityRepository: ICommunityRepository,
    ) { }

    async execute(input: { parentId: string; viewerUserId: string | null }): Promise<{ children: SubCommunityListItem[] }> {
        const children = await this.communityRepository.findChildrenWithDetails(input.parentId, input.viewerUserId)
        return { children }
    }
}
