import { AdBanner } from '@/features/ads/components/AdBanner'
import { ChatSearchBar } from '@/features/chat/components/ChatSearchBar'
import { CommunityChannelTree } from '@/features/chat/components/CommunityChannelTree'
import { useCommunityChannelTree } from '@/features/chat/hooks/useChatQueries'
import type { ActivityCommunityTreeNode, CommunityTreeNode, DMTreeItem } from '@/shared/types/api'
import { Loader2, MessageCircle } from 'lucide-react'
import { useMemo, useState } from 'react'

/** 再帰的にコミュニティツリーをフィルタ */
function filterCommunityTree(nodes: CommunityTreeNode[], q: string): CommunityTreeNode[] {
    return nodes.reduce<CommunityTreeNode[]>((acc, node) => {
        const nameMatch = node.name.toLowerCase().includes(q)
        const msgMatch = node.lastMessage?.content.toLowerCase().includes(q)
        const filteredChildren = filterCommunityTree(node.children, q)
        if (nameMatch || msgMatch || filteredChildren.length > 0) {
            acc.push({
                ...node,
                children: filteredChildren,
            })
        }
        return acc
    }, [])
}

/** アクティビティツリーを再帰的にフィルタ */
function filterActivityTree(nodes: ActivityCommunityTreeNode[], q: string): ActivityCommunityTreeNode[] {
    return nodes.reduce<ActivityCommunityTreeNode[]>((acc, node) => {
        const communityMatch = node.communityName.toLowerCase().includes(q)
        const filteredActivities = node.activities.filter(
            (a) =>
                a.name.toLowerCase().includes(q) ||
                a.lastMessage?.content.toLowerCase().includes(q),
        )
        const filteredChildren = filterActivityTree(node.children, q)
        if (communityMatch || filteredActivities.length > 0 || filteredChildren.length > 0) {
            acc.push({
                ...node,
                activities: communityMatch ? node.activities : filteredActivities,
                children: filteredChildren,
                unreadCount: communityMatch
                    ? node.unreadCount
                    : filteredActivities.reduce((sum, a) => sum + a.unreadCount, 0) +
                    filteredChildren.reduce((sum, c) => sum + c.unreadCount, 0),
            })
        }
        return acc
    }, [])
}

function filterDM(items: DMTreeItem[], q: string): DMTreeItem[] {
    return items.filter(
        (item) =>
            item.participants.some((p) => p.toLowerCase().includes(q)) ||
            item.lastMessage?.content.toLowerCase().includes(q),
    )
}

/**
 * ChatListPage — チャット一覧画面
 *
 * BottomNav「チャット」タブのランディング。
 * W5-25: コミュニティツリー形式で表示＋未読バッジ付き。
 */
export function ChatListPage() {
    const { data, isLoading, error } = useCommunityChannelTree()
    const [search, setSearch] = useState('')

    const filtered = useMemo(() => {
        if (!data) return null
        const q = search.toLowerCase().trim()
        if (!q) return data
        return {
            communities: filterCommunityTree(data.communities, q),
            activityTree: filterActivityTree(data.activityTree, q),
            dm: filterDM(data.dm, q),
        }
    }, [data, search])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <MessageCircle className="w-10 h-10 mb-2" />
                <p className="text-sm text-red-500">読み込みに失敗しました</p>
            </div>
        )
    }

    const { communities = [], activityTree = [], dm = [] } = filtered ?? {}
    const isEmpty = communities.length === 0 && activityTree.length === 0 && dm.length === 0

    return (
        <div className="flex flex-col min-h-full">
            {/* 検索バー */}
            <ChatSearchBar value={search} onChange={setSearch} />

            {/* [13] チャット検索バー直下 */}
            <AdBanner slotId="chat-list-search-below" />

            {isEmpty && !search ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <MessageCircle className="w-10 h-10 mb-2" />
                    <p className="text-sm">チャットはまだありません</p>
                </div>
            ) : isEmpty && search ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <p className="text-sm">「{search}」に一致するチャットはありません</p>
                </div>
            ) : (
                <CommunityChannelTree communities={communities} activityTree={activityTree} dm={dm} />
            )}
        </div>
    )
}
