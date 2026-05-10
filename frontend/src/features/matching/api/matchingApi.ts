import { http } from '@/shared/lib/apiClient'

export type MatchingMode = 'RANDOM' | 'MIXED_LEVEL' | 'SAME_LEVEL'

export type MatchingParticipant = {
    participationId: string
    userId: string | null
    displayName: string
    level: number
    isVisitor: boolean
}

export type MatchingRound = {
    roundNo: number
    looped?: boolean
    courts: Array<{
        courtNo: number
        /** このコートの「同一の参加者の組み合わせ」が初出したラウンド番号。初出ラウンドでは undefined */
        duplicatedFromRoundNo?: number
        groups: Array<{
            groupNo: number
            participants: MatchingParticipant[]
        }>
    }>
}

export interface MatchingResult {
    id: string
    scheduleId: string
    mode: MatchingMode
    params: {
        rounds: number
        courtCount: number
        groupsPerCourt: number
        playersPerGroup: number
        categoryId?: string | null
        categoryName?: string | null
        formatName?: string | null
        fixedPairs?: Array<[string, string]>
    }
    rounds: MatchingRound[]
    createdBy: string
    createdAt: string
    updatedAt: string
}

export interface GenerateMatchingRequest {
    mode: MatchingMode
    rounds?: number
    courtCount: number
    groupsPerCourt: number
    playersPerGroup: number
    categoryId?: string | null
    categoryName?: string | null
    formatName?: string | null
    fixedPairs?: Array<[string, string]>
}

export const matchingApi = {
    getBySchedule: (scheduleId: string) =>
        http<MatchingResult>(`/v1/schedules/${scheduleId}/matching`),

    generate: (scheduleId: string, data: GenerateMatchingRequest) =>
        http<{ matchingResultId: string }>(`/v1/schedules/${scheduleId}/matching`, {
            method: 'POST',
            json: data,
        }),

    appendRounds: (scheduleId: string, addRounds: number) =>
        http<{ matchingResultId: string }>(`/v1/schedules/${scheduleId}/matching/append-rounds`, {
            method: 'POST',
            json: { addRounds },
        }),

    removeBySchedule: (scheduleId: string) =>
        http<void>(`/v1/schedules/${scheduleId}/matching`, { method: 'DELETE' }),

    updateFixedPairs: (scheduleId: string, fixedPairs: Array<[string, string]>) =>
        http<void>(`/v1/schedules/${scheduleId}/matching/fixed-pairs`, {
            method: 'PATCH',
            json: { fixedPairs },
        }),

    updateRound: (
        scheduleId: string,
        roundNo: number,
        courts: Array<{ courtNo: number; groups: Array<{ groupNo: number; participantIds: string[] }> }>,
    ) =>
        http<void>(`/v1/schedules/${scheduleId}/matching/rounds/${roundNo}`, {
            method: 'PATCH',
            json: { courts },
        }),

    listCategoryMatchFormats: (communityId: string) =>
        http<{
            categories: Array<{
                id: string
                name: string
                nameEn: string
                formats: Array<{
                    id: string
                    name: string
                    playersPerGroup: number
                    groupsPerCourt: number
                    sortOrder: number
                    isDefault: boolean
                }>
            }>
        }>(`/v1/communities/${communityId}/category-match-formats`),

    listParticipantLevels: (scheduleId: string) =>
        http<{
            participants: Array<{
                participationId: string
                userId: string | null
                displayName: string
                level: number
                isVisitor: boolean
            }>
        }>(`/v1/schedules/${scheduleId}/matching/participant-levels`),

    updateMemberLevel: (communityId: string, userId: string, level: number | null) =>
        http<void>(`/v1/communities/${communityId}/members/${userId}/level`, {
            method: 'PATCH',
            json: { level },
        }),

    updateVisitorLevel: (participationId: string, level: number | null) =>
        http<void>(`/v1/participations/${participationId}/visitor-level`, {
            method: 'PATCH',
            json: { level },
        }),
}
