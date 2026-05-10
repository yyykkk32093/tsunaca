import { useAuth } from '@/app/providers/AuthProvider'
import { useDeleteAnnouncement } from '@/features/announcement/hooks/useAnnouncementQueries'
import { useToggleAnnouncementBookmark, useToggleAnnouncementLike } from '@/features/announcement/hooks/useAnnouncementSocialQueries'
import { useMyRole } from '@/features/community/hooks/useCommunityQueries'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import { ImagePreviewGallery, SingleImagePreview } from '@/shared/components/ui/ImagePreviewModal'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip'
import type { AnnouncementFeedItem } from '@/shared/types/api'
import { formatAbsoluteDateTime, formatRelativeTime } from '@/shared/utils/dateFormat'
import { Eye, MessageCircle, MoreHorizontal, Paperclip } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

interface FeedCardProps {
    item: AnnouncementFeedItem
}

function getInitial(name: string | null): string {
    if (!name) return '?'
    return name.charAt(0).toUpperCase()
}

export function FeedCard({ item }: FeedCardProps) {
    const navigate = useNavigate()
    const [menuOpen, setMenuOpen] = useState(false)

    const likeMutation = useToggleAnnouncementLike()
    const bookmarkMutation = useToggleAnnouncementBookmark()
    const deleteMutation = useDeleteAnnouncement(item.communityId)
    const { user } = useAuth()
    const { isAdminOrAbove } = useMyRole(item.communityId)
    const isAuthor = !!user && user.userId === item.authorId

    const handleToggleBookmark = () => {
        bookmarkMutation.mutate(item.id)
        setMenuOpen(false)
    }

    const handleEdit = () => {
        navigate(`/communities/${item.communityId}/announcements/new?edit=${item.id}`)
        setMenuOpen(false)
    }

    const handleDelete = () => {
        setMenuOpen(false)
        if (!confirm('このお知らせを削除しますか？')) return
        deleteMutation.mutate(item.id, {
            onError: (err: unknown) => {
                const message = err instanceof Error ? err.message : '削除に失敗しました'
                alert(message)
            },
        })
    }

    /** #6: お知らせ詳細画面へ遷移 */
    const goToDetail = () => {
        navigate(`/announcements/${item.id}`)
    }

    const imageAttachments = item.attachments?.filter((a) => a.mimeType.startsWith('image/')) ?? []

    return (
        <article className="px-4 py-3">
            {/* ヘッダー: アバター + 名前 + 時間 + メニュー */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                    {/* #2: プロフィール画像クリックで拡大表示 */}
                    {item.authorAvatarUrl ? (
                        <SingleImagePreview src={item.authorAvatarUrl} alt={item.authorName ?? 'ユーザー'}>
                            <Avatar className="h-8 w-8">
                                <AvatarImage
                                    src={item.authorAvatarUrl}
                                    alt={item.authorName ?? 'ユーザー'}
                                />
                                <AvatarFallback className="text-xs">
                                    {getInitial(item.authorName)}
                                </AvatarFallback>
                            </Avatar>
                        </SingleImagePreview>
                    ) : (
                        <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                                {getInitial(item.authorName)}
                            </AvatarFallback>
                        </Avatar>
                    )}
                    <div className="min-w-0">
                        <p className="text-sm leading-tight">
                            <span className="font-semibold">{item.authorName ?? '名前なし'}</span>
                            <span className="text-gray-500"> in </span>
                            <Link
                                to={`/communities/${item.communityId}`}
                                className="font-semibold hover:underline"
                            >
                                {item.communityName}
                            </Link>
                        </p>
                        {/* #3: 相対時刻 + ツールチップで絶対日時 */}
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <p className="text-xs text-gray-400 cursor-default">{formatRelativeTime(item.createdAt)}</p>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{formatAbsoluteDateTime(item.createdAt)}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>

                {/* 3ドットメニュー (#7: 「既読にする」削除済み) */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                        <MoreHorizontal className="h-5 w-5" />
                    </button>
                    {menuOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                            <div className="absolute right-0 top-8 z-20 w-44 rounded-lg border bg-white py-1 shadow-md">
                                <button
                                    type="button"
                                    onClick={handleToggleBookmark}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                                >
                                    {item.isBookmarked ? 'クリップ解除' : 'クリップする'}
                                </button>
                                {isAdminOrAbove && (
                                    <button
                                        type="button"
                                        onClick={handleEdit}
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                                    >
                                        編集する
                                    </button>
                                )}
                                {isAuthor && (
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        disabled={deleteMutation.isPending}
                                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                                    >
                                        {deleteMutation.isPending ? '削除中…' : '削除する'}
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* #6: 本文クリックで詳細画面へ遷移 / #8: 4行制限 */}
            <button
                type="button"
                onClick={goToDetail}
                className="mt-2.5 pl-[42px] text-left w-full"
            >
                {item.title && (
                    <h3 className="text-sm font-semibold leading-snug">{item.title}</h3>
                )}
                <p className="mt-1 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap line-clamp-4">
                    {item.content}
                </p>
            </button>

            {/* #2: 添付画像カルーセル（タップで拡大表示） */}
            {imageAttachments.length > 0 && (
                <div className="mt-2 pl-[42px]">
                    <div className="flex gap-2 overflow-x-auto pb-1" onClick={goToDetail}>
                        <ImagePreviewGallery
                            images={imageAttachments.map((att) => ({ src: att.fileUrl }))}
                        />
                    </div>
                </div>
            )}

            {/* いいね＋コメント＋既読数＋ブックマーク アクションバー */}
            <div className="mt-2 pl-[42px] flex items-center gap-4">
                <button
                    type="button"
                    onClick={() => likeMutation.mutate(item.id)}
                    disabled={likeMutation.isPending}
                    className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <span className={`text-base leading-none ${item.isLiked ? '' : 'grayscale opacity-40'}`}>👍</span>
                    {item.likeCount > 0 && <span className={item.isLiked ? 'text-blue-500' : ''}>{item.likeCount}</span>}
                </button>

                {/* #6: コメントボタンも詳細画面へ遷移 */}
                <button
                    type="button"
                    onClick={goToDetail}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-500 transition-colors"
                >
                    <MessageCircle className="h-4 w-4" />
                    {item.commentCount > 0 && <span>{item.commentCount}</span>}
                </button>

                {/* #9: 既読数表示 */}
                {'readCount' in item && typeof item.readCount === 'number' && (
                    <span className="flex items-center gap-1 text-sm text-gray-400">
                        <Eye className="h-4 w-4" />
                        {item.readCount}
                    </span>
                )}

                {/* #4: アクティビティ詳細へのリンク（キャンセル・削除済みはステータス表示） */}
                {item.activityId && item.activityDeleted && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">削除済み</span>
                )}
                {item.activityId && !item.activityDeleted && item.scheduleInfo?.scheduleStatus === 'CANCELLED' && (
                    <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">中止</span>
                )}
                {item.activityId && !item.activityDeleted && item.scheduleInfo?.scheduleStatus !== 'CANCELLED' && (
                    <button
                        type="button"
                        onClick={() => navigate(`/communities/${item.communityId}/activities/${item.activityId}${item.scheduleInfo ? `?schedule=${item.scheduleInfo.scheduleId}` : ''}`)}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                    >
                        参加する
                    </button>
                )}

                <button
                    type="button"
                    onClick={() => bookmarkMutation.mutate(item.id)}
                    disabled={bookmarkMutation.isPending}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-500 transition-colors ml-auto"
                >
                    <Paperclip
                        className={`h-4 w-4 ${item.isBookmarked ? 'text-blue-500' : ''}`}
                    />
                </button>
            </div>

            {/* 未読インジケーター */}
            {!item.isRead && (
                <div className="mt-2 pl-[42px]">
                    <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                </div>
            )}
        </article>
    )
}
