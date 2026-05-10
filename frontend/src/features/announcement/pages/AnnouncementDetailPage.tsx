import { announcementApi } from '@/features/announcement/api/announcementApi'
import { useAnnouncement } from '@/features/announcement/hooks/useAnnouncementQueries'
import {
    useToggleAnnouncementBookmark,
    useToggleAnnouncementLike
} from '@/features/announcement/hooks/useAnnouncementSocialQueries'
import { CommentSection } from '@/features/home/components/CommentSection'
import { ImagePreviewGallery } from '@/shared/components/ui/ImagePreviewModal'
import { useRedirectOnNotFound } from '@/shared/hooks/useRedirectOnNotFound'
import { announcementFeedKeys } from '@/shared/lib/queryKeys'
import { formatJapaneseDateTime } from '@/shared/utils/dateFormat'
import { useQueryClient } from '@tanstack/react-query'
import { Eye, MessageCircle, Paperclip } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
export function AnnouncementDetailPage() {
    const { id } = useParams<{ id: string }>()
    const qc = useQueryClient()
    const { data: announcement, isLoading, error: announcementError } = useAnnouncement(id!)
    useRedirectOnNotFound(announcementError)
    const likeMutation = useToggleAnnouncementLike()
    const bookmarkMutation = useToggleAnnouncementBookmark()
    const markedRef = useRef(false)

    // #7: 詳細画面開封時に既読を自動付与（冪等API）
    useEffect(() => {
        if (!id || markedRef.current) return
        markedRef.current = true
        announcementApi.markAsRead(id).then(() => {
            qc.invalidateQueries({ queryKey: announcementFeedKeys.all })
        })
    }, [id, qc])

    if (isLoading) return <div className="p-6 text-center text-gray-500">読み込み中...</div>
    if (!announcement) return <div className="p-6 text-center text-red-500">お知らせが見つかりません</div>

    const imageAttachments = announcement.attachments?.filter((a) => a.mimeType.startsWith('image/')) ?? []

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-2">{announcement.title}</h1>

            {/* C-09: 投稿者名 · コミュニティ名 */}
            <p className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                {announcement.authorName && <span>{announcement.authorName}</span>}
                {announcement.authorName && announcement.communityName && <span>·</span>}
                {announcement.communityName && announcement.communityId && (
                    <Link
                        to={`/communities/${announcement.communityId}`}
                        className="text-blue-600 hover:underline"
                    >
                        {announcement.communityName}
                    </Link>
                )}
            </p>

            {/* C-06: 日本語日時形式で表示 */}
            <p className="text-xs text-gray-400 mb-4">
                {formatJapaneseDateTime(announcement.createdAt)}
            </p>

            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700">
                {announcement.content}
            </div>

            {/* #4: 開催日時リンク */}
            {announcement.activityId && announcement.scheduleInfo && (
                <div className="mt-3 flex items-center gap-1 text-sm">
                    <span className="text-gray-600">開催日時：</span>
                    {announcement.activityDeleted ? (
                        <span className="text-gray-400 line-through">
                            {announcement.scheduleInfo.date} {announcement.scheduleInfo.startTime}〜{announcement.scheduleInfo.endTime}
                        </span>
                    ) : (
                        <Link
                            to={`/communities/${announcement.communityId}/activities/${announcement.activityId}?schedule=${announcement.scheduleInfo.scheduleId}`}
                            className="text-blue-600 hover:text-blue-700 hover:underline"
                        >
                            {announcement.scheduleInfo.date} {announcement.scheduleInfo.startTime}〜{announcement.scheduleInfo.endTime}
                        </Link>
                    )}
                    {announcement.activityDeleted && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">削除済み</span>
                    )}
                    {!announcement.activityDeleted && announcement.scheduleInfo.scheduleStatus === 'CANCELLED' && (
                        <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">中止</span>
                    )}
                </div>
            )}
            {/* activityIdはあるがscheduleInfoがない場合（全スケジュール削除済み等） */}
            {announcement.activityId && !announcement.scheduleInfo && announcement.activityDeleted && (
                <div className="mt-3 flex items-center gap-1 text-sm">
                    <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">削除済みのアクティビティ</span>
                </div>
            )}

            {/* #2: 添付画像（タップで拡大表示） */}
            {imageAttachments.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                    <ImagePreviewGallery
                        images={imageAttachments.map((att) => ({ src: att.fileUrl }))}
                        className="h-48 w-auto max-w-full rounded-lg object-cover border cursor-pointer"
                    />
                </div>
            )}

            {/* #9: 既読数 + いいね + コメント + ブックマーク */}
            <div className="mt-4 flex items-center gap-4 border-t pt-3">
                <button
                    type="button"
                    onClick={() => likeMutation.mutate(id!)}
                    disabled={likeMutation.isPending}
                    className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <span className={`text-base leading-none ${'isLiked' in announcement && announcement.isLiked ? '' : 'grayscale opacity-40'}`}>👍</span>
                    {'likeCount' in announcement && (announcement as { likeCount: number }).likeCount > 0 && (
                        <span className={'isLiked' in announcement && announcement.isLiked ? 'text-blue-500' : ''}>{(announcement as { likeCount: number }).likeCount}</span>
                    )}
                </button>

                <span className="flex items-center gap-1 text-sm text-gray-500">
                    <MessageCircle className="h-4 w-4" />
                    {'commentCount' in announcement && (announcement as { commentCount: number }).commentCount > 0 && (
                        <span>{(announcement as { commentCount: number }).commentCount}</span>
                    )}
                </span>

                {'readCount' in announcement && typeof (announcement as { readCount?: number }).readCount === 'number' && (
                    <span className="flex items-center gap-1 text-sm text-gray-400">
                        <Eye className="h-4 w-4" />
                        {(announcement as { readCount: number }).readCount}
                    </span>
                )}

                <button
                    type="button"
                    onClick={() => bookmarkMutation.mutate(id!)}
                    disabled={bookmarkMutation.isPending}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-500 transition-colors ml-auto"
                >
                    <Paperclip className={`h-4 w-4 ${'isBookmarked' in announcement && announcement.isBookmarked ? 'text-blue-500' : ''}`} />
                </button>
            </div>

            {/* コメントセクション */}
            <div className="mt-4">
                <CommentSection announcementId={id!} />
            </div>
        </div>
    )
}
