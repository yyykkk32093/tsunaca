import { useSocket } from '@/app/providers/SocketProvider'
import { messageListKeys } from '@/shared/lib/queryKeys'
import type { ListMessagesResponse, MessageItem } from '@/shared/types/api'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'

// ─── サーバーから配信されるメッセージ型 ──────────────────

interface WsMessage {
    id: string
    channelId: string
    senderId: string
    senderDisplayName: string | null
    senderAvatarUrl: string | null
    parentMessageId: string | null
    content: string
    mentions: string[]
    isPinned: boolean
    attachments: unknown[]
    reactions: unknown[]
    deletedBy?: string | null
    replyCount: number
    createdAt: string
}

interface WsTyping {
    userId: string
    channelId: string
}

interface WsReactionUpdated {
    messageId: string
}

interface WsMessageDeleted {
    messageId: string
    channelId: string
}

/** thread:new イベントのペイロード */
interface WsThreadNew {
    reply: WsMessage
    parentMessageId: string
    replyCount: number
}

// ─── Hook ────────────────────────────────────────────────

interface UseSocketChatOptions {
    channelId: string | undefined
}

interface UseSocketChatReturn {
    /** 現在タイピング中のユーザーID群 */
    typingUsers: string[]
    /** channel:join / channel:leave を手動制御する場合 */
    joinChannel: (id: string) => void
    leaveChannel: (id: string) => void
    /** WS でメッセージ送信（REST 代替） */
    sendMessage: (content: string, options?: { parentMessageId?: string; mentions?: string[] }) => void
}

/**
 * useSocketChat — チャット用 WebSocket リアルタイムフック
 *
 * - channel:join / channel:leave をライフサイクルで自動管理
 * - message:new → QueryClient キャッシュへ追加（ポーリング不要に）
 * - message:typing → typingUsers state で UI 表示
 * - reaction:updated → メッセージ一覧を invalidate
 */
export function useSocketChat({ channelId }: UseSocketChatOptions): UseSocketChatReturn {
    const { socket } = useSocket()
    const qc = useQueryClient()
    const [typingUsers, setTypingUsers] = useState<string[]>([])
    const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
    const currentChannelRef = useRef<string | undefined>(undefined)

    // ── channel:join / channel:leave 自動管理 ──
    useEffect(() => {
        if (!socket || !channelId) return

        // 前のチャンネルから離脱
        if (currentChannelRef.current && currentChannelRef.current !== channelId) {
            socket.emit('channel:leave', currentChannelRef.current)
        }

        socket.emit('channel:join', channelId)
        currentChannelRef.current = channelId

        return () => {
            socket.emit('channel:leave', channelId)
            currentChannelRef.current = undefined
        }
    }, [socket, channelId])

    // ── message:new リスナー（トップレベルメッセージのみ） ──
    useEffect(() => {
        if (!socket || !channelId) return

        const handleNewMessage = (msg: WsMessage) => {
            // W5-25: 他チャンネルのメッセージ→ツリー未読数を更新
            if (msg.channelId !== channelId) {
                qc.invalidateQueries({ queryKey: ['channels', 'community-tree'] })
                return
            }

            // スレッド返信はトップレベルキャッシュに追加しない（thread:new で処理）
            if (msg.parentMessageId) return

            qc.setQueryData<ListMessagesResponse>(
                messageListKeys.byChannel(channelId),
                (old) => {
                    if (!old) return old
                    // 重複防止（REST とレースコンディション対策）
                    const exists = old.messages.some((m) => m.id === msg.id)
                    if (exists) return old
                    // API は createdAt DESC で返却 → 先頭に追加
                    const newMsg: MessageItem = {
                        id: msg.id,
                        channelId: msg.channelId,
                        senderId: msg.senderId,
                        senderDisplayName: msg.senderDisplayName,
                        senderAvatarUrl: msg.senderAvatarUrl,
                        parentMessageId: msg.parentMessageId,
                        content: msg.content,
                        mentions: msg.mentions,
                        deletedBy: msg.deletedBy ?? null,
                        attachments: [],
                        reactions: [],
                        replyCount: 0,
                        latestReply: null,
                        createdAt: msg.createdAt,
                    }
                    return { ...old, messages: [newMsg, ...old.messages] }
                },
            )
        }

        socket.on('message:new', handleNewMessage)
        return () => {
            socket.off('message:new', handleNewMessage)
        }
    }, [socket, channelId, qc])

    // ── thread:new リスナー（スレッド返信） ──
    useEffect(() => {
        if (!socket || !channelId) return

        const handleThreadNew = (data: WsThreadNew) => {
            if (data.reply.channelId !== channelId) return

            // 1. トップレベルメッセージの replyCount + latestReply を更新
            qc.setQueryData<ListMessagesResponse>(
                messageListKeys.byChannel(channelId),
                (old) => {
                    if (!old) return old
                    return {
                        ...old,
                        messages: old.messages.map((m) =>
                            m.id === data.parentMessageId
                                ? {
                                    ...m,
                                    replyCount: data.replyCount,
                                    latestReply: {
                                        senderDisplayName: data.reply.senderDisplayName,
                                        content: data.reply.content,
                                        createdAt: data.reply.createdAt,
                                    },
                                }
                                : m,
                        ),
                    }
                },
            )

            // 2. スレッド返信キャッシュに新しい返信を追加（スレッドが開いている場合）
            qc.setQueryData<ListMessagesResponse>(
                messageListKeys.replies(data.parentMessageId),
                (old) => {
                    if (!old) return old
                    const exists = old.messages.some((m) => m.id === data.reply.id)
                    if (exists) return old
                    const replyMsg: MessageItem = {
                        id: data.reply.id,
                        channelId: data.reply.channelId,
                        senderId: data.reply.senderId,
                        senderDisplayName: data.reply.senderDisplayName,
                        senderAvatarUrl: data.reply.senderAvatarUrl,
                        parentMessageId: data.reply.parentMessageId,
                        content: data.reply.content,
                        mentions: data.reply.mentions,
                        deletedBy: data.reply.deletedBy ?? null,
                        attachments: [],
                        reactions: [],
                        replyCount: 0,
                        latestReply: null,
                        createdAt: data.reply.createdAt,
                    }
                    // 返信は createdAt ASC → 末尾に追加
                    return { ...old, messages: [...old.messages, replyMsg] }
                },
            )
        }

        socket.on('thread:new', handleThreadNew)
        return () => {
            socket.off('thread:new', handleThreadNew)
        }
    }, [socket, channelId, qc])

    // ── message:typing リスナー ──
    useEffect(() => {
        if (!socket || !channelId) return

        const handleTyping = (data: WsTyping) => {
            if (data.channelId !== channelId) return

            setTypingUsers((prev) => {
                if (prev.includes(data.userId)) return prev
                return [...prev, data.userId]
            })

            // 3秒後にタイピング表示をクリア
            const existing = typingTimers.current.get(data.userId)
            if (existing) clearTimeout(existing)

            const timer = setTimeout(() => {
                setTypingUsers((prev) => prev.filter((id) => id !== data.userId))
                typingTimers.current.delete(data.userId)
            }, 3_000)
            typingTimers.current.set(data.userId, timer)
        }

        socket.on('message:typing', handleTyping)
        return () => {
            socket.off('message:typing', handleTyping)
            // クリーンアップ: 全タイマーを解除
            typingTimers.current.forEach(clearTimeout)
            typingTimers.current.clear()
            setTypingUsers([])
        }
    }, [socket, channelId])

    // ── reaction:updated リスナー ──
    useEffect(() => {
        if (!socket || !channelId) return

        const handleReactionUpdated = (_data: WsReactionUpdated) => {
            // リアクション変更 → メッセージ一覧 + スレッド返信を再取得
            qc.invalidateQueries({ queryKey: messageListKeys.byChannel(channelId) })
            qc.invalidateQueries({ queryKey: ['messages', 'replies'] })
        }

        socket.on('reaction:updated', handleReactionUpdated)
        return () => {
            socket.off('reaction:updated', handleReactionUpdated)
        }
    }, [socket, channelId, qc])

    // ── message:deleted リスナー ──
    useEffect(() => {
        if (!socket || !channelId) return

        const handleMessageDeleted = (data: WsMessageDeleted) => {
            if (data.channelId !== channelId) return
            // 削除されたメッセージのキャッシュを更新（deletedBy をセット）
            qc.setQueryData<ListMessagesResponse>(
                messageListKeys.byChannel(channelId),
                (old) => {
                    if (!old) return old
                    return {
                        ...old,
                        messages: old.messages.map((m) =>
                            m.id === data.messageId ? { ...m, deletedBy: 'deleted' } : m,
                        ),
                    }
                },
            )
            // スレッド返信キャッシュも invalidate
            qc.invalidateQueries({ queryKey: ['messages', 'replies'] })
        }

        socket.on('message:deleted', handleMessageDeleted)
        return () => {
            socket.off('message:deleted', handleMessageDeleted)
        }
    }, [socket, channelId, qc])

    // ── 公開API ──
    const joinChannel = useCallback(
        (id: string) => socket?.emit('channel:join', id),
        [socket],
    )

    const leaveChannel = useCallback(
        (id: string) => socket?.emit('channel:leave', id),
        [socket],
    )

    const sendMessage = useCallback(
        (content: string, options?: { parentMessageId?: string; mentions?: string[] }) => {
            if (!socket || !channelId) return
            socket.emit('message:send', {
                channelId,
                content,
                parentMessageId: options?.parentMessageId,
                mentions: options?.mentions,
            })
        },
        [socket, channelId],
    )

    return { typingUsers, joinChannel, leaveChannel, sendMessage }
}
