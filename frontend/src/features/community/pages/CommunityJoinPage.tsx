import { AdBanner } from '@/features/ads/components/AdBanner'
import {
    useJoinCommunity,
    useJoinRequest,
    usePublicCommunityDetail,
} from '@/features/community/hooks/useCommunityQueries'
import { Button } from '@/shared/components/ui/button'
import { CheckCircle, Loader2, Send, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

/**
 * CommunityJoinPage — コミュニティ参加確認画面
 *
 * - FREE_JOIN: 即参加 → 成功後にコミュニティ詳細へ遷移
 * - APPROVAL: メッセージ入力 → 参加リクエスト送信 → 完了表示
 */
export function CommunityJoinPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { data: community, isLoading } = usePublicCommunityDetail(id ?? '')
    const joinMutation = useJoinCommunity()
    const requestMutation = useJoinRequest()

    const [message, setMessage] = useState('')
    const [done, setDone] = useState(false)

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

    const isFreeJoin = community.joinMethod === 'FREE_JOIN'
    const isApproval = community.joinMethod === 'APPROVAL'
    const isPending = joinMutation.isPending || requestMutation.isPending

    const handleJoin = async () => {
        if (!id) return

        try {
            if (isFreeJoin) {
                await joinMutation.mutateAsync(id)
                // 参加成功 → コミュニティ詳細に遷移
                navigate(`/communities/${id}`, { replace: true })
            } else if (isApproval) {
                await requestMutation.mutateAsync({ communityId: id, message: message || undefined })
                setDone(true)
            }
        } catch {
            // エラーは TanStack Query で自動処理
        }
    }

    // 参加リクエスト送信完了画面
    if (done) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">参加リクエストを送信しました</h2>
                <p className="text-sm text-gray-500 mb-6">
                    管理者が承認するとコミュニティに参加できます。
                    <br />
                    しばらくお待ちください。
                </p>
                <Button variant="outline" onClick={() => navigate('/communities/search', { replace: true })}>
                    検索に戻る
                </Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto px-4 py-6">
                {/* コミュニティ情報 */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg overflow-hidden flex-shrink-0">
                        {community.logoUrl ? (
                            <img src={community.logoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            community.name.charAt(0)
                        )}
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">{community.name}</h2>
                        <p className="text-xs text-gray-500">
                            メンバー {community.memberCount}人
                            {community.maxMembers && ` / 定員${community.maxMembers}人`}
                        </p>
                    </div>
                </div>

                {/* 参加方式の説明 */}
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 mb-1">
                        <UserPlus className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">
                            {isFreeJoin ? '自由参加' : '承認制'}
                        </span>
                    </div>
                    <p className="text-xs text-blue-700">
                        {isFreeJoin
                            ? 'このコミュニティは自由参加です。参加ボタンを押すとすぐにメンバーになれます。'
                            : '管理者の承認が必要です。メッセージを添えて参加リクエストを送信してください。'}
                    </p>
                </div>

                {/* APPROVAL の場合: メッセージ入力 */}
                {isApproval && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            申請メッセージ（任意）
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="自己紹介や参加理由を書いてください..."
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                            rows={4}
                        />
                    </div>
                )}

                {/* エラー表示 */}
                {(joinMutation.error || requestMutation.error) && (
                    <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4">
                        {(joinMutation.error || requestMutation.error)?.message || 'エラーが発生しました'}
                    </div>
                )}
            </div>

            {/* 参加ボタン */}
            <div className="px-4 py-3 border-t border-gray-200 bg-white">
                <Button
                    onClick={handleJoin}
                    className="w-full"
                    disabled={isPending}
                >
                    {isPending ? (
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    ) : isFreeJoin ? (
                        <UserPlus className="w-4 h-4 mr-1.5" />
                    ) : (
                        <Send className="w-4 h-4 mr-1.5" />
                    )}
                    {isPending
                        ? '処理中...'
                        : isFreeJoin
                            ? 'コミュニティに参加する'
                            : '参加リクエストを送信する'}
                </Button>
            </div>

            {/* [6] コミュニティ参加 — 送信ボタン直下 */}
            <AdBanner slotId="community-join-below" />
        </div>
    )
}
