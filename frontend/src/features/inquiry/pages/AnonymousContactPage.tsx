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
import { isHttpError } from '@/shared/lib/apiClient'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

/**
 * Wave6 Phase 8-B: 匿名問い合わせフォーム（ログイン障害時用）
 *
 * カテゴリは isAnonymousOnly=true のもののみ受け付ける（バックエンド側でも検証）。
 * reCAPTCHA v3 はバックエンドの環境変数で有効化される。
 * ローカル開発時は RECAPTCHA_SECRET 未設定により常に通過する。
 */
export function AnonymousContactPage() {
    const navigate = useNavigate()
    const { data: catData } = useQuery({
        queryKey: ['inquiries', 'categories', true],
        queryFn: () => inquiryApi.listCategories(true),
    })

    const anonCats: InquiryCategoryDto[] =
        catData?.categories.filter((c) => c.isAnonymousOnly) ?? []

    const [categorySlug, setCategorySlug] = useState<string>('')
    const [contactEmail, setContactEmail] = useState('')
    const [title, setTitle] = useState('')
    const [body, setBody] = useState('')

    const submitMutation = useMutation({
        mutationFn: () =>
            inquiryApi.createAnonymous({
                categorySlug,
                contactEmail,
                title,
                body,
                // ローカル開発時は no-op で通過するため、ダミートークンを送る
                recaptchaToken: 'local-dev',
            }),
        onSuccess: () => {
            toast.success('問い合わせを送信しました。返信はメールでお送りします。')
            navigate('/login', { replace: true })
        },
        onError: (err) => {
            if (isHttpError(err) && err.status === 429) {
                toast.error('送信回数の上限に達しました。時間を置いて再度お試しください')
            } else {
                toast.error('送信に失敗しました')
            }
        },
    })

    const canSubmit =
        !!categorySlug &&
        contactEmail.includes('@') &&
        title.trim().length > 0 &&
        body.trim().length > 0 &&
        !submitMutation.isPending

    return (
        <div className="container mx-auto max-w-2xl p-4 space-y-6">
            <div>
                <h1 className="text-xl font-bold mb-1">ログイン・登録の不具合をお知らせ</h1>
                <p className="text-sm text-gray-600">
                    アプリにログインできない場合のみ、こちらからご連絡ください。返信はメールでお送りします。
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="anon-category">カテゴリ</Label>
                <Select value={categorySlug} onValueChange={setCategorySlug}>
                    <SelectTrigger id="anon-category">
                        <SelectValue placeholder="カテゴリを選択" />
                    </SelectTrigger>
                    <SelectContent>
                        {anonCats.map((c) => (
                            <SelectItem key={c.slug} value={c.slug}>
                                {c.labelI18n.ja ?? c.slug}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="anon-email">連絡先メールアドレス</Label>
                <Input
                    id="anon-email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="example@example.com"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="anon-title">タイトル</Label>
                <Input
                    id="anon-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={200}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="anon-body">内容</Label>
                <Textarea
                    id="anon-body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    maxLength={10_000}
                    rows={10}
                />
            </div>

            <Button
                type="button"
                onClick={() => submitMutation.mutate()}
                disabled={!canSubmit}
                className="w-full"
            >
                {submitMutation.isPending ? '送信中…' : '送信する'}
            </Button>
        </div>
    )
}
