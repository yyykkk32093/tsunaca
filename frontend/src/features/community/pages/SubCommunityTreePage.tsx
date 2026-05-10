import { useCommunity, useMyRole, useSubCommunities } from '@/features/community/hooks/useCommunityQueries'
import { ArrowLeft, ChevronRight, Network, Plus, Users } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

/**
 * SubCommunityTreePage — サブコミュニティツリー表示画面
 *
 * 親コミュニティを上部に配置し、その配下にサブコミュニティをインデントして表示。
 * サブコミュニティ側からアクセスした場合も、ルート（一番上の親）から表示する。
 * 現在は1階層のみサポート（depth=0 → depth=1）。
 */
export function SubCommunityTreePage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()

    // まず指定IDのコミュニティを取得し、parentId があればルートを特定
    const { data: current, isLoading: currentLoading } = useCommunity(id!)

    // ルートID: parentId があれば親がルート。なければ自分がルート。
    const rootId = current?.parentId ?? id!

    // ルートのコミュニティ情報と子一覧を取得
    const { data: root, isLoading: rootLoading } = useCommunity(rootId)
    const { data: childrenData, isLoading: childrenLoading } = useSubCommunities(rootId)
    const children = childrenData?.children ?? []

    // W6-05: ルートコミュニティに対する現ユーザーのロール。
    // OWNER/ADMIN のみサブコミュニティ作成 CTA を表示。
    const { isAdminOrAbove } = useMyRole(rootId)

    const isLoading = currentLoading || rootLoading || childrenLoading

    return (
        <div className="p-4 space-y-4">
            <button
                onClick={() => navigate(`/communities/${id}`)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
                <ArrowLeft size={16} /> 戻る
            </button>

            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Network size={18} className="text-blue-600" />
                    <h1 className="text-lg font-bold text-gray-900">コミュニティツリー</h1>
                </div>
                {isAdminOrAbove && (
                    <button
                        onClick={() => navigate(`/communities/${rootId}/sub/new`)}
                        className="flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700"
                    >
                        <Plus size={14} /> サブコミュニティ作成
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                </div>
            ) : (
                <div className="space-y-1">
                    {/* ルートコミュニティ */}
                    {root && (
                        <button
                            onClick={() => navigate(`/communities/${rootId}`)}
                            className={`flex items-center gap-3 w-full p-3 rounded-xl text-left transition-all ${rootId === id
                                ? 'bg-blue-100 border-2 border-blue-400 shadow-sm'
                                : 'bg-blue-50 border border-blue-200 hover:border-blue-300'
                                }`}
                        >
                            <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                                {root.logoUrl ? (
                                    <img src={root.logoUrl} alt={root.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        <Users size={16} />
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-blue-900 truncate">{root.name}</p>
                                <p className="text-xs text-blue-600">{root.memberCount}人 ・ ルートコミュニティ</p>
                            </div>
                        </button>
                    )}

                    {/* 子コミュニティ（インデント） */}
                    {children.length > 0 ? (
                        <div className="ml-6 border-l-2 border-gray-200 pl-4 space-y-1">
                            {children.map((child) => (
                                <button
                                    key={child.id}
                                    onClick={() => navigate(`/communities/${child.id}`)}
                                    className={`flex items-center gap-3 w-full p-2.5 rounded-lg transition-all text-left ${child.id === id
                                        ? 'bg-blue-50 border-2 border-blue-400 shadow-sm'
                                        : 'bg-white border hover:border-blue-300 hover:shadow-sm'
                                        }`}
                                >
                                    <div className="w-9 h-9 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                                        {child.logoUrl ? (
                                            <img src={child.logoUrl} alt={child.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                <Users size={14} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-gray-900 truncate">{child.name}</p>
                                        <p className="text-xs text-gray-400">{child.memberCount}人</p>
                                    </div>
                                    <ChevronRight size={14} className="text-gray-300 shrink-0" />
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="ml-6 pl-4 py-4 text-center text-sm text-gray-400">
                            サブコミュニティはありません
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
