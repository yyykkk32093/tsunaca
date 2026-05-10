import { inquiryApi, inquiryQueryKeys } from '@/features/inquiry/api/inquiryApi'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
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

/** Wave6 Phase 8-C / 9b-16: 運営向け問い合わせ一覧（ステータス + 担当フィルタ） */
export function AdminInquiriesPage() {
    const [statusFilter, setStatusFilter] = useState<string>('')
    const [assigneeFilter, setAssigneeFilter] = useState<'' | 'me' | 'unassigned'>('')

    const filter = {
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(assigneeFilter ? { assignee: assigneeFilter } : {}),
    }
    const filterKey = Object.keys(filter).length > 0 ? filter : undefined
    const { data, isLoading } = useQuery({
        queryKey: inquiryQueryKeys.adminList(filterKey),
        queryFn: () => inquiryApi.admin.list(filterKey),
    })

    return (
        <div className="container mx-auto p-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <h1 className="text-xl font-bold">問い合わせ管理</h1>
                <div className="flex items-center gap-2">
                    <select
                        value={assigneeFilter}
                        onChange={(e) => setAssigneeFilter(e.target.value as '' | 'me' | 'unassigned')}
                        className="rounded border border-gray-300 px-2 py-1 text-sm"
                        aria-label="担当フィルタ"
                    >
                        <option value="">担当：すべて</option>
                        <option value="me">自分の担当</option>
                        <option value="unassigned">未割当</option>
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded border border-gray-300 px-2 py-1 text-sm"
                        aria-label="ステータスフィルタ"
                    >
                        <option value="">すべて</option>
                        <option value="OPEN">受付中</option>
                        <option value="IN_PROGRESS">対応中</option>
                        <option value="RESOLVED">解決済み</option>
                        <option value="CLOSED">終了</option>
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div className="text-gray-500">読み込み中…</div>
            ) : (data?.inquiries ?? []).length === 0 ? (
                <div className="rounded border border-dashed border-gray-300 p-8 text-center text-gray-500">
                    該当する問い合わせがありません
                </div>
            ) : (
                <ul className="space-y-2">
                    {data!.inquiries.map((it) => (
                        <li key={it.id}>
                            <Link
                                to={`/admin/inquiries/${it.id}`}
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
                                    {/* Wave6 Phase 9b-16: 担当バッジ */}
                                    {it.assignee ? (
                                        <span className="inline-block px-2 py-0.5 text-xs rounded bg-purple-100 text-purple-700">
                                            担当: {it.assignee.displayName ?? '(no name)'}
                                        </span>
                                    ) : (
                                        <span className="inline-block px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-500">
                                            未割当
                                        </span>
                                    )}
                                    <span className="ml-auto text-xs text-gray-500">
                                        {it.user
                                            ? `${it.user.displayName ?? '(no name)'} (${it.user.email})`
                                            : `匿名: ${it.contactEmail}`}
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
