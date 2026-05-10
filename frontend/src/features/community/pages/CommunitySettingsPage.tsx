import { useAuth } from '@/app/providers/AuthProvider'
import { CategoryPicker } from '@/features/community/components/CategoryPicker'
import { LocationSettings, type LocationEntry } from '@/features/community/components/LocationSettings'
import { MemberLevelSelect } from '@/features/community/components/MemberLevelSelect'
import { useCommunity, useCommunityMasters, useLeaveCommunity, useMembers, useUpdateCommunity } from '@/features/community/hooks/useCommunityQueries'
import { useAuditLogs, useChangeMemberRole, useRemoveMember } from '@/features/community/hooks/useCommunitySettingsQueries'
import { useConnectStatus, useStartOnboarding } from '@/features/community/hooks/useConnectQueries'
import { useParticipationLevelLabels } from '@/features/master/hooks/useParticipationLevels'
import { formatAuditSummary } from '@/shared/audit-labels'
import { UnsavedChangesDialog } from '@/shared/components/UnsavedChangesDialog'
import { CharacterCounter } from '@/shared/components/ui/CharacterCounter'
import { Button } from '@/shared/components/ui/button'
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select'
import { Separator } from '@/shared/components/ui/separator'
import { Slider } from '@/shared/components/ui/slider'
import { Textarea } from '@/shared/components/ui/textarea'
import { uploadFile } from '@/shared/lib/uploadClient'
import { useUnsavedChangesWarning } from '@/shared/lib/useUnsavedChangesWarning'
import {
    Camera,
    ChevronDown,
    ChevronRight,
    Crown,
    ExternalLink,
    HelpCircle,
    History,
    LogOut,
    Shield,
    UserMinus,
    Users
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

type Section = 'settings' | 'members' | 'audit'
type MemberManageMode = 'role' | 'level'

export default function CommunitySettingsPage() {
    const { id: communityId } = useParams<{ id: string }>()
    const { user: authUser } = useAuth()
    const { data: community, isLoading } = useCommunity(communityId!)
    const { data: membersData } = useMembers(communityId!)
    const { data: auditData } = useAuditLogs(communityId!)
    const { data: masters } = useCommunityMasters()
    const updateCommunity = useUpdateCommunity(communityId!)
    const changeRole = useChangeMemberRole(communityId!)
    const removeMember = useRemoveMember(communityId!)
    const leaveCommunity = useLeaveCommunity()
    const navigate = useNavigate()
    const { data: connectStatus } = useConnectStatus(communityId)
    const startOnboarding = useStartOnboarding(communityId!)
    const levelLabels = useParticipationLevelLabels()

    const [openSection, setOpenSection] = useState<Section | null>('settings')
    const [showLeaveDialog, setShowLeaveDialog] = useState(false)
    const [showStripeInfo, setShowStripeInfo] = useState(false)
    const [showCreditCardConnectDialog, setShowCreditCardConnectDialog] = useState(false)
    const [memberManageMode, setMemberManageMode] = useState<MemberManageMode>('role')

    // Stripe Connect が完全に有効かどうか
    const isStripeReady = connectStatus?.hasAccount === true && connectStatus?.chargesEnabled === true

    // ---- Profile form state ----
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [logoUrl, setLogoUrl] = useState<string | null>(null)
    const [coverUrl, setCoverUrl] = useState<string | null>(null)
    const logoInputRef = useRef<HTMLInputElement>(null)
    const coverInputRef = useRef<HTMLInputElement>(null)

    // ---- Payment form state ----
    const [payPayId, setPayPayId] = useState('')
    const [enabledMethods, setEnabledMethods] = useState<string[]>(['CASH'])

    // ---- Join / visibility form state ----
    const [joinMethod, setJoinMethod] = useState<'FREE_JOIN' | 'APPROVAL' | 'INVITATION'>('FREE_JOIN')
    const [isPublic, setIsPublic] = useState(true)
    // 活動頻度——2段プルダウン用 state
    const [freqUnit, setFreqUnit] = useState<'週' | '月' | '年' | ''>('')
    const [freqCount, setFreqCount] = useState<string>('')
    const [freqCustom, setFreqCustom] = useState<string>('')
    // locations state（一括保存用）
    const [editedLocations, setEditedLocations] = useState<LocationEntry[] | null>(null)
    // tags state
    const [editedTags, setEditedTags] = useState<string[]>([])
    const [tagInput, setTagInput] = useState('')
    // category state
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
    const [recommendedLevelEnabled, setRecommendedLevelEnabled] = useState(false)
    const [recommendedLevelRange, setRecommendedLevelRange] = useState<[number, number]>([0, 8])

    useEffect(() => {
        if (community) {
            setName(community.name)
            setDescription(community.description ?? '')
            setLogoUrl(community.logoUrl)
            setCoverUrl(community.coverUrl)
            setPayPayId(community.payPayId ?? '')
            setEnabledMethods(community.enabledPaymentMethods ?? ['CASH'])
            setJoinMethod((community.joinMethod as 'FREE_JOIN' | 'APPROVAL' | 'INVITATION') ?? 'FREE_JOIN')
            setIsPublic(community.isPublic ?? true)
            setEditedTags(community.tags ?? [])
            setSelectedCategoryId(community.categories?.[0]?.id ?? '')
            if (community.recommendedLevelMin != null && community.recommendedLevelMax != null) {
                setRecommendedLevelEnabled(true)
                setRecommendedLevelRange([community.recommendedLevelMin, community.recommendedLevelMax])
            } else {
                setRecommendedLevelEnabled(false)
                setRecommendedLevelRange([0, 8])
            }
            // 活動頻度をパース（例: "週1回" → unit='週', count='1'）
            const freq = community.activityFrequency ?? ''
            const freqMatch = freq.match(/^(週|月|年)(\d+)回$/)
            if (freqMatch) {
                setFreqUnit(freqMatch[1] as '週' | '月' | '年')
                setFreqCount(freqMatch[2])
                setFreqCustom('')
            } else if (freq) {
                // レガシー値（例: "毎週土曜日"）→ リセット
                setFreqUnit('')
                setFreqCount('')
                setFreqCustom('')
            } else {
                setFreqUnit('')
                setFreqCount('')
                setFreqCustom('')
            }
        }
    }, [community])

    // #44: 統合dirty判定（Hooksのルール遵守のため早期returnより前で算出）
    const profileDirty = community != null && (
        name !== community.name ||
        description !== (community.description ?? '') ||
        logoUrl !== community.logoUrl ||
        coverUrl !== community.coverUrl
    )

    const paymentDirty = community != null && (
        payPayId !== (community.payPayId ?? '') ||
        JSON.stringify(enabledMethods) !== JSON.stringify(community.enabledPaymentMethods ?? ['CASH'])
    )

    const joinDirty = community != null && (
        joinMethod !== ((community.joinMethod as 'FREE_JOIN' | 'APPROVAL' | 'INVITATION') ?? 'FREE_JOIN') ||
        isPublic !== (community.isPublic ?? true) ||
        buildFrequencyString(freqUnit, freqCount, freqCustom) !== (community.activityFrequency ?? '')
    )

    // location dirty判定
    const locationDirty = editedLocations !== null && (
        JSON.stringify(
            editedLocations.map((l) => ({ type: l.type, area: l.area.trim(), station: l.station.trim() })),
        ) !== JSON.stringify(
            (community?.locations ?? []).map((l) => ({ type: l.type, area: l.area, station: l.station ?? '' })),
        )
    )

    // tags dirty判定
    const tagsDirty = JSON.stringify([...editedTags].sort()) !== JSON.stringify([...(community?.tags ?? [])].sort())

    // category dirty判定
    const categoryDirty = selectedCategoryId !== (community?.categories?.[0]?.id ?? '')

    const communityRecommendedEnabled = community?.recommendedLevelMin != null && community?.recommendedLevelMax != null
    const communityRecommendedRange: [number, number] = [
        community?.recommendedLevelMin ?? 0,
        community?.recommendedLevelMax ?? 8,
    ]
    const recommendedLevelDirty =
        recommendedLevelEnabled !== communityRecommendedEnabled ||
        (recommendedLevelEnabled && (
            recommendedLevelRange[0] !== communityRecommendedRange[0] ||
            recommendedLevelRange[1] !== communityRecommendedRange[1]
        ))

    const isDirty = profileDirty || paymentDirty || joinDirty || locationDirty || tagsDirty || categoryDirty || recommendedLevelDirty

    // タグ上限（FEガード）
    const TAG_LIMIT_FREE = 5
    const isFreeGrade = community?.grade === 'FREE'
    const tagLimitReached = isFreeGrade && editedTags.length >= TAG_LIMIT_FREE

    /** タグ追加の共通処理（上限チェック付き） */
    const tryAddTag = () => {
        const trimmed = tagInput.trim().replace(/^#/, '')
        if (!trimmed || editedTags.includes(trimmed)) return
        if (isFreeGrade && editedTags.length >= TAG_LIMIT_FREE) {
            toast.error(`タグを${TAG_LIMIT_FREE + 1}件以上追加するには、プレミアムグレードへアップグレードしてください`)
            return
        }
        setEditedTags((prev) => [...prev, trimmed])
        setTagInput('')
    }

    // #47: 未保存時の離脱警告（早期returnより前に配置）
    const { isBlocked, proceed, cancel } = useUnsavedChangesWarning(isDirty)

    if (isLoading || !community) {
        return <div className="flex items-center justify-center h-64 text-gray-400">読み込み中...</div>
    }

    // 権限チェック
    const currentMembership = membersData?.members.find(m => m.userId === authUser?.userId)
    const isOwner = currentMembership?.role === 'OWNER'
    const isAdmin = currentMembership?.role === 'ADMIN' || isOwner

    if (!isAdmin) {
        return <div className="flex items-center justify-center h-64 text-gray-400">管理者権限が必要です</div>
    }

    const toggle = (s: Section) => setOpenSection(prev => prev === s ? null : s)

    // ---- Handlers ----
    const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const result = await uploadFile(file)
        setLogoUrl(result.url)
    }

    const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const result = await uploadFile(file)
        setCoverUrl(result.url)
    }

    /** #44 + W5-29: プロフィール+支払い+参加設定+タグ+活動拠点を単一APIで一括保存 */
    const handleSaveAll = async () => {
        const frequencyStr = buildFrequencyString(freqUnit, freqCount, freqCustom)

        try {
            await updateCommunity.mutateAsync({
                name: name !== community.name ? name : undefined,
                description: description !== (community.description ?? '') ? description : undefined,
                logoUrl: logoUrl !== community.logoUrl ? logoUrl : undefined,
                coverUrl: coverUrl !== community.coverUrl ? coverUrl : undefined,
                payPayId: payPayId || null,
                enabledPaymentMethods: enabledMethods,
                joinMethod,
                isPublic,
                activityFrequency: frequencyStr || null,
                ...(categoryDirty && selectedCategoryId ? { categoryIds: [selectedCategoryId] } : {}),
                ...(recommendedLevelDirty
                    ? {
                        recommendedLevelMin: recommendedLevelEnabled ? recommendedLevelRange[0] : null,
                        recommendedLevelMax: recommendedLevelEnabled ? recommendedLevelRange[1] : null,
                    }
                    : {}),
                ...(tagsDirty ? { tags: editedTags } : {}),
                ...(locationDirty && editedLocations ? {
                    locations: editedLocations
                        .filter((l) => l.area.trim())
                        .map((l) => ({
                            type: l.type as 'MAIN' | 'SUB',
                            area: l.area.trim(),
                            station: l.station.trim() || undefined,
                        })),
                } : {}),
            })
            toast.success('保存しました')
        } catch {
            toast.error('保存に失敗しました')
        }
    }

    const togglePaymentMethod = (method: string) => {
        if (method === 'CREDIT_CARD' && !isStripeReady) {
            setShowCreditCardConnectDialog(true)
            return
        }
        setEnabledMethods(prev =>
            prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]
        )
    }

    // isPublic=false → 強制 INVITATION（バックエンドのビジネスルールと同期）
    const handlePublicChange = (pub: boolean) => {
        setIsPublic(pub)
        if (!pub) setJoinMethod('INVITATION')
    }

    const handleChangeRole = (userId: string, role: string) => {
        if (confirm(role === 'OWNER' ? 'OWNER権限を委譲しますか？この操作は取り消せません。' : `ロールを ${role} に変更しますか？`)) {
            changeRole.mutate({ userId, role })
        }
    }

    const handleRemoveMember = (userId: string, displayName: string | null) => {
        if (confirm(`${displayName ?? userId} をコミュニティから退室させますか？`)) {
            removeMember.mutate(userId)
        }
    }

    return (
        <div className="space-y-2 pb-24">
            {/* #47: 未保存警告ダイアログ */}
            <UnsavedChangesDialog open={isBlocked} onDiscard={proceed} onCancel={cancel} />

            {/* ===== #44: コミュニティ設定セクション（プロフィール+支払い統合） ===== */}
            <SectionHeader icon={<Users size={18} />} title="コミュニティ設定" section="settings" open={openSection === 'settings'} toggle={toggle} />
            {openSection === 'settings' && (
                <div className="space-y-4 px-4 pb-4">
                    {/* Cover */}
                    <div className="relative">
                        <div
                            className="h-32 rounded-lg bg-gray-100 bg-cover bg-center cursor-pointer"
                            style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : {}}
                            onClick={() => coverInputRef.current?.click()}
                        >
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg opacity-0 hover:opacity-100 transition-opacity">
                                <Camera className="text-white" size={24} />
                            </div>
                        </div>
                        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadCover} />
                    </div>

                    {/* Logo */}
                    <div className="flex items-center gap-4">
                        <div
                            className="relative w-16 h-16 rounded-full bg-gray-200 bg-cover bg-center cursor-pointer flex-shrink-0"
                            style={logoUrl ? { backgroundImage: `url(${logoUrl})` } : {}}
                            onClick={() => logoInputRef.current?.click()}
                        >
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full opacity-0 hover:opacity-100 transition-opacity">
                                <Camera className="text-white" size={16} />
                            </div>
                        </div>
                        <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadLogo} />
                        <div className="flex-1">
                            <label className="text-xs text-gray-500">コミュニティ名</label>
                            <Input value={name} onChange={e => setName(e.target.value)} placeholder="コミュニティ名" maxLength={50} />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-gray-500">説明</label>
                        <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="コミュニティの説明" maxLength={500} />
                        <CharacterCounter current={description.length} max={500} />
                    </div>

                    <Separator className="my-4" />

                    {/* 支払い設定セクション */}
                    <p className="text-xs font-semibold text-gray-500">支払い設定</p>

                    {/* 案B: クレジットカード連携ステータス帯 */}
                    {isOwner && (
                        <div className="rounded-lg border p-3 space-y-2 bg-slate-50 border-slate-200">
                            {community?.grade !== 'PREMIUM' ? (
                                <>
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 bg-gray-400 rounded-full" />
                                        <p className="text-sm font-medium text-gray-700">クレジットカード連携: 利用不可</p>
                                    </div>
                                    <p className="text-xs text-gray-500">PREMIUM グレードで利用できます。</p>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`h-2 w-2 rounded-full ${isStripeReady ? 'bg-green-500' : 'bg-amber-500'}`} />
                                            <p className="text-sm font-medium text-gray-800">クレジットカード連携: {isStripeReady ? '設定済み' : '未設定'}</p>
                                            <button type="button" onClick={() => setShowStripeInfo(v => !v)} className="text-gray-400 hover:text-gray-600">
                                                <HelpCircle className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant={isStripeReady ? 'outline' : 'default'}
                                            onClick={() => startOnboarding.mutate()}
                                            disabled={startOnboarding.isPending}
                                            className="shrink-0"
                                        >
                                            {startOnboarding.isPending ? '処理中...' : isStripeReady ? '登録内容を変更する' : '今すぐ連携'}
                                        </Button>
                                    </div>

                                    <p className="text-xs text-gray-600">
                                        外部サービスとの連携は、設定保存ボタンとは独立して設定できます。
                                    </p>

                                    {showStripeInfo && (
                                        <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs text-gray-500 space-y-1">
                                            <p>
                                                支払いには{' '}
                                                <a href="https://docs.stripe.com/security/stripe" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-0.5">
                                                    Stripe<ExternalLink className="w-3 h-3" />
                                                </a>
                                                {' '}社の決済サービスを利用しています。
                                            </p>
                                            <p className="text-[11px] text-gray-400">※ Tsunaca では個人情報・口座情報を保持しません。</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="text-xs text-gray-500">PayPay ID</label>
                        <Input value={payPayId} onChange={e => {
                            const val = e.target.value
                            setPayPayId(val)
                            // PayPay IDが空になったらPAYPAYを自動で無効化
                            if (!val.trim()) {
                                setEnabledMethods(prev => prev.filter(m => m !== 'PAYPAY'))
                            }
                        }} placeholder="PayPay ID" />
                    </div>

                    <div>
                        <label className="text-xs text-gray-500 block mb-2">有効な支払い方法</label>
                        {([['CASH', '現金'], ['PAYPAY', 'PayPay'], ['CREDIT_CARD', 'クレジットカード']] as const).map(([method, label]) => {
                            const isPayPayDisabled = method === 'PAYPAY' && !payPayId.trim()
                            const isCreditCardBlockedForAdmin = method === 'CREDIT_CARD' && !isStripeReady && !isOwner
                            const isDisabled = isPayPayDisabled || isCreditCardBlockedForAdmin
                            return (
                                <label key={method} className={`flex items-center gap-2 py-1.5 ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                    <input
                                        type="checkbox"
                                        checked={enabledMethods.includes(method)}
                                        onChange={() => togglePaymentMethod(method)}
                                        disabled={isDisabled}
                                        className="rounded"
                                    />
                                    <span className="text-sm">{label}</span>
                                    {isPayPayDisabled && <span className="text-xs text-gray-400">（PayPay IDを入力してください）</span>}
                                    {method === 'CREDIT_CARD' && !isStripeReady && isOwner && (
                                        <span className="text-xs text-gray-400">（選択時に連携案内を表示します）</span>
                                    )}
                                    {method === 'CREDIT_CARD' && !isStripeReady && !isOwner && (
                                        <span className="text-xs text-gray-400">（オーナーが連携設定を完了してください）</span>
                                    )}
                                </label>
                            )
                        })}
                    </div>

                    <Separator className="my-4" />

                    {/* 参加・公開設定 */}
                    <p className="text-xs font-semibold text-gray-500">参加・公開設定</p>
                    <div className="space-y-1.5">
                        <Label>公開設定</Label>
                        <div className="flex gap-2">
                            <Button type="button" variant={isPublic ? 'default' : 'outline'} size="sm" onClick={() => handlePublicChange(true)}>公開</Button>
                            <Button type="button" variant={!isPublic ? 'default' : 'outline'} size="sm" onClick={() => handlePublicChange(false)}>非公開</Button>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label>参加方式</Label>
                        <Select value={joinMethod} onValueChange={(v) => setJoinMethod(v as typeof joinMethod)} disabled={!isPublic}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="FREE_JOIN">自由参加</SelectItem>
                                <SelectItem value="APPROVAL">承認制</SelectItem>
                                <SelectItem value="INVITATION">招待制</SelectItem>
                            </SelectContent>
                        </Select>
                        {!isPublic && (
                            <p className="text-xs text-gray-500">非公開コミュニティは招待制になります</p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label>活動頻度</Label>
                        <div className="flex items-center gap-2">
                            <Select value={freqUnit} onValueChange={(v) => { setFreqUnit(v as '週' | '月' | '年'); setFreqCount(''); setFreqCustom('') }}>
                                <SelectTrigger className="w-24">
                                    <SelectValue placeholder="単位" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="週">週</SelectItem>
                                    <SelectItem value="月">月</SelectItem>
                                    <SelectItem value="年">年</SelectItem>
                                </SelectContent>
                            </Select>
                            {freqUnit && (
                                <FrequencyCountSelect
                                    unit={freqUnit as '週' | '月' | '年'}
                                    value={freqCount}
                                    customValue={freqCustom}
                                    onChange={setFreqCount}
                                    onCustomChange={setFreqCustom}
                                />
                            )}
                            {freqUnit && freqCount && (
                                <span className="text-sm text-gray-600">回</span>
                            )}
                        </div>
                    </div>

                    <Separator />

                    {/* カテゴリ選択（W5-22 + ハイブリッド Combobox） */}
                    <div className="space-y-1.5">
                        <Label>カテゴリ</Label>
                        <CategoryPicker
                            categories={masters?.categories ?? []}
                            selectedId={selectedCategoryId}
                            onChange={(id) => setSelectedCategoryId(id)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label>推奨レベル</Label>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                                type="checkbox"
                                checked={recommendedLevelEnabled}
                                onChange={(e) => {
                                    const checked = e.target.checked
                                    setRecommendedLevelEnabled(checked)
                                    if (!checked) setRecommendedLevelRange([0, 8])
                                }}
                                className="rounded"
                            />
                            設定する
                        </label>
                        {recommendedLevelEnabled ? (
                            <>
                                <p className="text-xs text-gray-500">
                                    {levelLabels[recommendedLevelRange[0]] ?? `Lv${recommendedLevelRange[0]}`}
                                    {' ～ '}
                                    {levelLabels[recommendedLevelRange[1]] ?? `Lv${recommendedLevelRange[1]}`}
                                </p>
                                <Slider
                                    min={0}
                                    max={8}
                                    step={1}
                                    value={recommendedLevelRange}
                                    onValueChange={(v) => setRecommendedLevelRange(v as [number, number])}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-[10px] text-gray-400">
                                    <span>{levelLabels[0] ?? 'Lv0'}</span>
                                    <span>{levelLabels[8] ?? 'Lv8'}</span>
                                </div>
                            </>
                        ) : (
                            <p className="text-xs text-gray-500">推奨レベルを設定すると、メンバーごとのレベル調整が可能になります。</p>
                        )}
                    </div>

                    {/* タグ入力 */}
                    <div className="space-y-1.5">
                        <Label>タグ</Label>
                        <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                            {editedTags.map((tag) => (
                                <span
                                    key={tag}
                                    className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full"
                                >
                                    #{tag}
                                    <button
                                        type="button"
                                        onClick={() => setEditedTags((prev) => prev.filter((t) => t !== tag))}
                                        className="text-blue-400 hover:text-blue-700 ml-0.5"
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Input
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        tryAddTag()
                                    }
                                }}
                                placeholder="タグを入力してEnter（例: 初心者歓迎）"
                                className="flex-1"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={!tagInput.trim() || editedTags.includes(tagInput.trim().replace(/^#/, ''))}
                                onClick={tryAddTag}
                            >
                                追加
                            </Button>
                        </div>
                        {tagLimitReached && (
                            <p className="text-xs text-orange-500">{TAG_LIMIT_FREE + 1}件以上追加するには、プレミアムグレードへアップグレードしてください</p>
                        )}
                    </div>

                    <Separator />

                    <LocationSettings
                        communityId={communityId!}
                        initialLocations={community.locations}
                        onLocationsChange={setEditedLocations}
                    />

                    <Button onClick={handleSaveAll} disabled={!isDirty || updateCommunity.isPending} className="w-full">
                        {updateCommunity.isPending ? '保存中...' : '設定を保存'}
                    </Button>
                </div>
            )}

            {/* ===== Members Section ===== */}
            <SectionHeader icon={<Shield size={18} />} title="メンバー管理" section="members" open={openSection === 'members'} toggle={toggle} />
            {openSection === 'members' && (
                <div className="space-y-1 px-4 pb-4">
                    {communityRecommendedEnabled && (
                        <div className="flex items-center gap-3 flex-wrap py-2">
                            <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setMemberManageMode('role')}
                                    className={`px-3 py-1 text-xs ${memberManageMode === 'role' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                                >
                                    権限管理
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMemberManageMode('level')}
                                    className={`px-3 py-1 text-xs border-l border-gray-300 ${memberManageMode === 'level' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                                >
                                    レベル管理
                                </button>
                            </div>
                            {memberManageMode === 'level' && (
                                <span className="text-xs text-gray-500">レベルはコミュニティのメインカテゴリにおける熟練度を示します。</span>
                            )}
                        </div>
                    )}

                    {membersData?.members
                        .sort((a, b) => roleOrder(a.role) - roleOrder(b.role))
                        .map(member => (
                            <div key={member.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 bg-cover bg-center"
                                    style={member.avatarUrl ? { backgroundImage: `url(${member.avatarUrl})` } : {}} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm truncate">{member.displayName ?? member.userId.slice(0, 8)}</p>
                                    <RoleBadge role={member.role} />
                                </div>

                                {memberManageMode === 'level' && communityRecommendedEnabled && (
                                    <MemberLevelSelect
                                        communityId={communityId!}
                                        userId={member.userId}
                                        displayName={member.displayName}
                                        currentLevel={member.level}
                                    />
                                )}

                                {/* ロール変更・退室ボタン (自分自身 or OWNER以外のメンバーのみ) */}
                                {memberManageMode === 'role' && isOwner && member.userId !== authUser?.userId && (
                                    <div className="flex items-center gap-1">
                                        {member.role !== 'OWNER' && (
                                            <>
                                                {member.role === 'MEMBER' && (
                                                    <button
                                                        onClick={() => handleChangeRole(member.userId, 'ADMIN')}
                                                        className="text-xs text-blue-500 px-2 py-1 rounded hover:bg-blue-50"
                                                        title="ADMINに昇格"
                                                    >
                                                        <Shield size={14} />
                                                    </button>
                                                )}
                                                {member.role === 'ADMIN' && (
                                                    <button
                                                        onClick={() => handleChangeRole(member.userId, 'MEMBER')}
                                                        className="text-xs text-gray-500 px-2 py-1 rounded hover:bg-gray-50"
                                                        title="MEMBERに降格"
                                                    >
                                                        <Users size={14} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleChangeRole(member.userId, 'OWNER')}
                                                    className="text-xs text-amber-500 px-2 py-1 rounded hover:bg-amber-50"
                                                    title="OWNER委譲"
                                                >
                                                    <Crown size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleRemoveMember(member.userId, member.displayName)}
                                                    className="text-xs text-red-500 px-2 py-1 rounded hover:bg-red-50"
                                                    title="退室させる"
                                                >
                                                    <UserMinus size={14} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                                {/* ADMIN は MEMBER のみ退室可能 */}
                                {memberManageMode === 'role' && !isOwner && isAdmin && member.role === 'MEMBER' && member.userId !== authUser?.userId && (
                                    <button
                                        onClick={() => handleRemoveMember(member.userId, member.displayName)}
                                        className="text-xs text-red-500 px-2 py-1 rounded hover:bg-red-50"
                                        title="退室させる"
                                    >
                                        <UserMinus size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                </div>
            )}

            {/* ===== Audit Log Section (#45: コミュニティ設定変更履歴) ===== */}
            <SectionHeader icon={<History size={18} />} title="コミュニティ設定変更履歴" section="audit" open={openSection === 'audit'} toggle={toggle} />
            {openSection === 'audit' && (
                <div className="space-y-1 px-4 pb-4 max-h-96 overflow-y-auto">
                    {auditData?.logs.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-4">設定変更履歴はまだありません</p>
                    )}
                    {auditData?.logs.map(log => (
                        <div key={log.id} className="text-sm py-2 border-b border-gray-50 last:border-0">
                            <p className="text-gray-700">{formatAuditSummary(log)}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {log.actorDisplayName ?? log.actorUserId.slice(0, 8)}
                                {' · '}
                                {new Date(log.createdAt).toLocaleString('ja-JP')}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* ===== コミュニティ退出（OWNER以外） ===== */}
            {!isOwner && (
                <div className="px-4 pt-6 pb-4">
                    <Separator className="mb-6" />
                    <Button
                        variant="outline"
                        className="w-full text-destructive border-destructive hover:bg-destructive/10"
                        onClick={() => setShowLeaveDialog(true)}
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        コミュニティを退出
                    </Button>
                </div>
            )}

            {/* コミュニティ退出確認ダイアログ */}
            <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>コミュニティを退出</DialogTitle>
                        <DialogDescription>
                            {community.name} から退出しますか？将来のスケジュール参加も自動的にキャンセルされます。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">キャンセル</Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            disabled={leaveCommunity.isPending}
                            onClick={() => {
                                leaveCommunity.mutate({ communityId: communityId! }, {
                                    onSuccess: () => {
                                        setShowLeaveDialog(false)
                                        toast.success('コミュニティを退出しました')
                                        navigate('/communities', { replace: true })
                                    },
                                })
                            }}
                        >
                            {leaveCommunity.isPending ? '退出中...' : '退出する'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 案C: 未連携時にCREDIT_CARD選択で表示する案内モーダル */}
            <Dialog open={showCreditCardConnectDialog} onOpenChange={setShowCreditCardConnectDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>クレジットカード決済の連携が必要です</DialogTitle>
                        <DialogDescription>
                            クレジットカード決済を利用するには、外部サービスとの連携を先に完了してください。
                            この操作は設定保存ボタンとは独立して、そのまま開始できます。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">後で設定する</Button>
                        </DialogClose>
                        <Button
                            onClick={() => {
                                startOnboarding.mutate()
                                setShowCreditCardConnectDialog(false)
                            }}
                            disabled={startOnboarding.isPending || !isOwner}
                        >
                            {startOnboarding.isPending ? '処理中...' : isOwner ? '連携を開始する' : 'オーナーに依頼してください'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// ---- Helper components ----

function SectionHeader({
    icon,
    title,
    section,
    open,
    toggle,
}: {
    icon: React.ReactNode
    title: string
    section: Section
    open: boolean
    toggle: (s: Section) => void
}) {
    return (
        <button
            onClick={() => toggle(section)}
            className="flex items-center gap-2 w-full px-4 py-3 bg-white hover:bg-gray-50 text-left"
        >
            {icon}
            <span className="flex-1 text-sm font-medium">{title}</span>
            {open ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
        </button>
    )
}

function RoleBadge({ role }: { role: string }) {
    const styles: Record<string, string> = {
        OWNER: 'bg-amber-100 text-amber-700',
        ADMIN: 'bg-blue-100 text-blue-700',
        MEMBER: 'bg-gray-100 text-gray-600',
    }
    return <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full ${styles[role] ?? styles.MEMBER}`}>{role}</span>
}

function roleOrder(role: string): number {
    return role === 'OWNER' ? 0 : role === 'ADMIN' ? 1 : 2
}

// ---- 活動頻度 ----

/** 単位に応じた数値選択肢を返す */
function getCountOptions(unit: '週' | '月' | '年'): number[] {
    switch (unit) {
        case '月': return [1, 2, 3]
        case '週': return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
        case '年': return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    }
}

/** freqUnit + freqCount → "週3回" 形式の文字列を生成 */
function buildFrequencyString(unit: string, count: string, custom: string): string {
    if (!unit) return ''
    const c = custom || count
    if (!c) return ''
    return `${unit}${c}回`
}

/** 数値プルダウン（週のみ手入力可能） */
function FrequencyCountSelect({
    unit,
    value,
    customValue,
    onChange,
    onCustomChange,
}: {
    unit: '週' | '月' | '年'
    value: string
    customValue: string
    onChange: (v: string) => void
    onCustomChange: (v: string) => void
}) {
    const options = getCountOptions(unit)
    const showCustomInput = unit === '週' && value === 'custom'

    return (
        <div className="flex items-center gap-1.5">
            <Select
                value={value}
                onValueChange={(v) => {
                    onChange(v)
                    if (v !== 'custom') onCustomChange('')
                }}
            >
                <SelectTrigger className="w-24">
                    <SelectValue placeholder="回数" />
                </SelectTrigger>
                <SelectContent>
                    {options.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                            {n}
                        </SelectItem>
                    ))}
                    {unit === '週' && (
                        <SelectItem value="custom">その他</SelectItem>
                    )}
                </SelectContent>
            </Select>
            {showCustomInput && (
                <Input
                    type="number"
                    min={1}
                    value={customValue}
                    onChange={(e) => onCustomChange(e.target.value)}
                    placeholder="回数"
                    className="w-20 h-9"
                />
            )}
        </div>
    )
}
