/**
 * Stripe Connect Onboarding React Query フック
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { connectApi } from '../api/connectApi'

export const connectKeys = {
    status: (communityId: string) => ['connect', 'status', communityId] as const,
}

/** Connect アカウントのステータスを取得 */
export function useConnectStatus(communityId: string | undefined) {
    return useQuery({
        queryKey: connectKeys.status(communityId ?? ''),
        queryFn: () => connectApi.getStatus(communityId!),
        enabled: !!communityId,
        staleTime: 30_000,
    })
}

/** オンボーディング開始 → Stripe Account Link にリダイレクト */
export function useStartOnboarding(communityId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: () => {
            const refreshUrl = window.location.href
            const returnUrl = window.location.href
            return connectApi.startOnboarding(communityId, refreshUrl, returnUrl)
        },
        onSuccess: (data) => {
            // 新規ウィンドウを優先。ブロックされた場合は同一タブにフォールバック
            const opened = window.open(data.accountLinkUrl, '_blank', 'noopener,noreferrer')
            if (!opened) {
                window.location.href = data.accountLinkUrl
            }
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: connectKeys.status(communityId) })
        },
    })
}

/** Stripe Express ダッシュボードを開く */
export function useOpenDashboard(communityId: string) {
    return useMutation({
        mutationFn: () => connectApi.getDashboardLink(communityId),
        onSuccess: (data) => {
            window.open(data.dashboardUrl, '_blank')
        },
    })
}
