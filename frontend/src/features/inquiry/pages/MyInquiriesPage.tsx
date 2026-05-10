import { inquiryApi, inquiryQueryKeys } from '@/features/inquiry/api/inquiryApi'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

const STATUS_LABEL: Record<string, string> = {
    OPEN: '受付中',
    IN_PROGRESS: '対応中',
    RESOLVED: '解決済み',
    CLOSED: '終了',
}

const STATUS_COLOR: Record<string, string> = {
    OPEN: 'bg-blue-100 text-blue-700',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
    RESOLVED: 'bg-green-100 text-green-700',
    CLOSED: 'bg-gray-100 text-gray-600',
}

/** Wave6 Phase 8-B: マイ問い合わせ履歴 */
export function MyInquiriesPage() {
    const { data, isLoading } = useQuery({
        queryKey: inquiryQueryKeys.mine(),
        queryFn: () => inquiryApi.listMine(),
    })

    if (isLoading) {
        return <div className="p-4 text-gray-500">読み込み中…</div>
    }

    const items = data?.inquiries ?? []

    return (
        <div className="container mx-auto max-w-2xl p-4 space-y-4">
            <h1 className="text-xl font-bold">問い合わせ履歴</h1>

            {items.length === 0 ? (
                <div className="rounded border border-dashed border-gray-300 p-8 text-center text-gray-500">
                    問い合わせ履歴はまだありません
                </div>
            ) : (
                <ul className="space-y-2">
                    {items.map((it) => (
                        <li key={it.id}>
                            <Link
                                to={`/mypage/inquiries/${it.id}`}
                                className="block rounded border border-gray-200 p-3 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <span
                                        className={`inline-block px-2 py-0.5 text-xs rounded ${STATUS_COLOR[it.status]}`}
                                    >
                                        {STATUS_LABEL[it.status] ?? it.status}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {it.category.labelI18n.ja ?? it.category.slug}
                                    </span>
                                </div>
                                <div className="text-sm font-medium text-gray-900 truncate">
                                    {it.title}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    最終更新 {new Date(it.lastActivityAt).toLocaleString('ja-JP')}
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
