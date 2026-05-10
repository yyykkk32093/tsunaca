import { inquiryApi, inquiryQueryKeys } from '@/features/inquiry/api/inquiryApi'
import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'

const STATUS_LABEL: Record<string, string> = {
    OPEN: '受付中',
    IN_PROGRESS: '対応中',
    RESOLVED: '解決済み',
    CLOSED: '終了',
}

/** Wave6 Phase 8-B: マイ問い合わせ詳細（スレッド表示 + 追記入力） */
export function MyInquiryDetailPage() {
    const { id = '' } = useParams<{ id: string }>()
    const qc = useQueryClient()
    const [reply, setReply] = useState('')

    const { data: inquiry, isLoading } = useQuery({
        queryKey: inquiryQueryKeys.detail(id),
        queryFn: () => inquiryApi.findMineById(id),
        enabled: !!id,
    })

    const addMessageMutation = useMutation({
        mutationFn: () => inquiryApi.addMyMessage(id, { body: reply }),
        onSuccess: () => {
            setReply('')
            qc.invalidateQueries({ queryKey: inquiryQueryKeys.detail(id) })
            qc.invalidateQueries({ queryKey: inquiryQueryKeys.mine() })
            toast.success('追加メッセージを送信しました')
        },
        onError: () => toast.error('送信に失敗しました'),
    })

    if (isLoading) return <div className="p-4 text-gray-500">読み込み中…</div>
    if (!inquiry) return <div className="p-4 text-gray-500">問い合わせが見つかりません</div>

    const isClosed = inquiry.status === 'CLOSED'

    return (
        <div className="container mx-auto max-w-2xl p-4 space-y-4">
            <header className="space-y-2">
                <div className="text-xs text-gray-500">
                    {inquiry.category.labelI18n.ja ?? inquiry.category.slug} ・{' '}
                    {STATUS_LABEL[inquiry.status] ?? inquiry.status}
                </div>
                <h1 className="text-lg font-bold text-gray-900">{inquiry.title}</h1>
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
                                {isOperator ? '運営からの返信' : 'あなた'}
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
                                            {a.scanStatus !== 'CLEAN' && (
                                                <span className="ml-2 text-gray-400">
                                                    (検査: {a.scanStatus})
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    )
                })}
            </ul>

            {!isClosed && (
                <div className="space-y-2 pt-4 border-t">
                    <Textarea
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        rows={5}
                        placeholder="追加でお伝えしたい内容を入力"
                        maxLength={10_000}
                    />
                    <div className="flex justify-end">
                        <Button
                            type="button"
                            onClick={() => addMessageMutation.mutate()}
                            disabled={
                                reply.trim().length === 0 || addMessageMutation.isPending
                            }
                        >
                            {addMessageMutation.isPending ? '送信中…' : '追記を送信'}
                        </Button>
                    </div>
                </div>
            )}

            {isClosed && (
                <div className="rounded bg-gray-50 p-3 text-sm text-gray-600">
                    この問い合わせは終了しています。再度お問い合わせが必要な場合は、新しい問い合わせを作成してください。
                </div>
            )}
        </div>
    )
}
