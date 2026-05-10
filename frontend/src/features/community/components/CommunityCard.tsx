import { useToggleBookmark } from '@/features/community/hooks/useCommunityQueries'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import { Bookmark } from 'lucide-react'

/**
 * CommunityCard の表示に必要なフィールドだけを規定。
 * W6-01: CommunityListItem と SubCommunityListItem の両方を受け付けるよう二ケース共通部分を抽出。
 */
export interface CommunityCardItem {
    id: string
    name: string
    description: string | null
    logoUrl: string | null
    latestAnnouncementTitle: string | null
    latestAnnouncementAt: string | null
    bookmarked: boolean
}

interface CommunityCardProps {
    community: CommunityCardItem
    onClick: () => void
}

/**
 * CommunityCard — チャットリスト風のコミュニティ行コンポーネント
 *
 * [Avatar] コミュニティ名            ⭐ 相対時刻
 *          最新お知らせタイトル
 */
export function CommunityCard({ community, onClick }: CommunityCardProps) {
    const initial = community.name.charAt(0)
    const relativeTime = community.latestAnnouncementAt
        ? formatRelative(community.latestAnnouncementAt)
        : null
    const toggleBookmark = useToggleBookmark()

    const handleBookmarkClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        toggleBookmark.mutate({ communityId: community.id, bookmarked: community.bookmarked })
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left border-b border-gray-100 last:border-b-0"
        >
            {/* Avatar */}
            <Avatar className="h-12 w-12 shrink-0">
                <AvatarImage src={community.logoUrl ?? undefined} alt={community.name} />
                <AvatarFallback className="bg-blue-100 text-blue-600 font-bold text-lg">
                    {initial}
                </AvatarFallback>
            </Avatar>

            {/* Center: name + latest announcement */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-gray-900 truncate">
                        {community.name}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <span
                            role="button"
                            onClick={handleBookmarkClick}
                            className="p-0.5 rounded hover:bg-gray-200 transition-colors"
                            title={community.bookmarked ? 'ブックマーク解除' : 'ブックマーク'}
                        >
                            <Bookmark
                                size={14}
                                className={community.bookmarked ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                            />
                        </span>
                        {relativeTime && (
                            <span className="text-xs text-gray-400">
                                {relativeTime}
                            </span>
                        )}
                    </div>
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                    {community.latestAnnouncementTitle ?? community.description ?? 'お知らせはまだありません'}
                </p>
            </div>
        </button>
    )
}

// ── 相対時刻ヘルパー ───────────────────────────────

function formatRelative(dateStr: string): string {
    const now = Date.now()
    const target = new Date(dateStr).getTime()
    const diffMs = now - target
    const diffMin = Math.floor(diffMs / 60_000)
    const diffHour = Math.floor(diffMs / 3_600_000)
    const diffDay = Math.floor(diffMs / 86_400_000)

    if (diffMin < 1) return '今'
    if (diffMin < 60) return `${diffMin}分前`
    if (diffHour < 24) return `${diffHour}時間前`
    if (diffDay < 7) return `${diffDay}日前`

    const d = new Date(dateStr)
    return `${d.getMonth() + 1}/${d.getDate()}`
}
