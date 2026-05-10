import { scheduleApi } from '@/features/schedule/api/scheduleApi'
import { activityKeys, activityListKeys, scheduleKeys, scheduleListKeys } from '@/shared/lib/queryKeys'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useSchedules(activityId: string) {
    return useQuery({
        queryKey: scheduleListKeys.byActivity(activityId),
        queryFn: () => scheduleApi.list(activityId),
        enabled: !!activityId,
    })
}

export function useSchedule(id: string) {
    return useQuery({
        queryKey: scheduleKeys.detail(id),
        queryFn: () => scheduleApi.findById(id),
        enabled: !!id,
    })
}

export function useCreateSchedule(activityId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: Parameters<typeof scheduleApi.create>[1]) => scheduleApi.create(activityId, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: scheduleListKeys.byActivity(activityId) }),
    })
}

export function useUpdateSchedule() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (input: { scheduleId: string; activityId: string } & Parameters<typeof scheduleApi.update>[1]) => {
            const { scheduleId, activityId, ...data } = input
            return scheduleApi.update(scheduleId, data)
        },
        onSuccess: (_data, variables) => {
            qc.invalidateQueries({ queryKey: scheduleListKeys.byActivity(variables.activityId) })
            qc.invalidateQueries({ queryKey: scheduleKeys.detail(variables.scheduleId) })
        },
    })
}

export function useCancelSchedule(activityId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: scheduleApi.cancel,
        onSuccess: () => qc.invalidateQueries({ queryKey: scheduleListKeys.byActivity(activityId) }),
    })
}

export function useRestoreSchedule(activityId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (scheduleId: string) => scheduleApi.restore(scheduleId),
        onSuccess: (_data, scheduleId) => {
            qc.invalidateQueries({ queryKey: scheduleListKeys.byActivity(activityId) })
            qc.invalidateQueries({ queryKey: scheduleKeys.detail(scheduleId) })
        },
    })
}

export function useCancelOrDeleteSchedule(activityId: string, communityId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (input: {
            scheduleId: string
            operation: 'cancel' | 'delete'
            scope: 'single' | 'all'
            notifyOption: 'announcement' | 'push_only' | 'none'
        }) => {
            const { scheduleId, ...data } = input
            return scheduleApi.cancelOrDelete(scheduleId, data)
        },
        onSuccess: (data, variables) => {
            qc.invalidateQueries({ queryKey: scheduleListKeys.byActivity(activityId) })
            // Activity自体も論理削除された場合
            if (data.activityDeleted) {
                qc.invalidateQueries({ queryKey: activityKeys.detail(activityId) })
                qc.invalidateQueries({ queryKey: activityListKeys.byCommunity(communityId) })
            }
        },
    })
}
