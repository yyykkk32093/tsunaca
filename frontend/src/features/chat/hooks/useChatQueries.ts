import { useSocket } from '@/app/providers/SocketProvider'
import { chatApi } from '@/features/chat/api/chatApi'
import { chatChannelKeys, dmListKeys, messageListKeys } from '@/shared/lib/queryKeys'
import type { SendMessageRequest } from '@/shared/types/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

/** 自分が参加する全チャンネル一覧 */
export function useMyChannels() {
    const { isConnected } = useSocket()
    return useQuery({
        queryKey: chatChannelKeys.myChannels(),
        queryFn: () => chatApi.getMyChannels(),
        // WS 接続中はリアルタイム配信で補完。切断時のみポーリングフォールバック
        refetchInterval: isConnected ? false : 30_000,
    })
}

/** W5-25: コミュニティツリー+未読数 */
export function useCommunityChannelTree() {
    const { isConnected } = useSocket()
    return useQuery({
        queryKey: ['channels', 'community-tree'],
        queryFn: () => chatApi.getCommunityChannelTree(),
        refetchInterval: isConnected ? false : 30_000,
    })
}

/** W5-25: 既読マーク */
export function useMarkChannelRead() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (channelId: string) => chatApi.markChannelRead(channelId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['channels', 'community-tree'] })
        },
    })
}

/** コミュニティのチャットチャンネル取得 */
export function useCommunityChannel(communityId: string) {
    return useQuery({
        queryKey: chatChannelKeys.byCommunity(communityId),
        queryFn: () => chatApi.getCommunityChannel(communityId),
        enabled: !!communityId,
    })
}

/** アクティビティのチャットチャンネル取得 */
export function useActivityChannel(activityId: string) {
    return useQuery({
        queryKey: chatChannelKeys.byActivity(activityId),
        queryFn: () => chatApi.getActivityChannel(activityId),
        enabled: !!activityId,
    })
}

/** チャンネルのメッセージ一覧 */
export function useMessages(channelId: string) {
    const { isConnected } = useSocket()
    return useQuery({
        queryKey: messageListKeys.byChannel(channelId),
        queryFn: () => chatApi.listMessages(channelId),
        enabled: !!channelId,
        // WS 接続中はリアルタイム配信。切断時のみポーリングフォールバック（5秒）
        refetchInterval: isConnected ? false : 5_000,
    })
}

/** スレッド返信一覧 */
export function useReplies(messageId: string) {
    return useQuery({
        queryKey: messageListKeys.replies(messageId),
        queryFn: () => chatApi.listReplies(messageId),
        enabled: !!messageId,
    })
}

/** メッセージ検索 */
export function useSearchMessages(channelId: string, query: string) {
    return useQuery({
        queryKey: messageListKeys.search(channelId, query),
        queryFn: () => chatApi.searchMessages(channelId, query),
        enabled: !!channelId && query.length >= 2,
    })
}

/** REST でメッセージ送信 */
export function useSendMessage(channelId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: SendMessageRequest) => chatApi.sendMessage(channelId, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: messageListKeys.byChannel(channelId) }),
    })
}

/** メッセージ削除 */
export function useDeleteMessage(channelId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: chatApi.deleteMessage,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: messageListKeys.byChannel(channelId) })
            // スレッド返信の削除も即時反映
            qc.invalidateQueries({ queryKey: ['messages', 'replies'] })
        },
    })
}

/** メッセージにファイル添付 */
export function useUploadAttachment(channelId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ messageId, file }: { messageId: string; file: File }) =>
            chatApi.uploadAttachment(channelId, messageId, file),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: messageListKeys.byChannel(channelId) })
            // スレッド返信の添付画像も即時反映
            qc.invalidateQueries({ queryKey: ['messages', 'replies'] })
        },
    })
}

/** DM チャンネルから退出 */
export function useLeaveDmChannel() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (channelId: string) => chatApi.leaveDmChannel(channelId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: chatChannelKeys.myChannels() })
            qc.invalidateQueries({ queryKey: dmListKeys.myChannels() })
        },
    })
}
