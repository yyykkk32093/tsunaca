import { AdBanner } from '@/features/ads/components/AdBanner'
import { usePublicCommunityDetail } from '@/features/community/hooks/useCommunityQueries'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { useRedirectOnNotFound } from '@/shared/hooks/useRedirectOnNotFound'
import {
    Calendar,
    Clock,
    UserPlus,
    Users,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

/**
 * CommunitySearchDetailPage — 公開コミュニティ詳細画面（未所属者向け）
 *
 * - プロフィールヘッダー（カバー + ロゴ + 名前 + 説明）
 * - メタ情報（メンバー数、エリア、最寄り駅、活動頻度、対象年齢など）
 * - カテゴリ、参加レベル、タグ
 * - 参加ボタン → CommunityJoinPage へ遷移
 */
export function CommunitySearchDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { data: community, isLoading, error: communityError } = usePublicCommunityDetail(id ?? '')
    useRedirectOnNotFound(communityError)

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            </div>
        )
    }

    if (!community) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <p className="text-sm">コミュニティが見つかりませんでした</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto">
                {/* カバー画像 */}
                <div className="relative h-36 bg-gradient-to-br from-blue-500 to-indigo-600">
                    {community.coverUrl && (
                        <img src={community.coverUrl} alt="" className="w-full h-full object-cover" />
                    )}
                    {/* ロゴ */}
                    <div className="absolute -bottom-8 left-4">
                        <div className="w-16 h-16 rounded-full border-4 border-white bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-xl overflow-hidden shadow-lg">
                            {community.logoUrl ? (
                                <img src={community.logoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                community.name.charAt(0)
                            )}
                        </div>
                    </div>
                </div>

                {/* 名前 + 説明 */}
                <div className="pt-12 px-4 pb-4">
                    <h1 className="text-xl font-bold text-gray-900">{community.name}</h1>
                    {community.description && (
                        <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{community.description}</p>
                    )}
                </div>

                {/* メタ情報 */}
                <div className="px-4 pb-4 grid grid-cols-2 gap-2">
                    <MetaItem icon={<Users className="w-4 h-4" />} label="メンバー" value={`${community.memberCount}人`} />
                    {community.activityFrequency && (
                        <MetaItem icon={<Clock className="w-4 h-4" />} label="活動頻度" value={community.activityFrequency} />
                    )}
                    {(community.ageMin != null || community.ageMax != null) && (
                        <MetaItem icon={<Users className="w-4 h-4" />} label="対象年齢" value={`${community.ageMin ?? 0}歳〜${community.ageMax ?? ''}歳`} />
                    )}
                    {community.targetGender.length > 0 && (
                        <MetaItem icon={<Users className="w-4 h-4" />} label="対象性別" value={community.targetGender.join(', ')} />
                    )}
                </div>

                {/* 活動曜日 */}
                {community.activityDays.length > 0 && (
                    <div className="px-4 pb-3">
                        <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            活動曜日
                        </p>
                        <div className="flex gap-1">
                            {community.activityDays.map((day) => (
                                <Badge key={day} variant="outline" className="text-xs">
                                    {day}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* カテゴリ */}
                {community.categories.length > 0 && (
                    <div className="px-4 pb-3">
                        <p className="text-xs font-medium text-gray-500 mb-1">カテゴリ</p>
                        <div className="flex flex-wrap gap-1">
                            {community.categories.map((cat) => (
                                <Badge key={cat.id} variant="secondary" className="text-xs">
                                    {cat.name}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* 参加レベル */}
                {community.participationLevels.length > 0 && (
                    <div className="px-4 pb-3">
                        <p className="text-xs font-medium text-gray-500 mb-1">参加レベル</p>
                        <div className="flex flex-wrap gap-1">
                            {community.participationLevels.map((lv) => (
                                <Badge key={lv.id} variant="secondary" className="text-xs">
                                    {lv.name}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* タグ */}
                {community.tags.length > 0 && (
                    <div className="px-4 pb-3">
                        <p className="text-xs font-medium text-gray-500 mb-1">タグ</p>
                        <div className="flex flex-wrap gap-1">
                            {community.tags.map((tag) => (
                                <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* 参加方式の表示 */}
                <div className="px-4 pb-6">
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                        <UserPlus className="w-3.5 h-3.5" />
                        {community.joinMethod === 'FREE_JOIN' && '自由参加'}
                        {community.joinMethod === 'APPROVAL' && '承認制'}
                        {community.joinMethod === 'INVITATION' && '招待制'}
                        {community.maxMembers && ` · 定員${community.maxMembers}人`}
                    </div>
                </div>
            </div>

            {/* 参加ボタン (INVITATION の場合は非表示) */}
            {community.joinMethod !== 'INVITATION' && (
                <div className="px-4 py-3 border-t border-gray-200 bg-white">
                    <Button
                        onClick={() => navigate(`/communities/search/${id}/join`)}
                        className="w-full"
                    >
                        <UserPlus className="w-4 h-4 mr-1.5" />
                        {community.joinMethod === 'FREE_JOIN'
                            ? 'このコミュニティに参加する'
                            : '参加リクエストを送る'}
                    </Button>
                </div>
            )}

            {/* [5] コミュニティ検索詳細 — 参加リクエストボタン直下 */}
            <AdBanner slotId="community-search-detail-below" />
        </div>
    )
}

function MetaItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
            <span className="text-gray-400 mt-0.5">{icon}</span>
            <div>
                <p className="text-[10px] text-gray-400">{label}</p>
                <p className="text-xs text-gray-700 font-medium">{value}</p>
            </div>
        </div>
    )
}
