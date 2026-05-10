import { AdBanner } from '@/features/ads/components/AdBanner'
import {
    defaultSettingsData,
    SettingsStep2,
    SettingsStep3,
    type CommunitySettingsData
} from '@/features/community/components/CommunitySettingsForm'
import { useCommunityMasters, useCreateCommunity } from '@/features/community/hooks/useCommunityQueries'
import { CharacterCounter } from '@/shared/components/ui/CharacterCounter'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import type { CreateCommunityRequest } from '@/shared/types/api'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

// ── 定数（共通化したので re-export 不要。Step2/Step3 で使うのは共通コンポーネント側） ──

interface WizardFormData {
    name: string
    description: string
    settings: CommunitySettingsData
}

const defaultFormData: WizardFormData = {
    name: '',
    description: '',
    settings: { ...defaultSettingsData },
}

// ── Context ──

interface WizardContextValue {
    data: WizardFormData
    update: (patch: Partial<WizardFormData>) => void
    updateSettings: (patch: Partial<CommunitySettingsData>) => void
    step: number
    setStep: (s: number) => void
    totalSteps: number
}

const WizardContext = createContext<WizardContextValue | null>(null)

function useWizard() {
    const ctx = useContext(WizardContext)
    if (!ctx) throw new Error('useWizard must be used within WizardProvider')
    return ctx
}

function WizardProvider({ children }: { children: ReactNode }) {
    const [data, setData] = useState<WizardFormData>(defaultFormData)
    const [step, setStep] = useState(1)
    const update = useCallback((patch: Partial<WizardFormData>) => {
        setData((prev) => ({ ...prev, ...patch }))
    }, [])
    const updateSettings = useCallback((patch: Partial<CommunitySettingsData>) => {
        setData((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
    }, [])
    return (
        <WizardContext.Provider value={{ data, update, updateSettings, step, setStep, totalSteps: 3 }}>
            {children}
        </WizardContext.Provider>
    )
}

// ── Step 1: 基本情報 ──

function Step1BasicInfo() {
    const { data, update } = useWizard()

    return (
        <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-800 border-b pb-2">Step 1: 基本情報</h2>
            <div className="space-y-1.5">
                <Label htmlFor="name">コミュニティ名 *</Label>
                <Input id="name" value={data.name} onChange={(e) => update({ name: e.target.value })} placeholder="例: 渋谷フットサルクラブ" maxLength={50} required />
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="description">説明</Label>
                <textarea id="description" value={data.description} onChange={(e) => update({ description: e.target.value })} placeholder="コミュニティの紹介文" rows={3} maxLength={500} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <CharacterCounter current={data.description.length} max={500} />
            </div>
        </div>
    )
}

// ── ステップインジケーター ──

function StepIndicator() {
    const { step } = useWizard()
    const labels = ['基本情報', '参加・活動', 'カテゴリ・タグ']
    return (
        <div className="flex items-center justify-center gap-2 mb-6">
            {labels.map((label, i) => {
                const s = i + 1
                const isActive = s === step
                const isDone = s < step
                return (
                    <div key={s} className="flex items-center gap-1">
                        {i > 0 && <div className={`w-8 h-0.5 ${isDone ? 'bg-blue-500' : 'bg-gray-200'}`} />}
                        <div className={`flex items-center gap-1 text-xs font-medium ${isActive ? 'text-blue-600' : isDone ? 'text-blue-500' : 'text-gray-400'}`}>
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${isActive ? 'bg-blue-600 text-white' : isDone ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'}`}>
                                {isDone ? '✓' : s}
                            </span>
                            <span className="hidden sm:inline">{label}</span>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

// ── メインウィザード ──

function WizardForm() {
    const navigate = useNavigate()
    const createMutation = useCreateCommunity()
    const { data, updateSettings, step, setStep, totalSteps } = useWizard()
    const { isLoading: mastersLoading } = useCommunityMasters()
    const canProceed = step === 1 ? data.name.trim().length > 0 : true
    const s = data.settings

    const handleSubmit = async () => {
        const payload: CreateCommunityRequest = {
            name: data.name.trim(),
            description: data.description.trim() || undefined,
            joinMethod: s.joinMethod,
            isPublic: s.isPublic,
            maxMembers: s.maxMembers ? Number(s.maxMembers) : undefined,
            activityFrequency: s.freqUnit && s.freqCount ? `${s.freqUnit}${s.freqCount}回` : undefined,
            targetGender: s.targetGender.length > 0 ? s.targetGender : undefined,
            ageMin: s.ageMin ? Number(s.ageMin) : undefined,
            ageMax: s.ageMax ? Number(s.ageMax) : undefined,
            categoryIds: [s.selectedCategoryId || 'cat-other'],
            recommendedLevelMin: s.recommendedLevelEnabled ? s.recommendedLevelRange[0] : undefined,
            recommendedLevelMax: s.recommendedLevelEnabled ? s.recommendedLevelRange[1] : undefined,
            activityDays: s.selectedDays.length > 0 ? s.selectedDays : undefined,
            tags: s.tags.length > 0 ? s.tags : undefined,
            locations: s.locations.length > 0 ? s.locations.filter((l) => l.area.trim()).map((l) => ({
                type: l.type,
                area: l.area.trim(),
                station: l.station.trim() || undefined,
            })) : undefined,
        }
        const result = await createMutation.mutateAsync(payload)
        navigate(`/communities/${result.communityId}`, { replace: true })
    }

    if (mastersLoading) {
        return (<div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>)
    }

    return (
        <div className="max-w-lg mx-auto px-4 py-6">
            <StepIndicator />
            {step === 1 && <Step1BasicInfo />}
            {step === 2 && <SettingsStep2 data={s} update={updateSettings} />}
            {step === 3 && <SettingsStep3 data={s} update={updateSettings} basicInfo={{ name: data.name, description: data.description }} />}
            <div className="flex gap-3 mt-8 pt-4 border-t">
                {step > 1 && (<Button type="button" variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>戻る</Button>)}
                {step < totalSteps ? (
                    <Button type="button" className="flex-1" disabled={!canProceed} onClick={() => setStep(step + 1)}>次へ</Button>
                ) : (
                    <Button type="button" className="flex-1" disabled={!data.name.trim() || !s.selectedCategoryId || createMutation.isPending} onClick={handleSubmit}>
                        {createMutation.isPending ? '作成中...' : 'コミュニティを作成'}
                    </Button>
                )}
            </div>
            {/* [7] コミュニティ作成 — 各ステップのボタン直下 */}
            <AdBanner slotId="community-create-step-below" />
            {createMutation.isError && (<p className="text-red-500 text-sm mt-2 text-center">{(createMutation.error as Error).message}</p>)}
        </div>
    )
}

/**
 * CommunityCreatePage — 3ステップウィザード形式のコミュニティ作成
 * Step 1: 基本情報（名前、説明、タイプ）
 * Step 2: 参加・活動設定（公開設定、参加方式、性別、年齢、頻度、曜日、レベル）
 * Step 3: カテゴリ・タグ + 確認
 */
export function CommunityCreatePage() {
    return (
        <WizardProvider>
            <WizardForm />
        </WizardProvider>
    )
}
