import { findArticle } from '@/features/help/content/helpLoader'
import { inquiryApi, type InquiryCategoryDto } from '@/features/inquiry/api/inquiryApi'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'
import { http, isHttpError } from '@/shared/lib/apiClient'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Loader2, Paperclip, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

const ACCEPT = 'image/*,application/pdf,text/plain'
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB
const MAX_FILES = 5

interface UploadedFile {
    id: string
    file: File
    status: 'uploading' | 'done' | 'error'
    storageKey?: string
}

async function uploadToS3(file: File): Promise<string> {
    const { uploadUrl, key } = await http<{ uploadUrl: string; key: string; publicUrl: string }>(
        '/v1/upload/url',
        {
            method: 'POST',
            json: { fileName: file.name, mimeType: file.type, fileSize: file.size },
        },
    )
    await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
    })
    return key
}

/**
 * Wave6 Phase 8-B: 問い合わせフォーム（認証ユーザー向け）
 *
 * URL クエリパラメータ:
 *   - ?category=...    : カテゴリ slug をプレフィル
 *   - ?articleSlug=... : ヘルプ記事フィードバックから遷移時の参照（タイトル末尾に挿入）
 */
export function ContactPage() {
    const [params] = useSearchParams()
    const navigate = useNavigate()

    const presetCategory = params.get('category')
    const presetArticleSlug = params.get('articleSlug')
    const presetArticleTitle = params.get('articleTitle')

    const { data: catData, isLoading: isCatLoading } = useQuery({
        queryKey: ['inquiries', 'categories', false],
        queryFn: () => inquiryApi.listCategories(false),
    })

    const categories: InquiryCategoryDto[] = catData?.categories ?? []

    const [categorySlug, setCategorySlug] = useState<string>('')
    const [title, setTitle] = useState('')
    const [body, setBody] = useState('')
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)

    // プレフィル: カテゴリ／タイトル
    useEffect(() => {
        if (!categorySlug && presetCategory && categories.some((c) => c.slug === presetCategory)) {
            setCategorySlug(presetCategory)
        }
    }, [categories, presetCategory, categorySlug])

    useEffect(() => {
        if (title || !presetArticleSlug) return
        let resolvedTitle: string | null = presetArticleTitle?.trim() || null
        if (!resolvedTitle && presetCategory) {
            const found = findArticle(presetCategory, presetArticleSlug)
            if (found) resolvedTitle = found.article.title
        }
        setTitle(`【記事に関する質問】${resolvedTitle ?? presetArticleSlug}`)
    }, [presetArticleSlug, presetArticleTitle, presetCategory, title])

    const handleFileChange = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const selected = Array.from(e.target.files ?? [])
            e.target.value = ''

            const remaining = MAX_FILES - uploadedFiles.length
            if (remaining <= 0) {
                toast.error(`添付ファイルは最大 ${MAX_FILES} 件までです`)
                return
            }
            const toAdd = selected.slice(0, remaining)

            for (const file of toAdd) {
                if (file.size > MAX_FILE_SIZE) {
                    toast.error(`${file.name} は 20MB を超えています`)
                    continue
                }
                const id = crypto.randomUUID()
                setUploadedFiles((prev) => [...prev, { id, file, status: 'uploading' }])
                uploadToS3(file)
                    .then((storageKey) => {
                        setUploadedFiles((prev) =>
                            prev.map((f) => f.id === id ? { ...f, status: 'done', storageKey } : f),
                        )
                    })
                    .catch(() => {
                        toast.error(`${file.name} のアップロードに失敗しました`)
                        setUploadedFiles((prev) =>
                            prev.map((f) => f.id === id ? { ...f, status: 'error' } : f),
                        )
                    })
            }
        },
        [uploadedFiles.length],
    )

    const removeFile = useCallback((id: string) => {
        setUploadedFiles((prev) => prev.filter((f) => f.id !== id))
    }, [])

    const isUploading = uploadedFiles.some((f) => f.status === 'uploading')
    const attachmentKeys = uploadedFiles
        .filter((f) => f.status === 'done' && f.storageKey)
        .map((f) => ({
            storageKey: f.storageKey!,
            fileName: f.file.name,
            mimeType: f.file.type || 'application/octet-stream',
            sizeBytes: f.file.size,
        }))

    const submitMutation = useMutation({
        mutationFn: () =>
            inquiryApi.create({ categorySlug, title, body, attachmentKeys }),
        onSuccess: (created) => {
            toast.success('問い合わせを送信しました')
            navigate(`/mypage/inquiries/${created.id}`, { replace: true })
        },
        onError: (err) => {
            if (isHttpError(err) && err.status === 429) {
                toast.error('送信回数の上限に達しました。時間を置いて再度お試しください')
            } else {
                toast.error('送信に失敗しました')
            }
        },
    })

    const canSubmit = useMemo(
        () =>
            !!categorySlug &&
            title.trim().length > 0 &&
            title.length <= 200 &&
            body.trim().length > 0 &&
            body.length <= 10_000 &&
            !isUploading &&
            !submitMutation.isPending,
        [categorySlug, title, body, isUploading, submitMutation.isPending],
    )

    return (
        <div className="container mx-auto max-w-2xl p-4 space-y-6">
            <div>
                <h1 className="text-xl font-bold mb-1">問い合わせ</h1>
                <p className="text-sm text-gray-600">
                    内容を確認のうえ、運営から返信いたします。返信はマイページの問い合わせ履歴で確認できます。
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="inquiry-category">カテゴリ</Label>
                <Select value={categorySlug} onValueChange={setCategorySlug} disabled={isCatLoading}>
                    <SelectTrigger id="inquiry-category">
                        <SelectValue placeholder="カテゴリを選択" />
                    </SelectTrigger>
                    <SelectContent>
                        {categories.map((c) => (
                            <SelectItem key={c.slug} value={c.slug}>
                                {c.labelI18n.ja ?? c.slug}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="inquiry-title">タイトル（200 字まで）</Label>
                <Input
                    id="inquiry-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={200}
                    placeholder="例: 〇〇画面で△△が表示されません"
                />
                <p className="text-xs text-gray-500 text-right">{title.length} / 200</p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="inquiry-body">内容（10000 字まで）</Label>
                <Textarea
                    id="inquiry-body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    maxLength={10_000}
                    rows={10}
                    placeholder="発生している事象、再現手順、利用環境などを記載してください"
                />
                <p className="text-xs text-gray-500 text-right">{body.length} / 10000</p>
            </div>

            {/* 添付ファイル */}
            <div className="space-y-2">
                <Label>添付ファイル（任意・最大 {MAX_FILES} 件・各 20MB まで）</Label>
                <p className="text-xs text-gray-500">画像・PDF・テキストファイルを添付できます</p>

                {uploadedFiles.length > 0 && (
                    <ul className="space-y-1">
                        {uploadedFiles.map((f) => (
                            <li
                                key={f.id}
                                className="flex items-center gap-2 rounded border border-gray-200 px-3 py-1.5 text-sm"
                            >
                                {f.status === 'uploading' ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400 shrink-0" />
                                ) : f.status === 'error' ? (
                                    <span className="text-red-500 text-xs shrink-0">失敗</span>
                                ) : (
                                    <Paperclip className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                )}
                                <span className="flex-1 truncate text-gray-700">{f.file.name}</span>
                                <button
                                    type="button"
                                    onClick={() => removeFile(f.id)}
                                    className="text-gray-400 hover:text-red-500 shrink-0"
                                    aria-label={`${f.file.name} を削除`}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                {uploadedFiles.length < MAX_FILES && (
                    <>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept={ACCEPT}
                            className="sr-only"
                            onChange={handleFileChange}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-1.5 rounded border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
                        >
                            <Paperclip className="h-4 w-4" />
                            ファイルを選択
                        </button>
                    </>
                )}
            </div>

            <div className="flex justify-end">
                <Button
                    type="button"
                    onClick={() => submitMutation.mutate()}
                    disabled={!canSubmit}
                >
                    {submitMutation.isPending ? '送信中…' : isUploading ? 'アップロード中…' : '送信する'}
                </Button>
            </div>
        </div>
    )
}

/**
 * Wave6 Phase 8-B: 問い合わせフォーム（認証ユーザー向け）
 *
 * URL クエリパラメータ:
 *   - ?category=...    : カテゴリ slug をプレフィル
 *   - ?articleSlug=... : ヘルプ記事フィードバックから遷移時の参照（タイトル末尾に挿入）
 */
