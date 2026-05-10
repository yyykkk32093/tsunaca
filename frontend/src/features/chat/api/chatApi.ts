import { http, HttpError, type ApiError } from '@/shared/lib/apiClient'
import type {
    ChatChannel,
    CommunityChannelTreeResponse,
    ListMessagesResponse,
    MessageAttachment,
    MyChannelsResponse,
    SearchMessagesResponse,
    SendMessageRequest,
    SendMessageResponse,
} from '@/shared/types/api'

const baseURL: string = import.meta.env.VITE_API_BASE_URL || ''

export const chatApi = {
    /** 自分が参加する全チャンネル一覧 */
    getMyChannels: () => http<MyChannelsResponse>('/v1/channels'),

    /** W5-25: コミュニティツリー+未読数 */
    getCommunityChannelTree: () => http<CommunityChannelTreeResponse>('/v1/channels/community-tree'),

    /** W5-25: 既読マーク */
    markChannelRead: (channelId: string) =>
        http<void>(`/v1/channels/${channelId}/read`, { method: 'PUT' }),

    /** コミュニティのチャットチャンネル取得（自動作成） */
    getCommunityChannel: (communityId: string) =>
        http<ChatChannel>(`/v1/communities/${communityId}/channel`),

    /** アクティビティのチャットチャンネル取得（自動作成） */
    getActivityChannel: (activityId: string) =>
        http<ChatChannel>(`/v1/activities/${activityId}/channel`),

    /** チャンネルのメッセージ一覧（カーソルページネーション） */
    listMessages: (channelId: string, cursor?: string, limit?: number) =>
        http<ListMessagesResponse>(`/v1/channels/${channelId}/messages`, {
            query: { ...(cursor ? { cursor } : {}), ...(limit ? { limit } : {}) },
        }),

    /** スレッド返信一覧 */
    listReplies: (messageId: string, cursor?: string, limit?: number) =>
        http<ListMessagesResponse>(`/v1/messages/${messageId}/replies`, {
            query: { ...(cursor ? { cursor } : {}), ...(limit ? { limit } : {}) },
        }),

    /** メッセージ検索 */
    searchMessages: (channelId: string, q: string, cursor?: string, limit?: number) =>
        http<SearchMessagesResponse>(`/v1/channels/${channelId}/messages/search`, {
            query: { q, ...(cursor ? { cursor } : {}), ...(limit ? { limit } : {}) },
        }),

    /** REST でメッセージ送信（WebSocket フォールバック） */
    sendMessage: (channelId: string, data: SendMessageRequest) =>
        http<SendMessageResponse>(`/v1/channels/${channelId}/messages`, {
            method: 'POST',
            json: data,
        }),

    /** メッセージ削除 */
    deleteMessage: (messageId: string) =>
        http<void>(`/v1/messages/${messageId}`, { method: 'DELETE' }),

    /** DM チャンネルから退出 */
    leaveDmChannel: (channelId: string) =>
        http<void>(`/v1/dm/channels/${channelId}/leave`, { method: 'DELETE' }),

    /** メッセージにファイルを添付（Presigned URL フロー） */
    uploadAttachment: async (channelId: string, messageId: string, file: File): Promise<MessageAttachment> => {
        // Step 1: Presigned URL 取得
        const urlRes = await fetch(`${baseURL}/v1/channels/${channelId}/attachments/url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fileName: file.name,
                mimeType: file.type || 'application/octet-stream',
                fileSize: file.size,
            }),
            credentials: 'include',
        })
        if (!urlRes.ok) {
            const body = await urlRes.json().catch(() => null)
            const apiError: ApiError =
                body && typeof body === 'object' && 'code' in body
                    ? (body as ApiError)
                    : { code: 'UPLOAD_ERROR', message: `Failed to get upload URL: HTTP ${urlRes.status}` }
            throw new HttpError(urlRes.status, apiError)
        }
        const { uploadUrl, key } = await urlRes.json()

        // Step 2: S3 に直接アップロード
        const putRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type || 'application/octet-stream' },
            body: file,
        })
        if (!putRes.ok) {
            throw new HttpError(putRes.status, {
                code: 'UPLOAD_ERROR',
                message: `S3 upload failed: HTTP ${putRes.status}`,
            })
        }

        // Step 3: 確認 + DB 登録
        const confirmRes = await fetch(
            `${baseURL}/v1/channels/${channelId}/messages/${messageId}/attachments/confirm`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key,
                    fileName: file.name,
                    mimeType: file.type || 'application/octet-stream',
                    fileSize: file.size,
                }),
                credentials: 'include',
            },
        )
        const body = await confirmRes.json()
        if (!confirmRes.ok) {
            const apiError: ApiError =
                body && typeof body === 'object' && 'code' in body
                    ? (body as ApiError)
                    : { code: 'UPLOAD_ERROR', message: `Confirm failed: HTTP ${confirmRes.status}` }
            throw new HttpError(confirmRes.status, apiError)
        }
        return body as MessageAttachment
    },
}
