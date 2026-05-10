import { useAuth } from '@/app/providers/AuthProvider'
import { inquiryApi, inquiryQueryKeys } from '@/features/inquiry/api/inquiryApi'
import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'

const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const

const STATUS_LABEL: Record<string, string> = {
    OPEN: '受付中',
    IN_PROGRESS: '対応中',
    RESOLVED: '解決済み',
    CLOSED: '終了',
}

/** Wave6 Phase 8-C: 運営向け問い合わせ詳細 */
export function AdminInquiryDetailPage() {
    const { id = '' } = useParams<{ id: string }>()
    const qc = useQueryClient()
    const { user } = useAuth()
    const isSuperAdmin = user?.systemRole === 'SUPER_ADMIN'
    const [reply, setReply] = useState('')

    const { data: inquiry, isLoading } = useQuery({
        queryKey: inquiryQueryKeys.adminDetail(id),
        queryFn: () => inquiryApi.admin.findById(id),
        enabled: !!id,
    })

    const replyMutation = useMutation({
        mutationFn: () => inquiryApi.admin.addOperatorMessage(id, { body: reply }),
        onSuccess: () => {
            setReply('')
            qc.invalidateQueries({ queryKey: inquiryQueryKeys.adminDetail(id) })
            qc.invalidateQueries({ queryKey: inquiryQueryKeys.adminList() })
            toast.success('返信を送信しました')
        },
        onError: () => toast.error('送信に失敗しました'),
    })

    const statusMutation = useMutation({
        mutationFn: (s: (typeof STATUS_OPTIONS)[number]) =>
            inquiryApi.admin.updateStatus(id, s),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: inquiryQueryKeys.adminDetail(id) })
            qc.invalidateQueries({ queryKey: inquiryQueryKeys.adminList() })
            toast.success('ステータスを更新しました')
        },
        onError: () => toast.error('更新に失敗しました'),
    })

    // Wave6 Phase 9b-16: SystemAdmin ユーザー一覧 (担当選択プルダウン) — SUPER_ADMIN のみ
    const { data: adminsData } = useQuery({
        queryKey: ['admin', 'system-admins'],
        queryFn: () => inquiryApi.admin.listSystemAdmins(),
        staleTime: 5 * 60 * 1000,
        enabled: isSuperAdmin,
    })

    const assigneeMutation = useMutation({
        mutationFn: (assigneeUserId: string | null) =>
            inquiryApi.admin.updateAssignee(id, assigneeUserId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: inquiryQueryKeys.adminDetail(id) })
            qc.invalidateQueries({ queryKey: inquiryQueryKeys.adminList() })
            toast.success('担当者を更新しました')
        },
        onError: () => toast.error('担当者更新に失敗しました'),
    })

    if (isLoading) return <div className="p-4 text-gray-500">読み込み中…</div>
    if (!inquiry) return <div className="p-4 text-gray-500">問い合わせが見つかりません</div>

    return (
        <div className="container mx-auto max-w-3xl p-4 space-y-4">
            <header className="space-y-2">
                <div className="text-xs text-gray-500">
                    {inquiry.category.labelI18n.ja ?? inquiry.category.slug}
                </div>
                <h1 className="text-lg font-bold text-gray-900">{inquiry.title}</h1>
                <div className="text-xs text-gray-600">
                    {inquiry.user
                        ? `${inquiry.user.displayName ?? '(no name)'} (${inquiry.user.email})`
                        : `匿名: ${inquiry.contactEmail}`}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-500">ステータス:</span>
                    <select
                        value={inquiry.status}
                        onChange={(e) =>
                            statusMutation.mutate(
                                e.target.value as (typeof STATUS_OPTIONS)[number],
                            )
                        }
                        className="rounded border border-gray-300 px-2 py-1 text-sm"
                        disabled={statusMutation.isPending}
                    >
                        {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                                {STATUS_LABEL[s]}
                            </option>
                        ))}
                    </select>

                    {/* Wave6 Phase 9b-16: 担当者プルダウン (SUPER_ADMIN のみ操作可) */}
                    {isSuperAdmin ? (
                        <>
                            <span className="text-xs text-gray-500 ml-2">担当:</span>
                            <select
                                value={inquiry.assignee?.id ?? ''}
                                onChange={(e) => assigneeMutation.mutate(e.target.value || null)}
                                className="rounded border border-gray-300 px-2 py-1 text-sm"
                                disabled={assigneeMutation.isPending}
                                aria-label="担当オペレーター"
                            >
                                <option value="">未割当</option>
                                {(adminsData?.users ?? []).map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.displayName ?? u.email ?? u.id}
                                        {u.systemRole === 'SUPER_ADMIN' ? ' ★' : ''}
                                    </option>
                                ))}
                            </select>
                        </>
                    ) : inquiry.assignee ? (
                        <span className="text-xs text-gray-700 ml-2">
                            担当: {inquiry.assignee.displayName ?? inquiry.assignee.email ?? '(no name)'}
                        </span>
                    ) : (
                        <span className="text-xs text-gray-500 ml-2">未割当</span>
                    )}
                </div>
            </header>

            <ul className="space-y-3">
                {inquiry.messages.map((m) => {
                    const isOperator = m.authorType === 'OPERATOR'
                    return (
                        <li
                            key={m.id}
                            className={`rounded p-3 border ${isOperator
                                ? 'bg-blue-50 border-blue-200'
                                : 'bg-white border-gray-200'
                                }`}
                        >
                            <div className="text-xs font-semibold mb-1 text-gray-700">
                                {isOperator ? '運営' : 'ユーザー'}
                                <span className="ml-2 font-normal text-gray-500">
                                    {new Date(m.createdAt).toLocaleString('ja-JP')}
                                </span>
                            </div>
                            <div className="text-sm whitespace-pre-wrap text-gray-900">
                                {m.body}
                            </div>
                            {m.attachments.length > 0 && (
                                <ul className="mt-2 text-xs text-gray-600 space-y-0.5">
                                    {m.attachments.map((a) => (
                                        <li key={a.id}>
                                            📎 {a.fileName} ({(a.sizeBytes / 1024).toFixed(0)} KB)
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    )
                })}
            </ul>

            <div className="space-y-2 pt-4 border-t">
                <Textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={6}
                    placeholder="ユーザーへの返信を入力"
                    maxLength={10_000}
                />
                <div className="flex justify-end">
                    <Button
                        type="button"
                        onClick={() => replyMutation.mutate()}
                        disabled={
                            reply.trim().length === 0 || replyMutation.isPending
                        }
                    >
                        {replyMutation.isPending ? '送信中…' : '返信を送信'}
                    </Button>
                </div>
            </div>
        </div>
    )
}
