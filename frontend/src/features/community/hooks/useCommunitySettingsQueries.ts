import { communityApi } from '@/features/community/api/communityApi'
import { auditLogKeys, communityKeys, memberKeys } from '@/shared/lib/queryKeys'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

/** 監査ログ一覧取得 */
export function useAuditLogs(communityId: string) {
    return useQuery({
        queryKey: auditLogKeys.byCommunity(communityId),
        queryFn: () => communityApi.listAuditLogs(communityId),
        enabled: !!communityId,
    })
}

/** ロール変更 */
export function useChangeMemberRole(communityId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ userId, role }: { userId: string; role: string }) =>
            communityApi.changeMemberRole(communityId, userId, { role }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: memberKeys.list(communityId) })
            qc.invalidateQueries({ queryKey: auditLogKeys.byCommunity(communityId) })
        },
    })
}

/** メンバーのコミュニティ内レベル変更 */
export function useUpdateMemberLevel(communityId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ userId, level }: { userId: string; level: number | null }) =>
            communityApi.updateMemberLevel(communityId, userId, level),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: memberKeys.list(communityId) })
            qc.invalidateQueries({ queryKey: auditLogKeys.byCommunity(communityId) })
        },
    })
}

/** メンバー強制退室 */
export function useRemoveMember(communityId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (userId: string) => communityApi.removeMember(communityId, userId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: memberKeys.list(communityId) })
            qc.invalidateQueries({ queryKey: communityKeys.detail(communityId) })
            qc.invalidateQueries({ queryKey: auditLogKeys.byCommunity(communityId) })
        },
    })
}
