import { http } from '@/shared/lib/apiClient'
import type {
    AcceptInviteResponse,
    AddMemberRequest,
    ChangeMemberRoleRequest,
    CommunityDetail,
    CommunityMastersResponse,
    CreateCommunityRequest,
    CreateCommunityResponse,
    CreateSubCommunityRequest,
    GenerateInviteTokenResponse,
    JoinCommunityResponse,
    JoinRequestBody,
    JoinRequestResponse,
    ListAuditLogsResponse,
    ListCommunitiesResponse,
    ListMembersResponse,
    ListSubCommunitiesResponse,
    SearchCommunitiesParams,
    SearchCommunitiesResponse,
    UpdateCommunityRequest,
} from '@/shared/types/api'

export const communityApi = {
    list: () =>
        http<ListCommunitiesResponse>('/v1/communities'),

    findById: (id: string) =>
        http<CommunityDetail>(`/v1/communities/${id}`),

    create: (data: CreateCommunityRequest) =>
        http<CreateCommunityResponse>('/v1/communities', { method: 'POST', json: data }),

    update: (id: string, data: UpdateCommunityRequest) =>
        http<void>(`/v1/communities/${id}`, { method: 'PATCH', json: data }),

    remove: (id: string) =>
        http<void>(`/v1/communities/${id}`, { method: 'DELETE' }),

    createChild: (parentId: string, data: CreateSubCommunityRequest) =>
        http<CreateCommunityResponse>(`/v1/communities/${parentId}/children`, { method: 'POST', json: data }),

    listChildren: (communityId: string) =>
        http<ListSubCommunitiesResponse>(`/v1/communities/${communityId}/children`),

    // ---- Members ----
    listMembers: (communityId: string) =>
        http<ListMembersResponse>(`/v1/communities/${communityId}/members`),

    addMember: (communityId: string, data: AddMemberRequest) =>
        http<void>(`/v1/communities/${communityId}/members`, { method: 'POST', json: data }),

    changeMemberRole: (communityId: string, userId: string, data: ChangeMemberRoleRequest) =>
        http<void>(`/v1/communities/${communityId}/members/${userId}`, { method: 'PATCH', json: data }),

    updateMemberLevel: (communityId: string, userId: string, level: number | null) =>
        http<void>(`/v1/communities/${communityId}/members/${userId}/level`, { method: 'PATCH', json: { level } }),

    leave: (communityId: string, opts?: { cascadeToChildren?: boolean }) =>
        http<void>(`/v1/communities/${communityId}/members/me`, {
            method: 'DELETE',
            json: opts?.cascadeToChildren != null ? { cascadeToChildren: opts.cascadeToChildren } : undefined,
        }),

    removeMember: (communityId: string, userId: string) =>
        http<void>(`/v1/communities/${communityId}/members/${userId}`, { method: 'DELETE' }),

    // ---- Audit Logs ----
    listAuditLogs: (communityId: string, limit?: number) => {
        const qs = limit ? `?limit=${limit}` : ''
        return http<ListAuditLogsResponse>(`/v1/communities/${communityId}/audit-logs${qs}`)
    },

    // ---- Masters ----
    getAllMasters: () =>
        http<CommunityMastersResponse>('/v1/masters/community'),

    // ---- Phase 2.5: Search & Join ----
    search: (params: SearchCommunitiesParams) => {
        const searchParams = new URLSearchParams()
        if (params.keyword) searchParams.set('keyword', params.keyword)
        if (params.area) searchParams.set('area', params.area)
        params.categoryIds?.forEach((id) => searchParams.append('categoryIds', id))
        params.levelIds?.forEach((id) => searchParams.append('levelIds', id))
        params.days?.forEach((d) => searchParams.append('days', d))
        // W4-03: 追加フィルタ
        params.targetGender?.forEach((g) => searchParams.append('targetGender', g))
        if (params.joinMethod) searchParams.set('joinMethod', params.joinMethod)
        if (params.limit) searchParams.set('limit', String(params.limit))
        if (params.offset) searchParams.set('offset', String(params.offset))
        const qs = searchParams.toString()
        return http<SearchCommunitiesResponse>(`/v1/communities/search${qs ? `?${qs}` : ''}`)
    },

    findPublicById: (id: string) =>
        http<CommunityDetail>(`/v1/communities/public/${id}`),

    join: (communityId: string) =>
        http<JoinCommunityResponse>(`/v1/communities/${communityId}/join`, { method: 'POST' }),

    requestJoin: (communityId: string, data?: JoinRequestBody) =>
        http<JoinRequestResponse>(`/v1/communities/${communityId}/join-request`, { method: 'POST', json: data }),

    // ---- UBL-11: Invite ----
    generateInviteToken: (communityId: string) =>
        http<GenerateInviteTokenResponse>(`/v1/communities/${communityId}/invite`, { method: 'POST' }),

    acceptInvite: (token: string) =>
        http<AcceptInviteResponse>(`/v1/invites/${token}/accept`, { method: 'POST' }),

    // ---- Phase 3 #53: Bookmark ----
    addBookmark: (communityId: string) =>
        http<{ bookmarked: boolean }>(`/v1/communities/${communityId}/bookmark`, { method: 'POST' }),

    removeBookmark: (communityId: string) =>
        http<{ bookmarked: boolean }>(`/v1/communities/${communityId}/bookmark`, { method: 'DELETE' }),

    listBookmarked: () =>
        http<{ communities: Array<{ id: string; name: string; description: string | null; logoUrl: string | null; coverUrl: string | null; joinMethod: string; isPublic: boolean }> }>('/v1/bookmarks/communities'),

    // ---- Locations ----
    getLocations: (communityId: string) =>
        http<{ locations: Array<{ id: string; type: 'MAIN' | 'SUB'; area: string; station: string | null; sortOrder: number }> }>(`/v1/communities/${communityId}/locations`),

    saveLocations: (communityId: string, locations: Array<{ type: 'MAIN' | 'SUB'; area: string; station?: string }>) =>
        http<{ locations: Array<{ id: string; type: 'MAIN' | 'SUB'; area: string; station: string | null; sortOrder: number }> }>(`/v1/communities/${communityId}/locations`, { method: 'PUT', json: { locations } }),

    // ---- Tags ----
    saveTags: (communityId: string, tags: string[]) =>
        http<{ tags: string[] }>(`/v1/communities/${communityId}/tags`, { method: 'PUT', json: { tags } }),
}
