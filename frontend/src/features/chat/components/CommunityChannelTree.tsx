import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import { Badge } from '@/shared/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/components/ui/collapsible'
import { cn } from '@/shared/lib/utils'
import type { ActivityCommunityTreeNode, ActivityTreeNode, CommunityTreeNode, DMTreeItem } from '@/shared/types/api'
import { ChevronDown, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

/** 未読バッジ */
function UnreadBadge({ count }: { count: number }) {
    if (count <= 0) return null
    return (
        <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-[10px] font-bold">
            {count > 99 ? '99+' : count}
        </Badge>
    )
}

/** 相対時刻表示 */
function formatRelativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime()
    const min = Math.floor(diff / 60_000)
    if (min < 1) return '今'
    if (min < 60) return `${min}分前`
    const hours = Math.floor(min / 60)
    if (hours < 24) return `${hours}時間前`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}日前`
    return new Date(iso).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
}

/** アクティビティノード */
function ActivityNode({ node }: { node: ActivityTreeNode }) {
    if (!node.channelId) return null
    const timeLabel = node.lastMessage ? formatRelativeTime(node.lastMessage.createdAt) : ''
    const displayName = node.scheduleDate && node.scheduleStartTime
        ? `${node.name}：${node.scheduleDate} ${node.scheduleStartTime}〜${node.scheduleEndTime ?? ''}`
        : node.name

    return (
        <Link
            to={`/chats/${node.channelId}`}
            className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
            <MessageCircle className="h-4 w-4 text-gray-400 shrink-0" />
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm text-gray-700 truncate">{displayName}</span>
                    {timeLabel && <span className="text-xs text-gray-400 shrink-0">{timeLabel}</span>}
                </div>
                {node.lastMessage && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{node.lastMessage.content}</p>
                )}
            </div>
            <UnreadBadge count={node.unreadCount} />
        </Link>
    )
}

/** コミュニティノード（再帰的に子を展開） */
function CommunityNode({ node, depth = 0 }: { node: CommunityTreeNode; depth?: number }) {
    const [open, setOpen] = useState(true)
    const hasChildren = node.children.length > 0
    const timeLabel = node.lastMessage ? formatRelativeTime(node.lastMessage.createdAt) : ''

    return (
        <div className={cn(depth > 0 && 'ml-3 border-l-2 border-gray-100')}>
            <Collapsible open={open} onOpenChange={setOpen}>
                <div className="flex items-center">
                    {/* コミュニティチャンネルへのリンク */}
                    {node.channelId ? (
                        <Link
                            to={`/chats/${node.channelId}`}
                            className="flex items-center gap-3 flex-1 min-w-0 px-3 py-2.5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                        >
                            <Avatar className="h-9 w-9 shrink-0">
                                <AvatarImage src={node.logoUrl ?? undefined} alt={node.name} />
                                <AvatarFallback className="text-xs font-medium bg-gray-200">
                                    {node.name.slice(0, 2)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className="text-sm font-semibold text-gray-900 truncate">
                                        {node.name}
                                    </span>
                                    {timeLabel && (
                                        <span className="text-xs text-gray-400 shrink-0">{timeLabel}</span>
                                    )}
                                </div>
                                {node.lastMessage && (
                                    <p className="text-xs text-gray-400 truncate mt-0.5">
                                        {node.lastMessage.content}
                                    </p>
                                )}
                            </div>
                            <UnreadBadge count={node.unreadCount} />
                        </Link>
                    ) : (
                        <div className="flex items-center gap-3 flex-1 min-w-0 px-3 py-2.5">
                            <Avatar className="h-9 w-9 shrink-0">
                                <AvatarFallback className="text-xs font-medium bg-gray-200">
                                    {node.name.slice(0, 2)}
                                </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-semibold text-gray-900 truncate">
                                {node.name}
                            </span>
                            <UnreadBadge count={node.unreadCount} />
                        </div>
                    )}

                    {/* 展開トグル */}
                    {hasChildren && (
                        <CollapsibleTrigger className="p-2 hover:bg-gray-100 rounded-md mr-1">
                            <ChevronDown
                                className={cn(
                                    'h-4 w-4 text-gray-400 transition-transform duration-200',
                                    open && 'rotate-180',
                                )}
                            />
                        </CollapsibleTrigger>
                    )}
                </div>

                {hasChildren && (
                    <CollapsibleContent>
                        {node.children.map((child) => (
                            <CommunityNode key={child.communityId} node={child} depth={depth + 1} />
                        ))}
                    </CollapsibleContent>
                )}
            </Collapsible>
        </div>
    )
}

/** アクティビティコミュニティツリーノード（色付きヘッダー + 再帰展開） */
function ActivityCommunityNode({
    node,
    depth = 0,
}: {
    node: ActivityCommunityTreeNode
    depth?: number
}) {
    const [open, setOpen] = useState(true)
    const hasContent = node.activities.length > 0 || node.children.length > 0

    return (
        <div className={cn(depth > 0 && 'ml-3')}>
            <Collapsible open={open} onOpenChange={setOpen}>
                {/* コミュニティ名ヘッダー（色付き） */}
                <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 transition-colors rounded-md mx-1">
                    <Avatar className="h-6 w-6 shrink-0">
                        <AvatarImage
                            src={node.communityLogoUrl ?? undefined}
                            alt={node.communityName}
                        />
                        <AvatarFallback className="text-[10px] font-medium bg-gray-300 text-gray-600">
                            {node.communityName.slice(0, 2)}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-bold text-gray-700 truncate flex-1 text-left">
                        {node.communityName}
                    </span>
                    <UnreadBadge count={node.unreadCount} />
                    <ChevronDown
                        className={cn(
                            'h-3.5 w-3.5 text-gray-400 transition-transform duration-200 shrink-0',
                            open && 'rotate-180',
                        )}
                    />
                </CollapsibleTrigger>

                {hasContent && (
                    <CollapsibleContent>
                        {/* アクティビティ一覧 */}
                        {node.activities.map((act) => (
                            <ActivityNode key={act.activityId} node={act} />
                        ))}
                        {/* 子コミュニティ */}
                        {node.children.map((child) => (
                            <ActivityCommunityNode
                                key={child.communityId}
                                node={child}
                                depth={depth + 1}
                            />
                        ))}
                    </CollapsibleContent>
                )}
            </Collapsible>
        </div>
    )
}

/** DM ノード */
function DMNode({ item }: { item: DMTreeItem }) {
    const timeLabel = item.lastMessage ? formatRelativeTime(item.lastMessage.createdAt) : ''
    const name = item.participants.filter((p) => p !== 'me').join(', ') || 'DM'

    return (
        <Link
            to={`/chats/${item.channelId}`}
            className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
            <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="text-xs font-medium bg-gray-200">
                    {name.slice(0, 2)}
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-gray-900 truncate">{name}</span>
                    {timeLabel && <span className="text-xs text-gray-400 shrink-0">{timeLabel}</span>}
                </div>
                {item.lastMessage && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{item.lastMessage.content}</p>
                )}
            </div>
            <UnreadBadge count={item.unreadCount} />
        </Link>
    )
}

/** CommunityChannelTree — チャットツリー全体 */
export function CommunityChannelTree({
    communities,
    activityTree,
    dm,
}: {
    communities: CommunityTreeNode[]
    activityTree: ActivityCommunityTreeNode[]
    dm: DMTreeItem[]
}) {
    return (
        <div className="flex-1">
            {/* Community セクション */}
            {communities.length > 0 && (
                <div>
                    <div className="px-4 py-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Community
                        </span>
                    </div>
                    {communities.map((node) => (
                        <CommunityNode key={node.communityId} node={node} />
                    ))}
                </div>
            )}

            {/* Activity セクション */}
            {activityTree.length > 0 && (
                <div>
                    <div className="px-4 py-2 mt-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Activity
                        </span>
                    </div>
                    {activityTree.map((node) => (
                        <ActivityCommunityNode key={node.communityId} node={node} />
                    ))}
                </div>
            )}

            {/* DM セクション */}
            {dm.length > 0 && (
                <div>
                    <div className="px-4 py-2 mt-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            DirectMessage
                        </span>
                    </div>
                    {dm.map((item) => (
                        <DMNode key={item.channelId} item={item} />
                    ))}
                </div>
            )}
        </div>
    )
}
