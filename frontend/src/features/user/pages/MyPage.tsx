import type { WithdrawalReason } from '@/features/user/api/userApi'
import { useDeleteAccount, useUpdateUserProfile, useUserProfile } from '@/features/user/hooks/useUserQueries'
import { UnsavedChangesDialog } from '@/shared/components/UnsavedChangesDialog'
import { CharacterCounter } from '@/shared/components/ui/CharacterCounter'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import { Button } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Separator } from '@/shared/components/ui/separator'
import { uploadFile } from '@/shared/lib/uploadClient'
import { useUnsavedChangesWarning } from '@/shared/lib/useUnsavedChangesWarning'
import { Camera, Save } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

/**
 * MyPage — マイページ（UBL-32）
 *
 * プロフィール画像・表示名・自己紹介を編集。
 * 将来的に招待受諾UI（UBL-11）もここに追加。
 */
export function MyPage() {
    const { data: profile, isLoading } = useUserProfile()
    const updateProfile = useUpdateUserProfile()
    const deleteAccount = useDeleteAccount()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [displayName, setDisplayName] = useState<string | null>(null)
    const [biography, setBiography] = useState<string | null>(null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const [uploading, setUploading] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [withdrawalReason, setWithdrawalReason] = useState<WithdrawalReason | null>(null)
    const [withdrawalFreeText, setWithdrawalFreeText] = useState('')

    // Initialize form from profile data
    const currentDisplayName = displayName ?? profile?.displayName ?? ''
    const currentBiography = biography ?? profile?.biography ?? ''
    const currentAvatarUrl = avatarPreview ?? profile?.avatarUrl ?? null

    // isDirty + useUnsavedChangesWarning は早期returnより前に配置（Hooksのルール）
    const isDirty = displayName !== null || biography !== null || avatarPreview !== null
    const { isBlocked, proceed, cancel } = useUnsavedChangesWarning(isDirty)

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            </div>
        )
    }

    if (!profile) {
        return <div className="p-6 text-center text-red-500">プロフィールが取得できません</div>
    }

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setUploading(true)
            const result = await uploadFile(file)
            setAvatarPreview(result.url)
        } catch (err) {
            console.error('Avatar upload failed:', err)
            toast.error('アバター画像のアップロードに失敗しました')
        } finally {
            setUploading(false)
        }
    }

    const handleSave = () => {
        updateProfile.mutate({
            displayName: displayName !== null ? displayName : undefined,
            biography: biography !== null ? biography : undefined,
            avatarUrl: avatarPreview !== null ? avatarPreview : undefined,
        }, {
            onSuccess: () => {
                // #58: 保存成功トースト
                toast.success('保存しました')
                // ローカル state をリセット → サーバーデータにフォールバック
                setDisplayName(null)
                setBiography(null)
                setAvatarPreview(null)
            },
        })
    }

    return (
        <div className="p-4 space-y-6">
            {/* #57: 未保存警告ダイアログ */}
            <UnsavedChangesDialog open={isBlocked} onDiscard={proceed} onCancel={cancel} />

            <h1 className="text-xl font-bold text-gray-900">マイページ</h1>

            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-3">
                <div className="relative">
                    <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                        <AvatarImage src={currentAvatarUrl ?? undefined} alt={currentDisplayName} />
                        <AvatarFallback className="text-2xl bg-blue-100 text-blue-700">
                            {currentDisplayName?.charAt(0)?.toUpperCase() ?? '?'}
                        </AvatarFallback>
                    </Avatar>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="absolute bottom-0 right-0 p-1.5 rounded-full bg-blue-600 text-white shadow hover:bg-blue-700 transition-colors"
                        aria-label="写真を変更"
                    >
                        <Camera className="w-4 h-4" />
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                    />
                </div>
                {uploading && <span className="text-xs text-gray-500">アップロード中...</span>}
            </div>

            {/* Profile Form */}
            <Card className="p-4 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="displayName">表示名</Label>
                    <Input
                        id="displayName"
                        value={currentDisplayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="表示名を入力"
                        maxLength={50}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email">メールアドレス</Label>
                    <Input
                        id="email"
                        value={profile.email ?? ''}
                        disabled
                        className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-400">メールアドレスは変更できません</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="biography">自己紹介</Label>
                    <textarea
                        id="biography"
                        value={currentBiography}
                        onChange={(e) => setBiography(e.target.value)}
                        placeholder="自己紹介を入力"
                        rows={3}
                        maxLength={200}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <CharacterCounter current={currentBiography.length} max={200} />
                </div>

                <div className="space-y-2">
                    <Label>プラン</Label>
                    <div className="flex items-center gap-3">
                        <p className="text-sm font-medium text-gray-700">{profile.plan}</p>
                        <a
                            href="/paywall"
                            className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                        >
                            {profile.plan === 'FREE' || profile.plan === 'LITE' ? 'アップグレード →' : 'プラン管理 →'}
                        </a>
                    </div>
                </div>
            </Card>

            {/* Save Button */}
            <Button
                onClick={handleSave}
                disabled={!isDirty || updateProfile.isPending}
                className="w-full"
            >
                <Save className="w-4 h-4 mr-2" />
                {updateProfile.isPending ? '保存中...' : '保存'}
            </Button>

            {/* ===== 退会セクション ===== */}
            <Separator />
            <div className="pt-2 flex justify-center">
                <button
                    type="button"
                    className="text-xs text-muted-foreground hover:underline"
                    onClick={() => setShowDeleteDialog(true)}
                >
                    退会する
                </button>
            </div>

            {/* 退会確認ダイアログ */}
            <Dialog open={showDeleteDialog} onOpenChange={(open) => {
                setShowDeleteDialog(open)
                if (!open) {
                    setWithdrawalReason(null)
                    setWithdrawalFreeText('')
                }
            }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>アカウントを退会</DialogTitle>
                        <DialogDescription>
                            本当に退会しますか？この操作は取り消せません。すべてのコミュニティから退出し、ログイン情報も削除されます。
                        </DialogDescription>
                    </DialogHeader>

                    {/* 退会理由選択 */}
                    <div className="space-y-3 py-2">
                        <p className="text-sm font-medium text-gray-700">退会理由を教えてください（任意）</p>
                        {([
                            ['NOT_USING', 'あまり使っていない'],
                            ['FOUND_ALTERNATIVE', '他のサービスを使い始めた'],
                            ['HARD_TO_USE', '使いにくい'],
                            ['FEE_TOO_HIGH', '料金が高い'],
                            ['OTHER', 'その他'],
                        ] as const).map(([value, label]) => (
                            <label key={value} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="withdrawalReason"
                                    value={value}
                                    checked={withdrawalReason === value}
                                    onChange={() => setWithdrawalReason(value)}
                                    className="h-4 w-4 text-blue-600"
                                />
                                <span className="text-sm text-gray-700">{label}</span>
                            </label>
                        ))}

                        {/* フリーテキスト（OTHERが選ばれた場合、または任意で表示） */}
                        {withdrawalReason && (
                            <textarea
                                value={withdrawalFreeText}
                                onChange={(e) => setWithdrawalFreeText(e.target.value)}
                                placeholder="ご意見があればお聞かせください"
                                rows={3}
                                maxLength={500}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        )}
                    </div>

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">キャンセル</Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            disabled={deleteAccount.isPending}
                            onClick={() => {
                                deleteAccount.mutate(
                                    withdrawalReason
                                        ? { reason: withdrawalReason, freeText: withdrawalFreeText || undefined }
                                        : undefined,
                                    {
                                        onSuccess: () => {
                                            setShowDeleteDialog(false)
                                            toast.success('退会しました')
                                            window.location.href = '/login'
                                        },
                                    },
                                )
                            }}
                        >
                            {deleteAccount.isPending ? '退会処理中...' : '退会する'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
