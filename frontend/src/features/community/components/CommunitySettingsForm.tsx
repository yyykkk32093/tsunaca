/**
 * CommunitySettingsForm — 共通フォームコンポーネント
 *
 * CommunityCreatePage (Step2, Step3) と CreateSubCommunityPage (Step2, Step3) で共有。
 * 参加・活動設定 + カテゴリ・タグ入力を提供する。
 */
import { CategoryPicker } from '@/features/community/components/CategoryPicker'
import { LocationSettings, type LocationEntry } from '@/features/community/components/LocationSettings'
import { useCommunityMasters } from '@/features/community/hooks/useCommunityQueries'
import { useParticipationLevelLabels } from '@/features/master/hooks/useParticipationLevels'
import { Badge } from '@/shared/components/ui/badge'
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
import { Slider } from '@/shared/components/ui/slider'

// ── 定数（外部からも参照可能） ──

export const JOIN_METHOD_OPTIONS = [
    { value: 'FREE_JOIN', label: '自由参加' },
    { value: 'APPROVAL', label: '承認制' },
    { value: 'INVITATION', label: '招待制' },
] as const

export const DAY_OPTIONS = [
    { value: 'MON', label: '月' },
    { value: 'TUE', label: '火' },
    { value: 'WED', label: '水' },
    { value: 'THU', label: '木' },
    { value: 'FRI', label: '金' },
    { value: 'SAT', label: '土' },
    { value: 'SUN', label: '日' },
] as const

export const GENDER_OPTIONS = [
    { value: 'MALE', label: '男性' },
    { value: 'FEMALE', label: '女性' },
    { value: 'OTHER', label: 'その他' },
    { value: 'ANY', label: '指定なし' },
] as const

// レベル論理名は ParticipationLevelMaster (DB) から取得する。
// 表示侧は useParticipationLevelLabels() を使うこと。

const AGE_OPTIONS = [
    { value: 'none', label: '指定なし' },
    ...Array.from({ length: 14 }, (_, i) => ({ value: String(i * 10), label: `${i * 10}歳` })),
] as const

function getFreqCountOptions(unit: '週' | '月' | '年'): number[] {
    switch (unit) {
        case '週': return [1, 2, 3, 4, 5, 6, 7]
        case '月': return [1, 2, 3]
        case '年': return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    }
}

// ── Form Data Interface ──

export interface CommunitySettingsData {
    joinMethod: 'FREE_JOIN' | 'APPROVAL' | 'INVITATION'
    isPublic: boolean
    maxMembers: string
    targetGender: string[]
    ageMin: string
    ageMax: string
    freqUnit: '' | '週' | '月' | '年'
    freqCount: string
    selectedDays: string[]
    recommendedLevelEnabled: boolean
    recommendedLevelRange: [number, number]
    selectedCategoryId: string
    tagInput: string
    tags: string[]
    locations: LocationEntry[]
}

export const defaultSettingsData: CommunitySettingsData = {
    joinMethod: 'FREE_JOIN',
    isPublic: true,
    maxMembers: '',
    targetGender: [],
    ageMin: '',
    ageMax: '',
    freqUnit: '',
    freqCount: '',
    selectedDays: [],
    recommendedLevelEnabled: false,
    recommendedLevelRange: [0, 8],
    selectedCategoryId: '',
    tagInput: '',
    tags: [],
    locations: [],
}

// ── Step 2: 参加・活動設定 ──

interface SettingsStep2Props {
    data: CommunitySettingsData
    update: (patch: Partial<CommunitySettingsData>) => void
}

export function SettingsStep2({ data, update }: SettingsStep2Props) {
    const levelLabels = useParticipationLevelLabels()
    const fmtLv = (lv: number) => levelLabels[lv] ?? `Lv${lv}`
    const handlePublicChange = (pub: boolean) => {
        update({ isPublic: pub, ...(pub ? {} : { joinMethod: 'INVITATION' as const }) })
    }
    const toggleItem = (arr: string[], item: string, key: keyof CommunitySettingsData) => {
        const next = arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
        update({ [key]: next } as Partial<CommunitySettingsData>)
    }

    return (
        <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-800 border-b pb-2">参加・活動設定</h2>
            <div className="space-y-1.5">
                <Label>公開設定</Label>
                <div className="flex gap-2">
                    <Button type="button" variant={data.isPublic ? 'default' : 'outline'} size="sm" onClick={() => handlePublicChange(true)}>公開</Button>
                    <Button type="button" variant={!data.isPublic ? 'default' : 'outline'} size="sm" onClick={() => handlePublicChange(false)}>非公開</Button>
                </div>
            </div>
            <div className="space-y-1.5">
                <Label>参加方式</Label>
                <Select value={data.joinMethod} onValueChange={(v) => update({ joinMethod: v as typeof data.joinMethod })} disabled={!data.isPublic}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{JOIN_METHOD_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}</SelectContent>
                </Select>
                {!data.isPublic && <p className="text-xs text-gray-500">非公開コミュニティは招待制になります</p>}
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="maxMembers">最大メンバー数</Label>
                <Input id="maxMembers" type="number" min={1} value={data.maxMembers} onChange={(e) => update({ maxMembers: e.target.value })} placeholder="制限なし" />
            </div>
            <div className="space-y-1.5">
                <Label>対象性別（複数選択可）</Label>
                <div className="flex flex-wrap gap-2">
                    {GENDER_OPTIONS.map((g) => (
                        <button key={g.value} type="button" onClick={() => toggleItem(data.targetGender, g.value, 'targetGender')}
                            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${data.targetGender.includes(g.value) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'}`}>
                            {g.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="space-y-1.5">
                <Label>対象年齢</Label>
                <div className="flex items-center gap-2">
                    <Select value={data.ageMin || 'none'} onValueChange={(v) => update({ ageMin: v === 'none' ? '' : v })}>
                        <SelectTrigger className="w-28"><SelectValue placeholder="下限" /></SelectTrigger>
                        <SelectContent>{AGE_OPTIONS.filter((a) => a.value === 'none' || !data.ageMax || Number(a.value) <= Number(data.ageMax)).map((a) => (<SelectItem key={`min-${a.value}`} value={a.value}>{a.label}</SelectItem>))}</SelectContent>
                    </Select>
                    <span className="text-gray-500">〜</span>
                    <Select value={data.ageMax || 'none'} onValueChange={(v) => update({ ageMax: v === 'none' ? '' : v })}>
                        <SelectTrigger className="w-28"><SelectValue placeholder="上限" /></SelectTrigger>
                        <SelectContent>{AGE_OPTIONS.filter((a) => a.value === 'none' || !data.ageMin || Number(a.value) >= Number(data.ageMin)).map((a) => (<SelectItem key={`max-${a.value}`} value={a.value}>{a.label}</SelectItem>))}</SelectContent>
                    </Select>
                </div>
            </div>
            <div className="space-y-1.5">
                <Label>活動頻度</Label>
                <div className="flex items-center gap-2">
                    <Select value={data.freqUnit || 'none'} onValueChange={(v) => update({ freqUnit: (v === 'none' ? '' : v) as CommunitySettingsData['freqUnit'], freqCount: '' })}>
                        <SelectTrigger className="w-28"><SelectValue placeholder="単位" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">指定なし</SelectItem>
                            <SelectItem value="週">週</SelectItem>
                            <SelectItem value="月">月</SelectItem>
                            <SelectItem value="年">年</SelectItem>
                        </SelectContent>
                    </Select>
                    {data.freqUnit && (
                        <>
                            <Select value={data.freqCount || 'none'} onValueChange={(v) => update({ freqCount: v === 'none' ? '' : v })}>
                                <SelectTrigger className="w-28"><SelectValue placeholder="回数" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">—</SelectItem>
                                    {getFreqCountOptions(data.freqUnit).map((n) => (
                                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {data.freqCount && <span className="text-sm text-gray-600">回</span>}
                        </>
                    )}
                </div>
            </div>
            <div className="space-y-1.5">
                <Label>活動曜日</Label>
                <div className="flex flex-wrap gap-2">
                    {DAY_OPTIONS.map((d) => (<Button key={d.value} type="button" variant={data.selectedDays.includes(d.value) ? 'default' : 'outline'} size="sm" onClick={() => toggleItem(data.selectedDays, d.value, 'selectedDays')}>{d.label}</Button>))}
                </div>
            </div>
            <div className="space-y-2">
                <Label>推奨レベル</Label>
                <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={data.recommendedLevelEnabled}
                        onChange={(e) => update({
                            recommendedLevelEnabled: e.target.checked,
                            ...(!e.target.checked ? { recommendedLevelRange: [0, 8] as [number, number] } : {}),
                        })}
                        className="rounded"
                    />
                    指定する
                </label>
                {data.recommendedLevelEnabled ? (
                    <>
                        <p className="text-xs text-gray-500">{fmtLv(data.recommendedLevelRange[0])} ～ {fmtLv(data.recommendedLevelRange[1])}</p>
                        <Slider
                            min={0}
                            max={8}
                            step={1}
                            value={data.recommendedLevelRange}
                            onValueChange={(v) => update({ recommendedLevelRange: v as [number, number] })}
                            className="w-full"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400">
                            <span>{fmtLv(0)}</span>
                            <span>{fmtLv(8)}</span>
                        </div>
                    </>
                ) : (
                    <p className="text-xs text-gray-400">指定なし（全レベル対象）</p>
                )}
            </div>
        </div>
    )
}

// ── Step 3: カテゴリ・タグ ──

interface SettingsStep3Props {
    data: CommunitySettingsData
    update: (patch: Partial<CommunitySettingsData>) => void
    /** 確認用の基本情報 */
    basicInfo?: { name: string; description?: string }
}

export function SettingsStep3({ data, update, basicInfo }: SettingsStep3Props) {
    const { data: masters } = useCommunityMasters()
    const levelLabels = useParticipationLevelLabels()
    const fmtLv = (lv: number) => levelLabels[lv] ?? `Lv${lv}`
    const categories = masters?.categories ?? []

    const addTag = () => {
        const trimmed = data.tagInput.trim()
        if (trimmed && !data.tags.includes(trimmed)) {
            update({ tags: [...data.tags, trimmed], tagInput: '' })
        } else { update({ tagInput: '' }) }
    }

    return (
        <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-800 border-b pb-2">カテゴリ・タグ</h2>
            <div className="space-y-1.5">
                <Label>カテゴリ <span className="text-red-500">*</span></Label>
                <CategoryPicker
                    categories={categories}
                    selectedId={data.selectedCategoryId}
                    onChange={(id) => update({ selectedCategoryId: id })}
                />
                {!data.selectedCategoryId && <p className="text-xs text-red-500">カテゴリを選択してください</p>}
            </div>
            <div className="space-y-1.5">
                <Label>タグ</Label>
                <div className="flex gap-2">
                    <Input value={data.tagInput} onChange={(e) => update({ tagInput: e.target.value })} placeholder="タグを入力して追加" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }} />
                    <Button type="button" variant="outline" size="sm" onClick={addTag}>追加</Button>
                </div>
                {data.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {data.tags.map((tag) => (<Badge key={tag} variant="secondary" className="cursor-pointer hover:bg-red-100" onClick={() => update({ tags: data.tags.filter((t) => t !== tag) })}>{tag} ✕</Badge>))}
                    </div>
                )}
            </div>

            <LocationSettings
                onLocationsChange={(locs) => update({ locations: locs })}
            />

            {/* 確認セクション */}
            {basicInfo && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg space-y-2">
                    <h3 className="text-sm font-semibold text-gray-700">入力内容の確認</h3>
                    <dl className="text-sm space-y-1">
                        <div className="flex gap-2"><dt className="text-gray-500 w-24 shrink-0">名前:</dt><dd className="font-medium">{basicInfo.name || '—'}</dd></div>
                        <div className="flex gap-2"><dt className="text-gray-500 w-24 shrink-0">公開:</dt><dd>{data.isPublic ? '公開' : '非公開'}</dd></div>
                        <div className="flex gap-2"><dt className="text-gray-500 w-24 shrink-0">参加方式:</dt><dd>{JOIN_METHOD_OPTIONS.find((o) => o.value === data.joinMethod)?.label}</dd></div>
                        {data.targetGender.length > 0 && (<div className="flex gap-2"><dt className="text-gray-500 w-24 shrink-0">性別:</dt><dd>{data.targetGender.map((g) => GENDER_OPTIONS.find((o) => o.value === g)?.label).join(', ')}</dd></div>)}
                        {(data.ageMin || data.ageMax) && (<div className="flex gap-2"><dt className="text-gray-500 w-24 shrink-0">年齢:</dt><dd>{data.ageMin || '0'}歳 〜 {data.ageMax || '制限なし'}</dd></div>)}
                        {data.freqUnit && data.freqCount && (<div className="flex gap-2"><dt className="text-gray-500 w-24 shrink-0">活動頻度:</dt><dd>{data.freqUnit}{data.freqCount}回</dd></div>)}
                        <div className="flex gap-2"><dt className="text-gray-500 w-24 shrink-0">レベル:</dt><dd>{fmtLv(data.recommendedLevelRange[0])} ～ {fmtLv(data.recommendedLevelRange[1])}</dd></div>
                        {data.selectedCategoryId && (<div className="flex gap-2"><dt className="text-gray-500 w-24 shrink-0">カテゴリ:</dt><dd>{categories.find((c) => c.id === data.selectedCategoryId)?.name}</dd></div>)}
                        {data.tags.length > 0 && (<div className="flex gap-2"><dt className="text-gray-500 w-24 shrink-0">タグ:</dt><dd>{data.tags.join(', ')}</dd></div>)}
                    </dl>
                </div>
            )}
        </div>
    )
}
