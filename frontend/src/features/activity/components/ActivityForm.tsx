import { useAuth } from '@/app/providers/AuthProvider'
import { activityApi } from '@/features/activity/api/activityApi'
import { OsmAttributionInfo } from '@/features/activity/components/OsmAttributionInfo'
import { PlaceCombobox } from '@/features/activity/components/PlaceCombobox'
import { useActivities } from '@/features/activity/hooks/useActivityQueries'
import { useMembers } from '@/features/community/hooks/useMemberQueries'
import { Button } from '@/shared/components/ui/button'
import { CharacterCounter } from '@/shared/components/ui/CharacterCounter'
import {
    Dialog,
    DialogContent,
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
import type { Member } from '@/shared/types/api'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, History } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

// ─── 定数 ────────────────────────────────────────────────

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const
const DAY_RRULE = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const

/** 選択中の日付から繰り返しオプションを動的に生成 */
function buildRepeatOptions(dateStr: string) {
    const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date()
    const dayIdx = d.getDay()
    const dayLabel = DAY_LABELS[dayIdx]
    const weekNum = Math.ceil(d.getDate() / 7)
    return [
        { value: 'none', label: '繰り返しなし' },
        { value: 'daily', label: '毎日' },
        { value: 'weekly', label: `毎週${dayLabel}曜日` },
        { value: 'monthly_nth', label: `毎月第${weekNum}${dayLabel}曜日` },
        { value: 'weekday', label: '毎週平日' },
        { value: 'custom', label: 'カスタム' },
    ]
}

/**
 * Repeat選択値からRRULE文字列へ変換するヘルパー
 * 'none' → null（繰り返しなし）
 */
function repeatToRRule(repeatValue: string, dateStr: string): string | null {
    const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date()
    const dayIdx = d.getDay()
    const dayRrule = DAY_RRULE[dayIdx]
    const weekNum = Math.ceil(d.getDate() / 7)
    switch (repeatValue) {
        case 'daily':
            return 'FREQ=DAILY'
        case 'weekly':
            return `FREQ=WEEKLY;BYDAY=${dayRrule}`
        case 'monthly_nth':
            return `FREQ=MONTHLY;BYDAY=${weekNum}${dayRrule}`
        case 'weekday':
            return 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'
        case 'custom':
            return 'FREQ=WEEKLY'
        case 'none':
        default:
            return null
    }
}

/**
 * RRULE文字列からRepeat選択値へ逆変換するヘルパー
 */
function rruleToRepeat(rrule: string | null | undefined): string {
    if (!rrule) return 'none'
    const upper = rrule.toUpperCase()
    if (upper === 'FREQ=DAILY') return 'daily'
    if (upper === 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR') return 'weekday'
    if (upper.startsWith('FREQ=WEEKLY;BYDAY=')) return 'weekly'
    if (upper.startsWith('FREQ=MONTHLY;BYDAY=')) return 'monthly_nth'
    return 'custom'
}

const VISIBILITY_OPTIONS = [
    { value: 'private', label: '非公開' },
    { value: 'public', label: '公開' },
] as const

/** 15 分刻みの時刻オプション (09:00 〜 翌 08:45 の順で表示) */
const TIME_OPTIONS: { value: string; label: string }[] = (() => {
    const opts: { value: string; label: string }[] = []
    // 9:00 〜 23:45
    for (let h = 9; h < 24; h++) {
        for (const m of [0, 15, 30, 45]) {
            const hh = String(h).padStart(2, '0')
            const mm = String(m).padStart(2, '0')
            opts.push({ value: `${hh}:${mm}`, label: `${hh}:${mm}` })
        }
    }
    // 0:00 〜 8:45
    for (let h = 0; h < 9; h++) {
        for (const m of [0, 15, 30, 45]) {
            const hh = String(h).padStart(2, '0')
            const mm = String(m).padStart(2, '0')
            opts.push({ value: `${hh}:${mm}`, label: `${hh}:${mm}` })
        }
    }
    return opts
})()

// ─── Zod Schema ──────────────────────────────────────────

/** HH:mm に minutes を加算して HH:mm を返す */
function addMinutesToTime(time: string, minutes: number): string {
    const [h, m] = time.split(':').map(Number)
    const total = h * 60 + m + minutes
    const hh = String(Math.floor(total / 60) % 24).padStart(2, '0')
    const mm = String(total % 60).padStart(2, '0')
    return `${hh}:${mm}`
}

const MAX_FEE = 100_000
const FEE_MAX_MESSAGE = `参加費は${MAX_FEE.toLocaleString()}円以下で設定してください`

const feeStringSchema = z.string().refine(
    (v) => v === '' || Number(v) <= MAX_FEE,
    { message: FEE_MAX_MESSAGE },
)

const activityFormSchema = z.object({
    title: z.string().min(1, 'アクティビティ名を入力してください').max(100, 'アクティビティ名は100文字以内で入力してください'),
    description: z.string().max(500, '説明は500文字以内で入力してください'),
    defaultLocationCustom: z.string(),
    defaultPlaceId: z.string(),
    date: z.string().min(1, '開催日を入力してください'),
    defaultStartTime: z.string(),
    defaultEndTime: z.string(),
    organizerUserId: z.string(),
    repeat: z.string(),
    recurrenceGenerationMonths: z.string(),
    visibility: z.string(),
    participationFee: feeStringSchema,
    visitorFee: feeStringSchema,
    isOnline: z.boolean(),
    meetingUrl: z.string().refine(
        (v) => v === '' || /^https?:\/\/.+/.test(v),
        { message: '有効なURLを入力してください' },
    ),
    hasCapacity: z.boolean(),
    capacity: z.string().refine(
        (v) => v === '' || (Number.isInteger(Number(v)) && Number(v) >= 1),
        { message: '1以上の整数を入力してください' },
    ),
    shouldPostAnnouncement: z.boolean(),
    // --- edit mode: Activity defaults ---
    defaultParticipationFee: feeStringSchema,
    defaultVisitorFee: feeStringSchema,
    hasDefaultCapacity: z.boolean(),
    defaultCapacity: z.string(),
    allowVisitorWaitlist: z.boolean(),
}).refine(
    (data) => {
        if (data.defaultStartTime && data.defaultEndTime) {
            return data.defaultStartTime < data.defaultEndTime
        }
        return true
    },
    {
        message: '終了時刻は開始時刻より後にしてください',
        path: ['defaultEndTime'],
    },
)

type ActivityFormSchema = z.infer<typeof activityFormSchema>

// ─── Props ───────────────────────────────────────────────

export interface ActivityFormValues {
    title: string
    defaultLocationCustom: string
    defaultPlaceId: string
    date: string
    organizerUserId: string
    repeat: string
    recurrenceRule: string | null
    recurrenceGenerationMonths: number | null
    visibility: string
    description: string
    defaultStartTime: string
    defaultEndTime: string
    participationFee: number
    visitorFee: number | null
    isOnline: boolean
    meetingUrl: string | null
    capacity: number | null
    shouldPostAnnouncement: boolean  // Phase3 #4
    // --- edit mode: Activity defaults ---
    defaultParticipationFee: number | null
    defaultVisitorFee: number | null
    defaultCapacity: number | null
    allowVisitorWaitlist: boolean
}

interface ActivityFormProps {
    communityId: string
    initialValues?: Partial<ActivityFormValues>
    submitLabel: string
    onSubmit: (values: ActivityFormValues) => void | Promise<void>
    isPending?: boolean
    /** 親から渡されるエラーメッセージ（API エラー等） */
    error?: string | null
    /** true の場合、過去日付のバリデーションをスキップ（編集時に既存の日付を保持する場合） */
    allowPastDate?: boolean
    /** 編集モードの場合 true。Activity デフォルト設定セクションを表示 */
    isEditMode?: boolean
}

/**
 * ActivityForm — アクティビティ作成/更新で共通利用するフォーム
 *
 * モックアップ準拠のフィールド:
 * - Activity Name / Location / Datetime
 * - Organizer (メンバー検索ドロップダウン)
 * - Repeat (UIのみ、送信なし)
 * - Visibility (UIのみ)
 */
export function ActivityForm({
    communityId,
    initialValues,
    submitLabel,
    onSubmit,
    isPending,
    error,
    allowPastDate,
    isEditMode,
}: ActivityFormProps) {
    const { user } = useAuth()
    const {
        register,
        handleSubmit,
        control,
        watch,
        setValue,
        setError,
        clearErrors,
        formState: { errors },
    } = useForm<ActivityFormSchema>({
        resolver: zodResolver(activityFormSchema),
        defaultValues: {
            title: initialValues?.title ?? '',
            description: initialValues?.description ?? '',
            defaultLocationCustom: initialValues?.defaultLocationCustom ?? '',
            defaultPlaceId: initialValues?.defaultPlaceId ?? '',
            date: initialValues?.date ?? '',
            defaultStartTime: initialValues?.defaultStartTime ?? '',
            defaultEndTime: initialValues?.defaultEndTime ?? '',
            organizerUserId: initialValues?.organizerUserId ?? user?.userId ?? '',
            repeat: initialValues?.repeat ?? rruleToRepeat(initialValues?.recurrenceRule),
            recurrenceGenerationMonths: initialValues?.recurrenceGenerationMonths != null
                ? String(initialValues.recurrenceGenerationMonths) : '2',
            visibility: initialValues?.visibility ?? 'private',
            participationFee: initialValues?.participationFee != null ? String(initialValues.participationFee) : '',
            visitorFee: initialValues?.visitorFee != null ? String(initialValues.visitorFee) : '',
            isOnline: initialValues?.isOnline ?? false,
            meetingUrl: initialValues?.meetingUrl ?? '',
            hasCapacity: initialValues?.capacity != null,
            capacity: initialValues?.capacity != null ? String(initialValues.capacity) : '',
            shouldPostAnnouncement: false,
            // --- edit mode: Activity defaults ---
            defaultParticipationFee: initialValues?.defaultParticipationFee != null ? String(initialValues.defaultParticipationFee) : '',
            defaultVisitorFee: initialValues?.defaultVisitorFee != null ? String(initialValues.defaultVisitorFee) : '',
            hasDefaultCapacity: initialValues?.defaultCapacity != null,
            defaultCapacity: initialValues?.defaultCapacity != null ? String(initialValues.defaultCapacity) : '',
            allowVisitorWaitlist: initialValues?.allowVisitorWaitlist ?? false,
        },
    })

    const registerFee = useCallback(
        (name: 'participationFee' | 'visitorFee') => {
            const { onChange, ...rest } = register(name)
            return {
                ...rest,
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                    onChange(e)
                    const v = Number(e.target.value)
                    if (e.target.value !== '' && v > MAX_FEE) {
                        setError(name, { type: 'manual', message: FEE_MAX_MESSAGE })
                    } else {
                        clearErrors(name)
                    }
                },
            }
        },
        [register, setError, clearErrors],
    )

    const [organizerSearch, setOrganizerSearch] = useState('')
    const [showOrganizerDropdown, setShowOrganizerDropdown] = useState(false)
    const [isCustomCapacity, setIsCustomCapacity] = useState(() => {
        // 初期値が既存候補にない場合はカスタム入力モードにする
        if (initialValues?.capacity == null) return false
        return true // 初回は capacityOptions 未確定なので後で再判定
    })

    // --- 履歴から入力 ---
    const [showHistoryDialog, setShowHistoryDialog] = useState(false)
    const [historyLoading, setHistoryLoading] = useState<string | null>(null)
    // W6-06: 履歴モーダル内で「開備日」を入力させ、選択時にフォーム本体の date へ反映する。
    // 作成画面ルールと整合させるため過去日付は不可。
    const [historyDate, setHistoryDate] = useState<string>('')
    const { data: activitiesData } = useActivities(communityId)
    const pastActivities = useMemo(() => (activitiesData?.activities ?? []).slice(0, 10), [activitiesData])

    const applyHistory = async (activityId: string) => {
        setHistoryLoading(activityId)
        try {
            const detail = await activityApi.findById(activityId)
            setValue('title', detail.title)
            setValue('description', detail.description ?? '')
            setValue('defaultLocationCustom', detail.defaultLocationCustom ?? '')
            setValue('defaultPlaceId', detail.defaultPlaceId ?? '')
            setValue('defaultStartTime', detail.defaultStartTime ?? '')
            setValue('defaultEndTime', detail.defaultEndTime ?? '')
            setValue('organizerUserId', detail.organizerUserId ?? user?.userId ?? '')
            setValue('participationFee', detail.defaultParticipationFee != null ? String(detail.defaultParticipationFee) : '')
            setValue('visitorFee', detail.defaultVisitorFee != null ? String(detail.defaultVisitorFee) : '')
            if (detail.defaultCapacity != null) {
                setValue('hasCapacity', true)
                setValue('capacity', String(detail.defaultCapacity))
                setIsCustomCapacity(true)
            } else {
                setValue('hasCapacity', false)
                setValue('capacity', '')
                setIsCustomCapacity(false)
            }
            setValue('allowVisitorWaitlist', detail.allowVisitorWaitlist)
            setValue('repeat', rruleToRepeat(detail.recurrenceRule))
            // W6-06: モーダルで選択した開備日をフォーム本体に反映
            if (historyDate) setValue('date', historyDate)
            setShowHistoryDialog(false)
        } finally {
            setHistoryLoading(null)
        }
    }

    // Organizer 検索用のメンバー一覧
    const { data: membersData } = useMembers(communityId)
    const members = membersData?.members ?? []

    const filteredMembers = useMemo(() => {
        if (!organizerSearch.trim()) return members.slice(0, 10)
        const q = organizerSearch.toLowerCase()
        return members.filter((m: Member) =>
            m.userId.toLowerCase().includes(q) ||
            (m.displayName && m.displayName.toLowerCase().includes(q))
        ).slice(0, 10)
    }, [members, organizerSearch])

    const organizerUserId = watch('organizerUserId')
    const selectedMember = members.find((m: Member) => m.userId === organizerUserId)

    // 日付に基づく繰り返しオプション
    const date = watch('date')
    const repeatOptions = useMemo(() => buildRepeatOptions(date), [date])

    // 過去日付制限用の today
    const today = useMemo(() => new Date().toISOString().split('T')[0], [])

    // メンバー数に基づく定員候補 (20%刻み)
    const capacityOptions = useMemo(() => {
        const count = members.length
        if (count === 0) return [5, 10, 15, 20, 25, 30]
        const step = Math.max(1, Math.round(count * 0.2))
        const opts: number[] = []
        for (let i = step; i <= count + step; i += step) {
            opts.push(i)
        }
        return opts
    }, [members.length])

    // capacityOptions が確定したら、初期値がリストにあるか再判定
    const capacityVal = watch('capacity')
    const resolvedIsCustom = useMemo(() => {
        if (!watch('hasCapacity') || !capacityVal) return false
        return !capacityOptions.includes(Number(capacityVal))
    }, [capacityOptions, capacityVal])

    const onFormSubmit = async (data: ActivityFormSchema) => {
        await onSubmit({
            title: data.title.trim(),
            description: data.description.trim(),
            defaultLocationCustom: data.isOnline ? '' : data.defaultLocationCustom.trim(),
            defaultPlaceId: data.isOnline ? '' : data.defaultPlaceId,
            date: data.date,
            organizerUserId: data.organizerUserId,
            repeat: data.repeat,
            recurrenceRule: repeatToRRule(data.repeat, data.date),
            recurrenceGenerationMonths: data.repeat !== 'none' && data.recurrenceGenerationMonths
                ? Number(data.recurrenceGenerationMonths) : null,
            visibility: data.visibility,
            defaultStartTime: data.defaultStartTime,
            defaultEndTime: data.defaultEndTime,
            participationFee: data.participationFee ? Number(data.participationFee) : 0,
            visitorFee: data.visitorFee ? Number(data.visitorFee) : null,
            isOnline: data.isOnline,
            meetingUrl: data.isOnline && data.meetingUrl.trim() ? data.meetingUrl.trim() : null,
            capacity: data.hasCapacity && data.capacity ? Number(data.capacity) : null,
            shouldPostAnnouncement: data.shouldPostAnnouncement,
            // --- edit mode: Activity defaults ---
            defaultParticipationFee: data.defaultParticipationFee ? Number(data.defaultParticipationFee) : null,
            defaultVisitorFee: data.defaultVisitorFee ? Number(data.defaultVisitorFee) : null,
            defaultCapacity: data.hasDefaultCapacity && data.defaultCapacity ? Number(data.defaultCapacity) : null,
            allowVisitorWaitlist: data.allowVisitorWaitlist,
        })
    }

    return (
        <form onSubmit={handleSubmit(onFormSubmit)} className="max-w-lg mx-auto px-4 py-6 space-y-5">
            {/* 履歴から入力（作成モードのみ） */}
            {!isEditMode && (
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={() => setShowHistoryDialog(true)}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                    >
                        <History className="w-4 h-4" />
                        履歴から入力
                    </button>
                </div>
            )}

            {/* 履歴選択ダイアログ */}
            <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
                <DialogContent className="max-w-sm max-h-[70vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>過去のアクティビティから入力</DialogTitle>
                    </DialogHeader>
                    {/* W6-06: 開備日入力（過去不可） */}
                    <div className="space-y-1.5 px-1">
                        <Label htmlFor="history-date" className="text-sm">開備日</Label>
                        <Input
                            id="history-date"
                            type="date"
                            value={historyDate}
                            min={today}
                            onChange={(e) => setHistoryDate(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">選択したアクティビティにこの開備日を適用します。</p>
                    </div>
                    <div className="flex-1 overflow-y-auto -mx-6 px-6">
                        {pastActivities.length === 0 ? (
                            <p className="py-8 text-sm text-muted-foreground text-center">履歴がありません</p>
                        ) : (
                            <ul className="divide-y">
                                {pastActivities.map((a) => (
                                    <li key={a.id}>
                                        <button
                                            type="button"
                                            disabled={historyLoading != null || !historyDate}
                                            onClick={() => applyHistory(a.id)}
                                            className="w-full text-left px-1 py-3 hover:bg-muted/50 rounded transition-colors disabled:opacity-50"
                                        >
                                            <p className="text-sm font-medium truncate">{a.title}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                                {a.defaultLocationCustom ?? ''}
                                                {a.defaultStartTime ? ` ${a.defaultStartTime}` : ''}
                                                {a.defaultEndTime ? `〜${a.defaultEndTime}` : ''}
                                            </p>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* アクティビティ名 */}
            <div className="space-y-1.5">
                <Label htmlFor="activityName">アクティビティ名</Label>
                <Input
                    id="activityName"
                    placeholder="アクティビティ名を入力"
                    maxLength={100}
                    {...register('title')}
                />
                {errors.title && (
                    <p className="text-sm text-destructive">{errors.title.message}</p>
                )}
            </div>

            {/* 開催形式 */}
            <div className="space-y-1.5">
                <Label>開催形式</Label>
                <Controller
                    name="isOnline"
                    control={control}
                    render={({ field }) => (
                        <div className="flex gap-4">
                            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                                <input
                                    type="radio"
                                    checked={!field.value}
                                    onChange={() => field.onChange(false)}
                                    className="accent-blue-600"
                                />
                                オフライン
                            </label>
                            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                                <input
                                    type="radio"
                                    checked={field.value}
                                    onChange={() => field.onChange(true)}
                                    className="accent-blue-600"
                                />
                                オンライン
                            </label>
                        </div>
                    )}
                />
            </div>
            {watch('isOnline') && (
                <div className="space-y-1.5">
                    <Label htmlFor="meetingUrl">会議URL（任意）</Label>
                    <Input
                        id="meetingUrl"
                        type="url"
                        placeholder="https://..."
                        {...register('meetingUrl')}
                    />
                </div>
            )}

            {/* 開催場所（オフライン時のみ表示） */}
            {!watch('isOnline') && (
                <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                        <Label htmlFor="location">開催場所</Label>
                        <OsmAttributionInfo />
                    </div>
                    <PlaceCombobox
                        inputValue={watch('defaultLocationCustom')}
                        placeId={watch('defaultPlaceId')}
                        onInputChange={(text) => setValue('defaultLocationCustom', text)}
                        onSelect={(place) => {
                            if (place) {
                                setValue('defaultPlaceId', place.id)
                                setValue('defaultLocationCustom', place.name)
                            } else {
                                setValue('defaultPlaceId', '')
                            }
                        }}
                    />
                </div>
            )}

            {/* 日付 */}
            <div className="space-y-1.5">
                <Label htmlFor="date">日付</Label>
                <Input
                    id="date"
                    type="date"
                    min={allowPastDate ? undefined : today}
                    {...register('date')}
                />
                {errors.date && (
                    <p className="text-sm text-destructive">{errors.date.message}</p>
                )}
            </div>

            {/* 開始時刻・終了時刻 (15分刻み) */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label>開始時刻</Label>
                    <Controller
                        name="defaultStartTime"
                        control={control}
                        render={({ field }) => (
                            <Select
                                value={field.value}
                                onValueChange={(val) => {
                                    field.onChange(val)
                                    // 開始時刻変更時に終了時刻を +60min に自動セット
                                    setValue('defaultEndTime', addMinutesToTime(val, 60))
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="--:--" />
                                </SelectTrigger>
                                <SelectContent side="bottom" sideOffset={4}>
                                    {TIME_OPTIONS.map((t) => (
                                        <SelectItem key={t.value} value={t.value}>
                                            {t.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label>終了時刻</Label>
                    <Controller
                        name="defaultEndTime"
                        control={control}
                        render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="--:--" />
                                </SelectTrigger>
                                <SelectContent side="bottom" sideOffset={4}>
                                    {TIME_OPTIONS.map((t) => (
                                        <SelectItem key={t.value} value={t.value}>
                                            {t.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.defaultEndTime && (
                        <p className="text-sm text-destructive">{errors.defaultEndTime.message}</p>
                    )}
                </div>
            </div>

            {/* 幹事 */}
            <div className="space-y-1.5">
                <Label>幹事</Label>
                <div className="relative">
                    <div className="flex items-center gap-2 border rounded-md px-3 py-2">
                        {organizerUserId ? (
                            selectedMember ? (
                                <span className="text-sm font-medium">{selectedMember.displayName ?? selectedMember.userId}</span>
                            ) : (
                                <span className="text-sm font-medium text-gray-500">{organizerUserId}</span>
                            )
                        ) : (
                            <span className="text-sm text-gray-400">未定</span>
                        )}
                        <Input
                            value={organizerSearch}
                            onChange={(e) => {
                                setOrganizerSearch(e.target.value)
                                setShowOrganizerDropdown(true)
                            }}
                            onFocus={() => setShowOrganizerDropdown(true)}
                            placeholder="🔍 メンバーを検索"
                            className="border-0 p-0 h-auto focus-visible:ring-0 text-sm flex-1"
                        />
                    </div>
                    {showOrganizerDropdown && (
                        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                            {/* 未定オプション */}
                            <button
                                type="button"
                                onClick={() => {
                                    setValue('organizerUserId', '')
                                    setOrganizerSearch('')
                                    setShowOrganizerDropdown(false)
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm text-left"
                            >
                                <div className="w-6 h-6 bg-gray-100 rounded-full shrink-0 flex items-center justify-center text-xs text-gray-400">?</div>
                                <span className="text-gray-500">未定</span>
                            </button>
                            {filteredMembers.map((m: Member) => (
                                <button
                                    key={m.userId}
                                    type="button"
                                    onClick={() => {
                                        setValue('organizerUserId', m.userId)
                                        setOrganizerSearch('')
                                        setShowOrganizerDropdown(false)
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm text-left"
                                >
                                    <div className="w-6 h-6 bg-gray-200 rounded-full shrink-0" />
                                    <span>{m.displayName ?? m.userId}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* 繰り返し */}
            <div className="space-y-1.5">
                <Label>繰り返し</Label>
                <Controller
                    name="repeat"
                    control={control}
                    render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent side="bottom" sideOffset={4}>
                                {repeatOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
            </div>

            {/* 繰り返し生成期間（繰り返し選択時のみ表示） */}
            {watch('repeat') !== 'none' && (
                <div className="space-y-1.5">
                    <Label>スケジュール生成期間</Label>
                    <Controller
                        name="recurrenceGenerationMonths"
                        control={control}
                        render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent side="bottom" sideOffset={4}>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                                        <SelectItem key={m} value={String(m)}>
                                            {m}ヶ月先まで
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    <p className="text-xs text-gray-400">繰り返しスケジュールを何ヶ月先まで自動生成するか指定します（デフォルト: 2ヶ月）</p>
                </div>
            )}

            {/* 公開設定 */}
            <div className="space-y-1.5">
                <Label>公開設定</Label>
                <Controller
                    name="visibility"
                    control={control}
                    render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent side="bottom" sideOffset={4}>
                                {VISIBILITY_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
            </div>

            {/* 参加費 */}
            <div className="space-y-1.5">
                <Label htmlFor="participationFee">参加費（円）</Label>
                <Input
                    id="participationFee"
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0（無料の場合は0または空欄）"
                    {...registerFee('participationFee')}
                />
                {errors.participationFee && (
                    <p className="text-sm text-destructive">{errors.participationFee.message}</p>
                )}
            </div>

            {/* ビジター参加費 */}
            <div className="space-y-1.5">
                <Label htmlFor="visitorFee">ビジター参加費（円・任意）</Label>
                <Input
                    id="visitorFee"
                    type="number"
                    min={0}
                    step={1}
                    placeholder="未設定の場合はメンバーと同額"
                    {...registerFee('visitorFee')}
                />
                {errors.visitorFee ? (
                    <p className="text-sm text-destructive">{errors.visitorFee.message}</p>
                ) : (
                    <p className="text-xs text-muted-foreground">
                        ビジター（非会員）向けの参加費。空欄の場合はメンバーと同額になります。
                    </p>
                )}
            </div>

            {/* 定員 */}
            <div className="space-y-1.5">
                <Label>定員</Label>
                <Controller
                    name="hasCapacity"
                    control={control}
                    render={({ field }) => (
                        <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={field.value}
                                    onChange={(e) => {
                                        field.onChange(e.target.checked)
                                        if (!e.target.checked) setValue('capacity', '')
                                    }}
                                    className="accent-blue-600"
                                />
                                定員を設定する
                            </label>
                        </div>
                    )}
                />
                {watch('hasCapacity') && (
                    <div className="space-y-2">
                        {(isCustomCapacity || resolvedIsCustom) ? (
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    min={1}
                                    placeholder="人数を入力"
                                    className="w-40"
                                    {...register('capacity')}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCustomCapacity(false)
                                        setValue('capacity', '')
                                    }}
                                    className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                                >
                                    リストから選択
                                </button>
                            </div>
                        ) : (
                            <Controller
                                name="capacity"
                                control={control}
                                render={({ field }) => (
                                    <div className="flex items-center gap-2">
                                        <Select
                                            value={field.value}
                                            onValueChange={(val) => {
                                                if (val === '__custom__') {
                                                    setIsCustomCapacity(true)
                                                    field.onChange('')
                                                } else {
                                                    field.onChange(val)
                                                }
                                            }}
                                        >
                                            <SelectTrigger className="w-40">
                                                <SelectValue placeholder="人数を選択" />
                                            </SelectTrigger>
                                            <SelectContent side="bottom" sideOffset={4}>
                                                {capacityOptions.map((n) => (
                                                    <SelectItem key={n} value={String(n)}>
                                                        {n}人
                                                    </SelectItem>
                                                ))}
                                                <SelectItem value="__custom__">
                                                    その他（手入力）
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* 説明 */}
            <div className="space-y-1.5">
                <Label htmlFor="description">説明</Label>
                <textarea
                    id="description"
                    placeholder="説明を入力"
                    rows={3}
                    maxLength={500}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    {...register('description')}
                />
                {errors.description && (
                    <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
                <CharacterCounter current={watch('description')?.length ?? 0} max={500} />
            </div>

            {/* Phase3 #4: お知らせ同時投稿 */}
            <div className="space-y-1.5">
                <Controller
                    name="shouldPostAnnouncement"
                    control={control}
                    render={({ field }) => (
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                checked={field.value}
                                onChange={(e) => field.onChange(e.target.checked)}
                                className="accent-blue-600"
                            />
                            お知らせも同時に投稿する
                        </label>
                    )}
                />
            </div>

            {/* ビジターキャンセル待ち許可 */}
            <div className="space-y-1.5">
                <Controller
                    name="allowVisitorWaitlist"
                    control={control}
                    render={({ field }) => (
                        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                checked={field.value}
                                onChange={(e) => field.onChange(e.target.checked)}
                                className="accent-blue-600"
                            />
                            ビジターのキャンセル待ちを許可する
                        </label>
                    )}
                />
                <p className="text-xs text-muted-foreground">
                    有効にすると、ビジター（非会員）もキャンセル待ちに登録できます。
                </p>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Submit */}
            <div className="pt-2">
                <Button type="submit" className="w-full" disabled={isPending}>
                    {isPending ? '処理中...' : submitLabel}
                </Button>
            </div>
        </form>
    )
}
