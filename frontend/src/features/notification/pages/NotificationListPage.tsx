import { isAdFeedMarker, useAdFeed } from '@/features/ads'
import { AdFeedItem } from '@/features/ads/components/AdFeedItem'
import type { NotificationCategory } from '@/features/notification/api/notificationApi'
import {
    useMarkAllNotificationsAsRead,
    useMarkNotificationAsRead,
    useNotifications,
} from '@/features/notification/hooks/useNotificationQueries'
import type { NotificationItem } from '@/shared/types/api'
import { Calendar, ExternalLink, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

const TABS: { label: string; value: NotificationCategory | undefined }[] = [
    { label: 'すべて', value: undefined },
    { label: 'コミュニティ', value: 'community' },
    { label: 'アクティビティ', value: 'activity' },
    { label: 'チャット', value: 'chat' },
]

export function NotificationListPage() {
    const [activeCategory, setActiveCategory] = useState<NotificationCategory | undefined>(undefined)
    const { data, isLoading, error } = useNotifications(activeCategory)
    const markAsRead = useMarkNotificationAsRead()
    const markAllAsRead = useMarkAllNotificationsAsRead()

    const notifications = data?.notifications ?? []
    const feedItems = useAdFeed('notification-feed', notifications)

    return (
        <div className="max-w-2xl mx-auto p-4">
            {/* ヘッダー */}
            <div className="flex items-center justify-between mb-3">
                <h1 className="text-2xl font-bold">通知</h1>
                <button
                    onClick={() => markAllAsRead.mutate()}
                    disabled={markAllAsRead.isPending}
                    type="button"
                    className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                >
                    すべて既読にする
                </button>
            </div>

            {/* カテゴリタブ */}
            <div className="flex gap-1 mb-4 border-b border-gray-200">
                {TABS.map((tab) => (
                    <button
                        key={tab.label}
                        type="button"
                        onClick={() => setActiveCategory(tab.value)}
                        className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${activeCategory === tab.value
                            ? 'text-blue-600 border-blue-600'
                            : 'text-gray-500 border-transparent hover:text-gray-700'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* コンテンツ */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
            ) : error ? (
                <p className="text-center text-sm text-red-600 py-8">エラーが発生しました</p>
            ) : notifications.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-8">通知はありません</p>
            ) : (
                <ul className="space-y-2">
                    {feedItems.map((item, i) => {
                        if (isAdFeedMarker(item)) {
                            return <AdFeedItem key={`ad-${i}`} slotId={item.slotId} />
                        }
                        const n = item
                        const link = getNotificationLink(n)
                        const meta = getMetaSummary(n)
                        const card = (
                            <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <NotificationTypeChip type={n.type} />
                                        <p className="font-medium text-sm truncate">{n.title}</p>
                                    </div>
                                    {n.body && (
                                        <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.body}</p>
                                    )}
                                    {meta && (
                                        <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                                            {meta.date && (
                                                <span className="flex items-center gap-0.5">
                                                    <Calendar className="h-3 w-3" />
                                                    {meta.date}
                                                </span>
                                            )}
                                            {meta.label && <span>{meta.label}</span>}
                                            {link && <ExternalLink className="h-3 w-3 text-blue-400" />}
                                        </div>
                                    )}
                                    <p className="text-xs text-gray-400 mt-1">
                                        {new Date(n.createdAt).toLocaleString('ja-JP')}
                                    </p>
                                </div>
                                {!n.isRead && (
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            markAsRead.mutate(n.id)
                                        }}
                                        type="button"
                                        className="text-xs text-blue-600 hover:underline flex-shrink-0 ml-2"
                                    >
                                        既読
                                    </button>
                                )}
                            </div>
                        )

                        return link ? (
                            <li key={n.id}>
                                <Link
                                    to={link}
                                    className={`block border rounded-lg p-3 transition-colors hover:border-blue-300 ${n.isRead ? 'bg-white' : 'bg-blue-50 border-blue-200'}`}
                                    onClick={() => { if (!n.isRead) markAsRead.mutate(n.id) }}
                                >
                                    {card}
                                </Link>
                            </li>
                        ) : (
                            <li
                                key={n.id}
                                className={`border rounded-lg p-3 ${n.isRead ? 'bg-white' : 'bg-blue-50 border-blue-200'}`}
                            >
                                {card}
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}

// ============================================================
// メタデータ → 表示ラベル・日付・リンクの抽出ヘルパー
// ============================================================

/** schedule 系通知タイプ */
const SCHEDULE_TYPES = new Set([
    'WAITLIST_PROMOTED',
    'SCHEDULE_CANCELLED',
    'PARTICIPATION_CONFIRMED',
    'SCHEDULE_REMINDER',
    'SAME_DAY_CANCELLATION',
    'PAID_CANCELLATION',
    'PARTICIPATION_REMOVED_BY_ADMIN',
    'ACTIVITY_CANCELLED',
])

const PAYMENT_TYPES = new Set(['PAYMENT_REMINDER'])
const COMMUNITY_TYPES = new Set(['INVITE_ACCEPTED', 'JOIN_REQUEST', 'JOIN_APPROVED', 'MEMBER_REMOVED'])
const CHAT_TYPES = new Set(['MENTION', 'DM', 'REPLY'])
const ANNOUNCEMENT_TYPES = new Set(['ANNOUNCEMENT'])

function getMetaSummary(n: NotificationItem): { label?: string; date?: string } | null {
    const m = n.metadata
    if (!m) return null

    if (SCHEDULE_TYPES.has(n.type) || PAYMENT_TYPES.has(n.type)) {
        const parts: string[] = []
        if (typeof m.activityTitle === 'string') parts.push(m.activityTitle)
        if (typeof m.communityName === 'string') parts.push(m.communityName)
        if (PAYMENT_TYPES.has(n.type) && typeof m.amount === 'number') parts.push(`¥${m.amount.toLocaleString()}`)
        const date = typeof m.scheduleDate === 'string' ? formatScheduleDate(m.scheduleDate) : undefined
        return parts.length || date ? { label: parts.join(' / ') || undefined, date } : null
    }

    if (COMMUNITY_TYPES.has(n.type)) {
        const name = typeof m.communityName === 'string' ? m.communityName : undefined
        return name ? { label: name } : null
    }

    if (CHAT_TYPES.has(n.type)) {
        const parts: string[] = []
        if (typeof m.channelName === 'string') parts.push(`#${m.channelName}`)
        if (typeof m.senderName === 'string') parts.push(m.senderName)
        return parts.length ? { label: parts.join(' / ') } : null
    }

    if (ANNOUNCEMENT_TYPES.has(n.type)) {
        const name = typeof m.communityName === 'string' ? m.communityName : undefined
        return name ? { label: name } : null
    }

    return null
}

function getNotificationLink(n: NotificationItem): string | null {
    const m = n.metadata

    if (SCHEDULE_TYPES.has(n.type) || PAYMENT_TYPES.has(n.type)) {
        const communityId = unwrapStr(m?.communityId)
        const activityId = unwrapStr(m?.activityId)
        if (communityId && activityId) {
            return `/communities/${communityId}/activities/${activityId}`
        }
        return null
    }

    if (COMMUNITY_TYPES.has(n.type)) {
        const cid = unwrapStr(m?.communityId) ?? n.referenceId
        return cid ? `/communities/${cid}` : null
    }

    if (ANNOUNCEMENT_TYPES.has(n.type)) {
        const cid = unwrapStr(m?.communityId)
        return cid ? `/communities/${cid}` : null
    }

    // チャット系は現状チャットページへの直リンクがないのでスキップ
    return null
}

/** metadata値を文字列として取り出す（ValueObject形式 {value: "..."} にも対応） */
function unwrapStr(v: unknown): string | null {
    if (typeof v === 'string') return v
    if (v && typeof v === 'object' && 'value' in v && typeof (v as { value: unknown }).value === 'string') {
        return (v as { value: string }).value
    }
    return null
}

function formatScheduleDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString('ja-JP', {
            month: 'short',
            day: 'numeric',
            weekday: 'short',
        })
    } catch {
        return iso
    }
}

/** 通知タイプの小さなチップ表示 (#55: 全通知タイプの日本語マッピング) */
function NotificationTypeChip({ type }: { type: string }) {
    const config: Record<string, { label: string; color: string }> = {
        // チャット系
        MENTION: { label: 'メンション', color: 'bg-purple-100 text-purple-700' },
        DM: { label: 'DM', color: 'bg-green-100 text-green-700' },
        REPLY: { label: '返信', color: 'bg-teal-100 text-teal-700' },
        // コミュニティ系
        ANNOUNCEMENT: { label: 'お知らせ', color: 'bg-blue-100 text-blue-700' },
        INVITE_ACCEPTED: { label: '招待承認', color: 'bg-indigo-100 text-indigo-700' },
        JOIN_REQUEST: { label: '参加申請', color: 'bg-cyan-100 text-cyan-700' },
        JOIN_APPROVED: { label: '参加承認', color: 'bg-emerald-100 text-emerald-700' },
        MEMBER_REMOVED: { label: 'メンバー除外', color: 'bg-red-100 text-red-700' },
        // アクティビティ系
        WAITLIST_PROMOTED: { label: '繰上げ', color: 'bg-yellow-100 text-yellow-700' },
        SCHEDULE_CANCELLED: { label: '開催取消', color: 'bg-red-100 text-red-700' },
        PARTICIPATION_CONFIRMED: { label: '参加確定', color: 'bg-green-100 text-green-700' },
        SCHEDULE_REMINDER: { label: 'リマインド', color: 'bg-sky-100 text-sky-700' },
        PAYMENT_REMINDER: { label: '支払い', color: 'bg-orange-100 text-orange-700' },
        PAID_CANCELLATION: { label: '返金', color: 'bg-pink-100 text-pink-700' },
        SAME_DAY_CANCELLATION: { label: '当日キャンセル', color: 'bg-rose-100 text-rose-700' },
        // 問い合わせ系
        INQUIRY_REPLY: { label: '問い合わせ返信', color: 'bg-amber-100 text-amber-700' },
    }
    const c = config[type] ?? { label: type, color: 'bg-gray-100 text-gray-600' }

    return (
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${c.color}`}>
            {c.label}
        </span>
    )
}
