/**
 * Wave6 Phase 9b-04: HelpFeedback 集計ダッシュボード（運営向け）
 *
 * - 記事ごとの helpful 率テーブル（低評価優先ソート）
 * - CSV エクスポート
 */
import { http } from '@/shared/lib/apiClient'
import { useQuery } from '@tanstack/react-query'

interface FeedbackSummaryRow {
    categorySlug: string
    articleSlug: string
    total: number
    helpfulCount: number
    notHelpfulCount: number
    helpfulRate: number
    lastFeedbackAt: string | null
}

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''

export function AdminHelpFeedbackPage() {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['admin', 'help', 'feedback', 'summary'],
        queryFn: () => http<{ rows: FeedbackSummaryRow[] }>('/v1/admin/help/feedback/summary'),
    })

    const rows = data?.rows ?? []

    const handleExport = () => {
        // ブラウザにダウンロードさせるため、新規タブで開く（cookie 認証で通る）
        const url = `${API_BASE}/v1/admin/help/feedback/export`
        window.open(url, '_blank', 'noopener')
    }

    return (
        <div className="container mx-auto p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold">ヘルプ記事フィードバック集計</h1>
                <button
                    type="button"
                    onClick={handleExport}
                    className="rounded bg-blue-600 text-white px-3 py-1.5 text-sm hover:bg-blue-700"
                >
                    CSV ダウンロード
                </button>
            </div>

            {isLoading ? (
                <div className="text-gray-500">読み込み中…</div>
            ) : isError ? (
                <div className="text-red-600">読み込みに失敗しました</div>
            ) : rows.length === 0 ? (
                <div className="rounded border border-dashed border-gray-300 p-8 text-center text-gray-500">
                    フィードバックがまだありません
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="text-left px-3 py-2">カテゴリ</th>
                                <th className="text-left px-3 py-2">記事</th>
                                <th className="text-right px-3 py-2">総数</th>
                                <th className="text-right px-3 py-2">👍</th>
                                <th className="text-right px-3 py-2">👎</th>
                                <th className="text-right px-3 py-2">helpful率</th>
                                <th className="text-left px-3 py-2">最終評価</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => {
                                const pct = (r.helpfulRate * 100).toFixed(1)
                                const lowAlert = r.total >= 5 && r.helpfulRate < 0.5
                                return (
                                    <tr
                                        key={`${r.categorySlug}/${r.articleSlug}`}
                                        className={`border-b border-gray-100 ${lowAlert ? 'bg-red-50' : ''}`}
                                    >
                                        <td className="px-3 py-2 text-gray-600">
                                            {r.categorySlug}
                                        </td>
                                        <td className="px-3 py-2 font-medium">
                                            {r.articleSlug}
                                        </td>
                                        <td className="px-3 py-2 text-right">{r.total}</td>
                                        <td className="px-3 py-2 text-right text-green-700">
                                            {r.helpfulCount}
                                        </td>
                                        <td className="px-3 py-2 text-right text-red-700">
                                            {r.notHelpfulCount}
                                        </td>
                                        <td
                                            className={`px-3 py-2 text-right font-semibold ${lowAlert ? 'text-red-700' : 'text-gray-900'}`}
                                        >
                                            {pct}%
                                        </td>
                                        <td className="px-3 py-2 text-gray-500 text-xs">
                                            {r.lastFeedbackAt
                                                ? new Date(r.lastFeedbackAt).toLocaleString(
                                                    'ja-JP',
                                                )
                                                : '—'}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <p className="text-xs text-gray-500">
                helpful 率が 50% 未満かつ 5 件以上のフィードバックがある記事は赤くハイライトされます。
            </p>
        </div>
    )
}
