import { AdBanner } from '@/features/ads/components/AdBanner'
import { CommunityCard } from '@/features/community/components/CommunityCard'
import { useCommunities, useSubCommunities } from '@/features/community/hooks/useCommunityQueries'
import { FloatingActionButton } from '@/shared/components/FloatingActionButton'
import type { CommunityListItem } from '@/shared/types/api'
import { Bookmark, ChevronDown, ChevronRight, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * CommunityListPage — チャットリスト風コミュニティ一覧
 *
 * 親コミュニティのみトップレベルに表示。
 * 子コミュニティがある場合は展開ボタンでツリー形式表示。
 */
export function CommunityListPage() {
    const navigate = useNavigate()
    const { data, isLoading } = useCommunities()
    const [bookmarkOnly, setBookmarkOnly] = useState(false)

    const allCommunities = data?.communities ?? []
    const filtered = bookmarkOnly ? allCommunities.filter(c => c.bookmarked) : allCommunities

    // 親コミュニティのみ（parentId === null）
    const parentCommunities = filtered.filter(c => c.parentId === null)
    // 子コミュニティのマップ（parentId → children[]）
    const childrenByParentId = new Map<string, CommunityListItem[]>()
    for (const c of filtered) {
        if (c.parentId) {
            const list = childrenByParentId.get(c.parentId) ?? []
            list.push(c)
            childrenByParentId.set(c.parentId, list)
        }
    }

    return (
        <div className="flex flex-col h-full">
            {/* Bookmark filter */}
            {allCommunities.length > 0 && (
                <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setBookmarkOnly(!bookmarkOnly)}
                        className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${bookmarkOnly
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                    >
                        <Bookmark size={12} className={bookmarkOnly ? 'fill-yellow-400 text-yellow-400' : ''} />
                        ブックマーク
                    </button>
                </div>
            )}

            {/* [3] コミュニティ一覧 — ブックマークボタン直下 */}
            <AdBanner slotId="community-list-bookmark-below" />

            {/* List */}
            {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                </div>
            ) : parentCommunities.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 px-6">
                    <p className="text-sm mb-4">{bookmarkOnly ? 'コミュニティが見つかりませんでした。' : 'まだコミュニティに参加していません'}</p>
                    <button
                        onClick={() => navigate('/communities/search')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                    >
                        コミュニティを探す
                    </button>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto">
                    {parentCommunities.map((c) => {
                        const hasChildren = childrenByParentId.has(c.id)
                        return (
                            <ParentCommunityRow
                                key={c.id}
                                community={c}
                                hasChildren={hasChildren}
                                localChildren={childrenByParentId.get(c.id) ?? []}
                                onNavigate={(id) => navigate(`/communities/${id}`)}
                            />
                        )
                    })}
                </div>
            )}

            {/* #52: FAB — 検索 + 作成 */}
            <FloatingActionButton
                variant="split"
                actions={[
                    { icon: <Search size={20} />, label: '検索', onClick: () => navigate('/communities/search') },
                    { icon: <Plus size={20} />, label: '作成', onClick: () => navigate('/communities/create') },
                ]}
            />
        </div>
    )
}

/** 親コミュニティ行 + 展開ボタン + 子コミュニティツリー */
function ParentCommunityRow({
    community,
    hasChildren,
    localChildren,
    onNavigate,
}: {
    community: CommunityListItem
    hasChildren: boolean
    localChildren: CommunityListItem[]
    onNavigate: (id: string) => void
}) {
    const [expanded, setExpanded] = useState(false)
    // API からも子コミュニティを取得（展開時のみ、ユーザーが未参加の子も表示するため）
    const { data: subData } = useSubCommunities(community.id, expanded || hasChildren)
    const apiChildren = subData?.children ?? []

    const showExpander = hasChildren || apiChildren.length > 0

    return (
        <div>
            <div className="flex items-center">
                {/* 展開ボタン */}
                {showExpander ? (
                    <button
                        type="button"
                        onClick={() => setExpanded(!expanded)}
                        className="pl-2 pr-1 py-3 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        {expanded
                            ? <ChevronDown size={16} />
                            : <ChevronRight size={16} />
                        }
                    </button>
                ) : (
                    <div className="w-7" /> // スペーサー
                )}
                <div className="flex-1 min-w-0">
                    <CommunityCard
                        community={community}
                        onClick={() => onNavigate(community.id)}
                    />
                </div>
            </div>

            {/* 子コミュニティ ツリー展開 */}
            {expanded && (
                <div className="ml-7 border-l-2 border-gray-100">
                    {apiChildren.length > 0 ? (
                        // W6-01: API から取得したサブコミュニティは全て CommunityCard で表示（ブックマークも可能）
                        apiChildren.map((child) => (
                            <CommunityCard
                                key={child.id}
                                community={child}
                                onClick={() => onNavigate(child.id)}
                            />
                        ))
                    ) : localChildren.length > 0 ? (
                        localChildren.map((child) => (
                            <CommunityCard
                                key={child.id}
                                community={child}
                                onClick={() => onNavigate(child.id)}
                            />
                        ))
                    ) : (
                        <p className="px-4 py-2 text-xs text-gray-400">サブコミュニティはありません</p>
                    )}
                </div>
            )}
        </div>
    )
}
