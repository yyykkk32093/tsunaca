import type { GenerateMatchingRequest } from '@/features/matching/api/matchingApi'
import { matchingApi } from '@/features/matching/api/matchingApi'
import { isHttpError } from '@/shared/lib/apiClient'
import { matchingKeys, scheduleKeys } from '@/shared/lib/queryKeys'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useMatchingResult(scheduleId: string, enabled: boolean = true) {
    return useQuery({
        queryKey: matchingKeys.bySchedule(scheduleId),
        queryFn: async () => {
            try {
                return await matchingApi.getBySchedule(scheduleId)
            } catch (error) {
                if (isHttpError(error) && error.status === 404) {
                    return null
                }
                throw error
            }
        },
        enabled: !!scheduleId && enabled,
    })
}

export function useGenerateMatching(scheduleId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: GenerateMatchingRequest) => matchingApi.generate(scheduleId, data),
        onSuccess: () => {
            // 生成完了後は古いキャッシュを即クリアし、getBySchedule で最新データを取得させる
            qc.removeQueries({ queryKey: matchingKeys.bySchedule(scheduleId) })
            qc.invalidateQueries({ queryKey: scheduleKeys.detail(scheduleId) })
        },
    })
}

export function useAppendMatchingRounds(scheduleId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (addRounds: number) => matchingApi.appendRounds(scheduleId, addRounds),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: matchingKeys.bySchedule(scheduleId) })
        },
    })
}

export function useDeleteMatching(scheduleId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: () => matchingApi.removeBySchedule(scheduleId),
        onSuccess: () => {
            // 削除後はキャッシュを即座に null にする（stale データが残ると削除後も結果が見えてしまう）
            qc.setQueryData(matchingKeys.bySchedule(scheduleId), null)
        },
    })
}

export function useCategoryMatchFormats(communityId: string) {
    return useQuery({
        queryKey: ['matching', 'formats', communityId],
        queryFn: () => matchingApi.listCategoryMatchFormats(communityId),
        enabled: !!communityId,
    })
}

export function useParticipantLevels(scheduleId: string) {
    return useQuery({
        queryKey: ['matching', 'participant-levels', scheduleId],
        queryFn: () => matchingApi.listParticipantLevels(scheduleId),
        enabled: !!scheduleId,
    })
}

export function useUpdateMemberLevel(scheduleId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (input: { communityId: string; userId: string; level: number | null }) =>
            matchingApi.updateMemberLevel(input.communityId, input.userId, input.level),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: matchingKeys.bySchedule(scheduleId) })
            qc.invalidateQueries({ queryKey: ['matching', 'participant-levels', scheduleId] })
        },
    })
}

export function useUpdateVisitorLevel(scheduleId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (input: { participationId: string; level: number | null }) =>
            matchingApi.updateVisitorLevel(input.participationId, input.level),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: matchingKeys.bySchedule(scheduleId) })
            qc.invalidateQueries({ queryKey: ['matching', 'participant-levels', scheduleId] })
        },
    })
}

export function useUpdateFixedPairs(scheduleId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (fixedPairs: Array<[string, string]>) => matchingApi.updateFixedPairs(scheduleId, fixedPairs),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: matchingKeys.bySchedule(scheduleId) })
        },
    })
}

export function useUpdateMatchingRound(scheduleId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (input: { roundNo: number; courts: Array<{ courtNo: number; groups: Array<{ groupNo: number; participantIds: string[] }> }> }) =>
            matchingApi.updateRound(scheduleId, input.roundNo, input.courts),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: matchingKeys.bySchedule(scheduleId) })
        },
    })
}
