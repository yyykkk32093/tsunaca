import { useAuth } from '@/app/providers/AuthProvider'
import { useCommunity, useMyRole } from '@/features/community/hooks/useCommunityQueries'
import { useParticipationLevelLabels } from '@/features/master/hooks/useParticipationLevels'
import {
    useAppendMatchingRounds,
    useCategoryMatchFormats,
    useDeleteMatching,
    useGenerateMatching,
    useMatchingResult,
    useParticipantLevels,
    useUpdateFixedPairs,
    useUpdateMatchingRound,
    useUpdateMemberLevel,
    useUpdateVisitorLevel,
} from '@/features/matching/hooks/useMatchingQueries'
import { useParticipants } from '@/features/participation/hooks/useParticipationQueries'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { HelpCircle, Link2, Plus, SlidersHorizontal, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

// ─── helpers ─────────────────────────────────────────────────────────────────

function toHalfWidth(str: string): string {
    return str.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
}

const MODE_LABELS: Record<string, string> = {
    RANDOM: '乱数',
    MIXED_LEVEL: '総合レベル均衡',
    SAME_LEVEL: '近いレベル同士',
}

// ─── LevelAdjustModal ─────────────────────────────────────────────────────────

type LevelEntry = {
    participationId: string
    userId: string | null
    displayName: string
    level: number
    isVisitor: boolean
}

function LevelAdjustModal({
    open,
    onClose,
    isRandom,
    participants,
    showHint,
    levelLabels,
    onUpdateMemberLevel,
    onUpdateVisitorLevel,
}: {
    open: boolean
    onClose: () => void
    isRandom: boolean
    participants: LevelEntry[]
    showHint: boolean
    levelLabels: Record<number, string>
    onUpdateMemberLevel: (userId: string, level: number | null) => void
    onUpdateVisitorLevel: (participationId: string, level: number | null) => void
}) {
    // ローカルバッファ：保存ボタン押下までは API を叩かない
    const [drafts, setDrafts] = useState<Record<string, number>>({})

    // モーダルが開いた / 参加者リストが変わったときに初期化
    useEffect(() => {
        if (!open) return
        const init: Record<string, number> = {}
        participants.forEach((p) => { init[p.participationId] = p.level })
        setDrafts(init)
    }, [open, participants])

    const dirtyEntries = participants.filter((p) => drafts[p.participationId] !== undefined && drafts[p.participationId] !== p.level)
    const isDirty = dirtyEntries.length > 0

    const handleSave = () => {
        dirtyEntries.forEach((p) => {
            const next = drafts[p.participationId]
            if (p.isVisitor) {
                onUpdateVisitorLevel(p.participationId, next)
            } else if (p.userId) {
                onUpdateMemberLevel(p.userId, next)
            }
        })
        onClose()
    }

    const handleCloseRequest = (nextOpen: boolean) => {
        if (nextOpen) return
        if (isDirty && !confirm('変更を破棄して閉じますか？')) return
        onClose()
    }

    return (
        <Dialog open={open} onOpenChange={handleCloseRequest}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>参加者レベル調整</DialogTitle>
                </DialogHeader>
                {showHint && (
                    <div className="text-xs text-gray-500 space-y-0.5">
                        <p>メンバーのレベル変更は今後も維持されます。</p>
                        <p>ビジターのレベル変更は今回限りです。</p>
                    </div>
                )}
                {isRandom && (
                    <p className="text-xs text-orange-500">乱数モードではレベルは使用されません。</p>
                )}
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                    {participants.length === 0 ? (
                        <p className="text-xs text-gray-400 py-2">参加者がいません。</p>
                    ) : (
                        participants.map((p) => (
                            <div key={p.participationId} className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm text-gray-800 truncate">{p.displayName}</p>
                                    <p className="text-gray-500 truncate" style={{ fontSize: '0.65em' }}>
                                        {p.isVisitor ? 'ビジター' : 'メンバー'}
                                    </p>
                                </div>
                                <select
                                    value={String(drafts[p.participationId] ?? p.level)}
                                    disabled={isRandom}
                                    className="rounded-md border border-gray-300 px-2 py-1 text-sm disabled:opacity-50 disabled:bg-gray-50 disabled:cursor-default"
                                    onChange={(e) => {
                                        const next = Number(e.target.value)
                                        setDrafts((prev) => ({ ...prev, [p.participationId]: next }))
                                    }}
                                >
                                    {Array.from({ length: 9 }).map((_, lv) => (
                                        <option key={lv} value={lv}>{(levelLabels[lv] ?? `Lv${lv}`)} (Lv{lv})</option>
                                    ))}
                                </select>
                            </div>
                        ))
                    )}
                </div>
                <div className="flex justify-end gap-2 pt-1">
                    <Button variant="outline" size="sm" onClick={() => handleCloseRequest(false)}>閉じる</Button>
                    <Button size="sm" onClick={handleSave} disabled={!isDirty || isRandom}>保存</Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ─── FixedPairsEditor ─────────────────────────────────────────────────────────
// 固定ペアの追加・削除を行う共通エディタ。
// レイアウト:
//   - 上部: 既存ペアを「No. / 名前A / 名前B / [×]」のカード列で表示
//   - 下部: 新規追加用フォーム（参加者A 選択 → 参加者B 選択 → [追加])
//
// - participants: 選択肢になる参加者一覧
// - value: 現在の固定ペア（[participationId, participationId][])
// - onChange: 変更時コールバック

function FixedPairsEditor({
    participants,
    value,
    onChange,
}: {
    participants: LevelEntry[]
    value: Array<[string, string]>
    onChange: (next: Array<[string, string]>) => void
}) {
    const [a, setA] = useState('')
    const [b, setB] = useState('')

    const usedIds = useMemo(() => {
        const s = new Set<string>()
        for (const [x, y] of value) { s.add(x); s.add(y) }
        return s
    }, [value])

    const nameById = useMemo(() => {
        const m = new Map<string, string>()
        for (const p of participants) m.set(p.participationId, p.displayName)
        return m
    }, [participants])

    const availableForA = participants.filter((p) => !usedIds.has(p.participationId) && p.participationId !== b)
    const availableForB = participants.filter((p) => !usedIds.has(p.participationId) && p.participationId !== a)

    const canAdd = a !== '' && b !== '' && a !== b && !usedIds.has(a) && !usedIds.has(b)

    return (
        <div className="space-y-3">
            {/* 既存ペア一覧 */}
            {value.length === 0 ? (
                <p className="text-xs text-gray-400 px-1">固定ペアは未指定です。</p>
            ) : (
                <ul className="divide-y divide-gray-100 rounded-md border border-gray-200 bg-white">
                    {value.map(([x, y], idx) => (
                        <li key={`${x}-${y}-${idx}`} className="flex items-center gap-3 px-3 py-2 text-sm">
                            <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-gray-100 px-1.5 text-xs text-gray-600">
                                {idx + 1}
                            </span>
                            <span className="flex-1 truncate text-gray-800">
                                {nameById.get(x) ?? x}
                                <span className="mx-1.5 text-gray-400">×</span>
                                {nameById.get(y) ?? y}
                            </span>
                            <button
                                type="button"
                                onClick={() => onChange(value.filter((_, i) => i !== idx))}
                                aria-label="削除"
                                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            >
                                ×
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {/* 追加フォーム */}
            {availableForA.length === 0 ? (
                <p className="text-xs text-gray-400 px-1">追加できる参加者がいません。</p>
            ) : (
                <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-3 space-y-2">
                    <p className="text-xs text-gray-500">ペアを追加</p>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
                        <select
                            value={a}
                            onChange={(e) => setA(e.target.value)}
                            className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
                        >
                            <option value="">参加者A</option>
                            {availableForA.map((p) => (
                                <option key={p.participationId} value={p.participationId}>{p.displayName}</option>
                            ))}
                        </select>
                        <span className="hidden sm:block text-center text-gray-400">×</span>
                        <select
                            value={b}
                            onChange={(e) => setB(e.target.value)}
                            className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
                        >
                            <option value="">参加者B</option>
                            {availableForB.map((p) => (
                                <option key={p.participationId} value={p.participationId}>{p.displayName}</option>
                            ))}
                        </select>
                        <Button
                            type="button"
                            size="sm"
                            disabled={!canAdd}
                            onClick={() => {
                                onChange([...value, [a, b]])
                                setA('')
                                setB('')
                            }}
                        >
                            追加
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── RoundEditModal ───────────────────────────────────────────────────────────
// 単一ラウンドの参加者を編集するモーダル。
// 各「席（court x group x slot）」に対して、そのラウンドに居る全参加者から選択し直せる。
// 同一参加者が複数席に重複した場合は保存不可（バリデーション）。

type RoundCourtForEdit = {
    courtNo: number
    groups: Array<{
        groupNo: number
        participantIds: string[]
    }>
}

function RoundEditModal({
    open,
    onClose,
    roundNo,
    initialCourts,
    allParticipants,
    onSave,
    saving,
}: {
    open: boolean
    onClose: () => void
    roundNo: number
    /** ラウンド内の全参加者（席に居る人。休憩者は含まない初期表示） */
    initialCourts: RoundCourtForEdit[]
    /** 選択肢になる全参加者（このラウンド内 + 休憩者を含む全員） */
    allParticipants: LevelEntry[]
    onSave: (courts: RoundCourtForEdit[]) => void
    saving: boolean
}) {
    const [courts, setCourts] = useState<RoundCourtForEdit[]>(initialCourts)
    useEffect(() => { if (open) setCourts(initialCourts) }, [open, initialCourts])

    const usedIds = useMemo(() => {
        const counts = new Map<string, number>()
        for (const c of courts) {
            for (const g of c.groups) {
                for (const pid of g.participantIds) {
                    counts.set(pid, (counts.get(pid) ?? 0) + 1)
                }
            }
        }
        return counts
    }, [courts])
    const hasDuplicate = Array.from(usedIds.values()).some((n) => n > 1)

    const nameById = useMemo(() => {
        const m = new Map<string, string>()
        for (const p of allParticipants) m.set(p.participationId, p.displayName)
        return m
    }, [allParticipants])

    const updateSlot = (ci: number, gi: number, si: number, pid: string) => {
        setCourts((prev) => prev.map((c, cIdx) => cIdx !== ci ? c : ({
            ...c,
            groups: c.groups.map((g, gIdx) => gIdx !== gi ? g : ({
                ...g,
                participantIds: g.participantIds.map((p, sIdx) => sIdx === si ? pid : p),
            })),
        })))
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{roundNo}回目の組み合わせを編集</DialogTitle>
                </DialogHeader>
                <p className="text-xs text-gray-500">各席のドロップダウンから参加者を入れ替えできます。</p>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                    {courts.map((court, ci) => (
                        <div key={court.courtNo} className="rounded border border-gray-200 p-2">
                            <div className="text-xs font-medium text-gray-700 mb-2">コート{court.courtNo}</div>
                            <div className="space-y-2">
                                {court.groups.map((group, gi) => (
                                    <div key={group.groupNo} className="space-y-1">
                                        <div className="text-xs text-gray-500">組{group.groupNo}</div>
                                        <div className="flex flex-wrap gap-2">
                                            {group.participantIds.map((pid, si) => (
                                                <select
                                                    key={si}
                                                    value={pid}
                                                    onChange={(e) => updateSlot(ci, gi, si, e.target.value)}
                                                    className={`rounded-md border px-2 py-1 text-xs ${(usedIds.get(pid) ?? 0) > 1 ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                                                >
                                                    {allParticipants.map((p) => {
                                                        // 自スロット以外で使用中の参加者は選択不可（重複防止）
                                                        const isUsedElsewhere = (usedIds.get(p.participationId) ?? 0) >= 1 && p.participationId !== pid
                                                        return (
                                                            <option
                                                                key={p.participationId}
                                                                value={p.participationId}
                                                                disabled={isUsedElsewhere}
                                                            >
                                                                {nameById.get(p.participationId) ?? p.displayName}
                                                                {isUsedElsewhere ? '（設定済み）' : ''}
                                                            </option>
                                                        )
                                                    })}
                                                </select>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-2 pt-1">
                    <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>キャンセル</Button>
                    <Button size="sm" disabled={hasDuplicate || saving} onClick={() => onSave(courts)}>保存</Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ─── MatchingPage ─────────────────────────────────────────────────────────────

export function MatchingPage() {
    const navigate = useNavigate()
    const { communityId = '', scheduleId = '' } = useParams<{ communityId: string; scheduleId: string }>()
    const { data, isLoading } = useMatchingResult(scheduleId)
    const { isAdminOrAbove } = useMyRole(communityId)
    const { data: formatsData } = useCategoryMatchFormats(communityId)
    const { data: communityData } = useCommunity(communityId)
    const { data: participantsData } = useParticipants(scheduleId)
    const generateMutation = useGenerateMatching(scheduleId)
    const appendMutation = useAppendMatchingRounds(scheduleId)
    const deleteMutation = useDeleteMatching(scheduleId)
    const updateMemberLevelMutation = useUpdateMemberLevel(scheduleId)
    const updateVisitorLevelMutation = useUpdateVisitorLevel(scheduleId)
    const updateFixedPairsMutation = useUpdateFixedPairs(scheduleId)
    const updateRoundMutation = useUpdateMatchingRound(scheduleId)
    // Issue 10: 生成前後でレベル表示を一致させるため、専用 API から取得
    const { data: participantLevelsData } = useParticipantLevels(scheduleId)
    // ParticipationLevelMaster (DB) からレベル論理名を取得
    const levelLabels = useParticipationLevelLabels()
    const [addRounds, setAddRounds] = useState('1')
    const [mode, setMode] = useState<'RANDOM' | 'MIXED_LEVEL' | 'SAME_LEVEL'>('MIXED_LEVEL')
    const categories = formatsData?.categories ?? []
    const [categoryId, setCategoryId] = useState('')
    const [categoryInputText, setCategoryInputText] = useState('')
    const [categoryInitialized, setCategoryInitialized] = useState(false)
    const [showLevelModal, setShowLevelModal] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    // Issue 7: 「該当する種目がない場合」を押下したら手動入力モードに切替
    const [forceManualFormat, setForceManualFormat] = useState(false)
    // 組み合わせ方式の説明表示
    const [showModeHelp, setShowModeHelp] = useState(false)
    // 表示モード（コート図 / 表 / 個人スケジュール）。デフォルトはコート図
    const [viewMode, setViewMode] = useState<'overall' | 'personal'>('overall')
    // ラウンドフィルター（null = 全表示、N = N回目のみ表示）
    const [filteredRoundNo, setFilteredRoundNo] = useState<number | null>(null)
    // 組み合わせ偏りチェック（管理者のみ。デフォルト OFF）
    const [showDuplicateCheck, setShowDuplicateCheck] = useState(false)
    // 固定ペア（生成フォーム用 / 確認画面の編集モーダル用 共通の state）
    const [fixedPairs, setFixedPairs] = useState<Array<[string, string]>>([])
    const [fixedPairsInitialized, setFixedPairsInitialized] = useState(false)
    const [showFixedPairsModal, setShowFixedPairsModal] = useState(false)
    // 管理者メニュー「固定ペア設定 / レベル調整」共通の補足表示トグル
    const [showAdminHint, setShowAdminHint] = useState(false)
    // 各ラウンドの編集対象
    const [editingRoundNo, setEditingRoundNo] = useState<number | null>(null)

    // 既存 matchingResult の fixedPairs を一度だけ state に流し込み（編集モーダルの初期値）
    useEffect(() => {
        if (fixedPairsInitialized || !data) return
        const existing = data.params.fixedPairs ?? []
        setFixedPairs(existing.map((pair) => [pair[0], pair[1]] as [string, string]))
        setFixedPairsInitialized(true)
    }, [data, fixedPairsInitialized])

    // ログインユーザーの participationId（自分ハイライト用）
    const { user: authUser } = useAuth()
    const myParticipationId = useMemo<string | null>(() => {
        if (!authUser?.userId) return null
        const found = participantsData?.participants?.find((p) => p.userId === authUser.userId)
        return found?.id ?? null
    }, [authUser, participantsData])

    // 2-1: コミュニティのカテゴリから初期選択
    useEffect(() => {
        if (categoryInitialized || !communityData || categories.length === 0) return
        const communityCategories = communityData.categories ?? []
        const initial = communityCategories
            .map((cc) => categories.find((fc) => fc.id === cc.id))
            .find((c): c is NonNullable<typeof c> => c !== undefined)
        if (initial) {
            setCategoryId(initial.id)
            setCategoryInputText(initial.name)
        }
        setCategoryInitialized(true)
    }, [communityData, categories, categoryInitialized])
    const selectedCategory = useMemo(
        () => (categoryId ? categories.find((c) => c.id === categoryId) ?? null : null),
        [categories, categoryId],
    )
    const [formatId, setFormatId] = useState('')
    const selectedFormat = useMemo(() => {
        const formats = selectedCategory?.formats ?? []
        const initialId = formatId || formats.find((f) => f.isDefault)?.id || formats[0]?.id || ''
        return formats.find((f) => f.id === initialId) ?? null
    }, [selectedCategory, formatId])

    const [courtCount, setCourtCount] = useState('3')
    const [rounds, setRounds] = useState('10')
    const [manualPlayersPerGroup, setManualPlayersPerGroup] = useState('2')
    const [manualGroupsPerCourt, setManualGroupsPerCourt] = useState('2')

    const playersPerGroup = selectedFormat?.playersPerGroup ?? Number(manualPlayersPerGroup || '0')
    const groupsPerCourt = selectedFormat?.groupsPerCourt ?? Number(manualGroupsPerCourt || '0')
    const roundGroupCount = Number(courtCount || '0') * groupsPerCourt

    const participantCount = participantsData?.participants?.length ?? 0
    const requiredParticipants = playersPerGroup * groupsPerCourt * Number(courtCount || '0')
    const isInsufficientParticipants = requiredParticipants > 0 && participantCount < requiredParticipants

    // Issue 10: 生成前後で表示が一致するよう、常に participant-levels API のデータを優先使用する。
    // フォールバックとして data.rounds → participantsData (level=0) を利用。
    const participantLevelsFromRounds = useMemo(() => {
        const map = new Map<string, LevelEntry>()
        for (const round of data?.rounds ?? []) {
            for (const court of round.courts) {
                for (const group of court.groups) {
                    for (const p of group.participants) {
                        if (!map.has(p.participationId)) {
                            map.set(p.participationId, p)
                        }
                    }
                }
            }
        }
        return Array.from(map.values()).sort((a, b) => a.displayName.localeCompare(b.displayName))
    }, [data])

    const participantLevels = useMemo<LevelEntry[]>(() => {
        // 1) participant-levels API のデータを最優先
        if (participantLevelsData?.participants && participantLevelsData.participants.length > 0) {
            return participantLevelsData.participants
        }
        // 2) フォールバック: 過去 rounds から
        if (participantLevelsFromRounds.length > 0) return participantLevelsFromRounds
        // 3) 最終フォールバック: participantsData (レベル不明)
        return (participantsData?.participants ?? []).map((p) => ({
            participationId: p.id,
            userId: p.userId,
            displayName: p.displayName ?? p.visitorName ?? 'ビジター',
            level: 0,
            isVisitor: p.isVisitor,
        }))
    }, [participantLevelsData, participantLevelsFromRounds, participantsData])

    // 乱数モード用: 参加者ごとに固定の番号を割り当てる（スケジュール内で不変）
    // 採番ルール: rounds を 1回目 → 2回目 ... と順に走査し、初登場順に 1, 2, 3 ... を割り当てる
    const randomNumberByParticipationId = useMemo<Map<string, number>>(() => {
        const map = new Map<string, number>()
        if (!data) return map
        let next = 1
        for (const round of data.rounds) {
            for (const court of round.courts) {
                for (const group of court.groups) {
                    for (const p of group.participants) {
                        if (!map.has(p.participationId)) {
                            map.set(p.participationId, next)
                            next += 1
                        }
                    }
                }
            }
        }
        return map
    }, [data])

    // Issue 1: 組み合わせ重複検知（フロントで rounds 全体を走査して算出）
    //   [1] ペア重複    : 1グループ（playersPerGroup>=2）の参加者集合が過去ラウンドで既出
    //   [2] 対戦組み合わせ重複: 1コートの全参加者集合が過去ラウンドで既出
    //   それぞれ「何回目の出現か」をカウントし、2回目以降を「重複」として扱う。
    type CourtDupInfo = {
        pairDups: Array<{ participationIds: string[]; nth: number }>
        matchupDupNth?: number
    }
    const duplicateInfoByRoundCourt = useMemo<Map<number, Map<number, CourtDupInfo>>>(() => {
        const result = new Map<number, Map<number, CourtDupInfo>>()
        if (!data) return result
        const pairCounts = new Map<string, number>()
        const matchupCounts = new Map<string, number>()
        for (const round of data.rounds) {
            const courtMap = new Map<number, CourtDupInfo>()
            for (const court of round.courts) {
                const allIds = court.groups.flatMap((g) => g.participants.map((p) => p.participationId)).slice().sort()
                const matchupSig = allIds.join(':')
                const matchupCount = (matchupCounts.get(matchupSig) ?? 0) + 1
                matchupCounts.set(matchupSig, matchupCount)

                const pairDups: CourtDupInfo['pairDups'] = []
                for (const group of court.groups) {
                    if (group.participants.length < 2) continue
                    const ids = group.participants.map((p) => p.participationId).slice().sort()
                    const pairSig = ids.join(':')
                    const pairCount = (pairCounts.get(pairSig) ?? 0) + 1
                    pairCounts.set(pairSig, pairCount)
                    if (pairCount >= 2) {
                        // 表示順は元の参加者順を維持
                        pairDups.push({
                            participationIds: group.participants.map((p) => p.participationId),
                            nth: pairCount,
                        })
                    }
                }

                courtMap.set(court.courtNo, {
                    pairDups,
                    matchupDupNth: matchupCount >= 2 ? matchupCount : undefined,
                })
            }
            result.set(round.roundNo, courtMap)
        }
        return result
    }, [data])

    // 各ラウンド・各参加者の「同一スケジュール内 累計対戦参加回数」を算出
    // round を昇順に走査し、参加者ごとに +1 してその時点の値を保存
    const appearanceCountByRoundParticipation = useMemo<Map<number, Map<string, number>>>(() => {
        const result = new Map<number, Map<string, number>>()
        if (!data) return result
        const counts = new Map<string, number>()
        for (const round of data.rounds) {
            const roundMap = new Map<string, number>()
            for (const court of round.courts) {
                for (const group of court.groups) {
                    for (const p of group.participants) {
                        const next = (counts.get(p.participationId) ?? 0) + 1
                        counts.set(p.participationId, next)
                        roundMap.set(p.participationId, next)
                    }
                }
            }
            result.set(round.roundNo, roundMap)
        }
        return result
    }, [data])

    // 参加者ラベル（RANDOMモードは固定番号、それ以外は表示名）
    const formatParticipantLabel = (participationId: string, displayName: string): string => {
        if (data?.mode === 'RANDOM') {
            const no = randomNumberByParticipationId.get(participationId)
            return no !== undefined ? String(no) : displayName
        }
        return displayName
    }

    if (isLoading) {
        return (
            <div className="mx-auto max-w-3xl px-4 py-8">
                <p className="text-sm text-gray-500">読み込み中...</p>
            </div>
        )
    }

    // 2-6: 「このスケジュールの組み合わせは未生成です。」不要
    if (!data) {
        return (
            <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
                {isAdminOrAbove ? (
                    <div className="rounded-lg border border-gray-200 p-4 space-y-4">
                        <h2 className="text-sm font-semibold text-gray-900">マッチング作成</h2>

                        {/* 2-5: 組み合わせ方式 */}
                        <label className="block text-xs text-gray-600">
                            <span className="inline-flex items-center gap-1">
                                組み合わせ方式
                                <button
                                    type="button"
                                    onClick={() => setShowModeHelp((v) => !v)}
                                    className="inline-flex items-center text-blue-600 hover:text-blue-700"
                                    aria-label="組み合わせ方式の説明"
                                >
                                    <HelpCircle className="w-3.5 h-3.5" />
                                </button>
                            </span>
                            <select
                                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                value={mode}
                                onChange={(e) => setMode(e.target.value as 'RANDOM' | 'MIXED_LEVEL' | 'SAME_LEVEL')}
                            >
                                {/* 2-11: 乱数表 → 乱数 */}
                                <option value="RANDOM">乱数</option>
                                <option value="MIXED_LEVEL">総合レベル均衡</option>
                                <option value="SAME_LEVEL">近いレベル同士</option>
                            </select>
                            {showModeHelp && (
                                <div className="mt-2 rounded-md border border-blue-200 bg-blue-50 p-2 text-xs text-gray-700 space-y-1">
                                    <p><span className="font-semibold">乱数</span>：参加者をランダムに組み分けます。<span className="text-orange-600">参加者のレベルは考慮しません。</span></p>
                                    <p><span className="font-semibold">総合レベル均衡</span>：各組のレベル合計が均等に近くなるよう振り分けます（レベル差のあるメンバーが混在）。</p>
                                    <p><span className="font-semibold">近いレベル同士</span>：レベルが近い参加者同士を同じ組にまとめます。</p>
                                </div>
                            )}
                        </label>

                        {/* 2-1/2-3/2-8: カテゴリ（必須・オートコンプリート、フリー入力可） */}
                        <div className="block text-xs text-gray-600">
                            <span>カテゴリ <span className="text-red-500">*</span></span>
                            {/* 2-3: 入力テキストがない時は list を外す → ブラウザの空補完を防ぐ */}
                            <input
                                type="text"
                                list={categoryInputText ? 'matching-category-list' : undefined}
                                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                placeholder="カテゴリを選択、または自由に入力"
                                value={categoryInputText}
                                onChange={(e) => {
                                    const val = e.target.value
                                    setCategoryInputText(val)
                                    const found = categories.find((c) => c.name === val)
                                    if (found) {
                                        setCategoryId(found.id)
                                        setFormatId('')
                                        setForceManualFormat(false)
                                    } else {
                                        // マスタにないカテゴリは自由入力扱い → 手動フォーマットモード
                                        setCategoryId('')
                                        setFormatId('')
                                    }
                                }}
                            />
                            <datalist id="matching-category-list">
                                {categories.map((c) => (
                                    <option key={c.id} value={c.name} />
                                ))}
                            </datalist>
                        </div>

                        {/* 2-9: 競技フォーマット → 種目 */}
                        {selectedCategory && (selectedCategory.formats?.length ?? 0) > 0 && !forceManualFormat ? (
                            <div className="block text-xs text-gray-600">
                                <div className="flex items-baseline gap-2">
                                    <span>種目</span>
                                    {/* Issue 7/3: 「該当する種目がない場合」リンク（種目と同じフォントサイズ） */}
                                    <button
                                        type="button"
                                        onClick={() => setForceManualFormat(true)}
                                        className="inline-flex items-center gap-0.5 text-xs text-blue-600 hover:text-blue-700"
                                    >
                                        <HelpCircle className="w-3 h-3" />
                                        該当する種目がない場合
                                    </button>
                                </div>
                                <select
                                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    value={selectedFormat?.id ?? ''}
                                    onChange={(e) => setFormatId(e.target.value)}
                                >
                                    {(selectedCategory.formats ?? []).map((format) => (
                                        <option key={format.id} value={format.id}>
                                            {format.name}（1組{format.playersPerGroup}人 / 1面{format.groupsPerCourt}組）
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : (categoryInputText.trim() !== '') ? (
                            // Issue 1: マスタ未登録カテゴリ または Issue 7: 種目なし切替 → 手動入力
                            <div className="space-y-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <label className="block text-xs text-gray-600">
                                        1組あたり人数
                                        <Input
                                            type="number"
                                            min={1}
                                            max={100}
                                            value={manualPlayersPerGroup}
                                            onChange={(e) => setManualPlayersPerGroup(toHalfWidth(e.target.value))}
                                            className="mt-1"
                                        />
                                    </label>
                                    <label className="block text-xs text-gray-600">
                                        1試合あたりの組数
                                        <Input
                                            type="number"
                                            min={1}
                                            max={100}
                                            value={manualGroupsPerCourt}
                                            onChange={(e) => setManualGroupsPerCourt(toHalfWidth(e.target.value))}
                                            className="mt-1"
                                        />
                                    </label>
                                </div>
                                {/* Issue 4: 「登録済み種目から選ぶ」表示は不要とのことなので非表示 */}
                            </div>
                        ) : null}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="block text-xs text-gray-600">
                                面数
                                <Input
                                    type="number"
                                    min={1}
                                    value={courtCount}
                                    onChange={(e) => setCourtCount(toHalfWidth(e.target.value))}
                                    className="mt-1"
                                />
                            </label>
                            <label className="block text-xs text-gray-600">
                                生成回数
                                <Input
                                    type="number"
                                    min={1}
                                    max={30}
                                    value={rounds}
                                    onChange={(e) => setRounds(toHalfWidth(e.target.value))}
                                    className="mt-1"
                                />
                            </label>
                        </div>

                        {/* 固定ペア（任意・1組2人以上の種目のみ表示） */}
                        {participantLevels.length > 0 && playersPerGroup >= 2 && (
                            <div className="space-y-1">
                                <div className="text-xs text-gray-600">固定ペア（任意・1組2人の種目のみ有効）</div>
                                <FixedPairsEditor
                                    participants={participantLevels}
                                    value={fixedPairs}
                                    onChange={setFixedPairs}
                                />
                            </div>
                        )}

                        <div className="flex items-center gap-3 flex-wrap">
                            {/* Issue 1: カテゴリ自由入力(マスタ未登録)を許容。categoryInputText があれば生成可 */}
                            <Button
                                onClick={() => {
                                    const n = Math.min(30, Math.max(1, Number(rounds || '10')))
                                    generateMutation.mutate({
                                        mode,
                                        rounds: n,
                                        courtCount: Number(courtCount || '0'),
                                        groupsPerCourt,
                                        playersPerGroup,
                                        categoryId: selectedCategory?.id ?? null,
                                        categoryName: selectedCategory?.name ?? categoryInputText.trim() ?? null,
                                        formatName: selectedFormat?.name ?? null,
                                        fixedPairs: fixedPairs.length > 0 ? fixedPairs : undefined,
                                    })
                                }}
                                disabled={generateMutation.isPending || isInsufficientParticipants || !categoryInputText.trim()}
                            >
                                組み合わせ生成
                            </Button>
                            {/* Issue 8: 乱数モード時は参加者レベル調整ボタンを表示しない */}
                            {mode !== 'RANDOM' && participantLevels.length > 0 && (
                                <Button variant="outline" size="sm" onClick={() => setShowLevelModal(true)}>
                                    参加者レベル調整
                                </Button>
                            )}
                            {isInsufficientParticipants && (
                                <p className="text-xs text-red-500">総人数が足りません。</p>
                            )}
                            {!categoryInputText.trim() && (
                                <p className="text-xs text-red-500">カテゴリを入力してください。</p>
                            )}
                        </div>
                    </div>
                ) : null}

                <LevelAdjustModal
                    open={showLevelModal}
                    onClose={() => setShowLevelModal(false)}
                    isRandom={mode === 'RANDOM'}
                    participants={participantLevels}
                    showHint={false}
                    levelLabels={levelLabels}
                    onUpdateMemberLevel={(userId, level) => updateMemberLevelMutation.mutate({ communityId, userId, level })}
                    onUpdateVisitorLevel={(participationId, level) => updateVisitorLevelMutation.mutate({ participationId, level })}
                />

                <Button onClick={() => navigate(-1)} variant="outline">戻る</Button>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
            <div className="space-y-2">
                <h1 className="text-xl font-semibold text-gray-900">組み合わせ</h1>
                {/* 3-1: mode label in Japanese, 3-2: removed 1回あたり組数 */}
                <p className="text-xs text-gray-500">
                    参加人数: {participantLevels.length}人 / 方式: {MODE_LABELS[data.mode] ?? data.mode} / 面数: {data.params.courtCount} / 全{data.rounds.length}回
                </p>

                {/* 管理者向けアクション（追加生成 / 固定ペア変更 / レベル調整 / 削除） */}
                {isAdminOrAbove && (
                    <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-3 space-y-2.5">
                        <p className="text-[11px] font-medium text-gray-500">管理者メニュー</p>

                        {/* 1段目: 固定ペア設定 ／ レベル調整 ＋ 補足表示の ? */}
                        {((data.params.playersPerGroup ?? 0) >= 2 || (data.mode !== 'RANDOM' && participantLevels.length > 0)) && (
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                    {(data.params.playersPerGroup ?? 0) >= 2 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowFixedPairsModal(true)}
                                            className="gap-1.5"
                                        >
                                            <Link2 className="w-3.5 h-3.5" />
                                            固定ペア設定
                                        </Button>
                                    )}
                                    {data.mode !== 'RANDOM' && participantLevels.length > 0 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowLevelModal(true)}
                                            className="gap-1.5"
                                        >
                                            <SlidersHorizontal className="w-3.5 h-3.5" />
                                            レベル調整
                                        </Button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setShowAdminHint((v) => !v)}
                                        className="text-gray-400 hover:text-gray-600"
                                        title="これらの設定について"
                                        aria-label="これらの設定について"
                                        aria-expanded={showAdminHint}
                                    >
                                        <HelpCircle className="w-4 h-4" />
                                    </button>
                                </div>
                                {showAdminHint && (
                                    <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-md p-2 space-y-0.5">
                                        <p>次回の組み合わせから変更が適用されます。</p>
                                        <p>現在の組み合わせは変わりません。</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 2段目: [回数入力] 追加生成 */}
                        <div className="flex items-end gap-2 flex-wrap">
                            <label className="flex flex-col text-[11px] text-gray-500">
                                追加回数（1〜20）
                                <Input
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={addRounds}
                                    onChange={(e) => {
                                        const v = toHalfWidth(e.target.value)
                                        if (v === '') { setAddRounds(''); return }
                                        const n = Number(v)
                                        if (Number.isNaN(n)) return
                                        // 上限 20、下限 1 にクランプ
                                        setAddRounds(String(Math.min(20, Math.max(1, Math.floor(n)))))
                                    }}
                                    className="w-20 h-8 text-xs mt-0.5"
                                />
                            </label>
                            <Button
                                size="sm"
                                onClick={() => {
                                    const n = Math.min(20, Math.max(1, Number(addRounds || '1')))
                                    appendMutation.mutate(n)
                                }}
                                disabled={appendMutation.isPending || data.rounds.length >= 100}
                                className="gap-1.5"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                追加生成
                            </Button>
                            {data.rounds.length >= 100 && (
                                <span className="text-xs text-red-500 w-full">全体上限の100回に達しています。</span>
                            )}
                        </div>

                        {/* 3段目: 削除（誤操作防止のためアイコン主体・控えめ） */}
                        <div className="flex justify-end pt-1 border-t border-gray-100">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={deleteMutation.isPending}
                                title="組み合わせを削除"
                                aria-label="組み合わせを削除"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="sr-only sm:not-sr-only">削除</span>
                            </Button>
                        </div>
                    </div>
                )}

                {/* 表示モード切替 + 偏りチェック（管理者のみ） */}
                <div className="flex items-center gap-3 flex-wrap pt-1">
                    <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setViewMode('overall')}
                            className={`px-3 py-1 text-xs ${viewMode === 'overall' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                        >
                            全体
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('personal')}
                            className={`px-3 py-1 text-xs border-l border-gray-300 ${viewMode === 'personal' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                        >
                            個人
                        </button>
                    </div>
                    {isAdminOrAbove && (
                        <label className="inline-flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                            <span className="relative inline-block w-9 h-5">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={showDuplicateCheck}
                                    onChange={(e) => setShowDuplicateCheck(e.target.checked)}
                                />
                                <span className="absolute inset-0 rounded-full bg-gray-300 peer-checked:bg-orange-500 transition-colors" />
                                <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                            </span>
                            組み合わせ偏りチェック
                        </label>
                    )}
                </div>

                {/* ラウンドフィルターチップ（1行最大5個／null=全表示） */}
                {data.rounds.length > 1 && (
                    <div className="grid grid-cols-5 gap-1 pt-1 sm:grid-cols-5">
                        <button
                            type="button"
                            onClick={() => setFilteredRoundNo(null)}
                            className={`inline-flex items-center justify-center h-7 px-2 rounded-full border text-xs ${filteredRoundNo === null ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                            全て
                        </button>
                        {data.rounds.map((r) => {
                            const active = filteredRoundNo === r.roundNo
                            return (
                                <button
                                    key={r.roundNo}
                                    type="button"
                                    onClick={() => setFilteredRoundNo(active ? null : r.roundNo)}
                                    className={`inline-flex items-center justify-center h-7 px-2 rounded-full border text-xs ${active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                >
                                    {r.roundNo}回目
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            <div className="space-y-5">
                {/* 個人スケジュール表示モード（参加者×ラウンドのマトリクス） */}
                {viewMode === 'personal' ? (
                    (() => {
                        const showLevel = isAdminOrAbove
                        const randomMode = data.mode === 'RANDOM'
                        // participationId -> {participant, perRound: Map<roundNo, {courtNo, groupNo}>}
                        type Cell = { courtNo: number; groupNo: number }
                        const perPersonRound = new Map<string, Map<number, Cell>>()
                        const personMeta = new Map<string, { displayName: string; level: number }>()
                        for (const round of data.rounds) {
                            for (const court of round.courts) {
                                for (const group of court.groups) {
                                    for (const p of group.participants) {
                                        if (!personMeta.has(p.participationId)) {
                                            personMeta.set(p.participationId, { displayName: p.displayName, level: p.level })
                                        }
                                        let m = perPersonRound.get(p.participationId)
                                        if (!m) { m = new Map(); perPersonRound.set(p.participationId, m) }
                                        m.set(round.roundNo, { courtNo: court.courtNo, groupNo: group.groupNo })
                                    }
                                }
                            }
                        }
                        // 全参加者（participantLevels の表示順）を行に
                        const persons = participantLevels.length > 0
                            ? participantLevels.map((p) => ({ participationId: p.participationId, displayName: p.displayName, level: p.level }))
                            : Array.from(personMeta.entries())
                                .map(([id, m]) => ({ participationId: id, displayName: m.displayName, level: m.level }))
                                .sort((a, b) => a.displayName.localeCompare(b.displayName))
                        const visibleRounds = data.rounds.filter((r) => filteredRoundNo === null || r.roundNo === filteredRoundNo)

                        return (
                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="min-w-full text-xs border-collapse">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="sticky left-0 z-10 bg-gray-50 px-2 py-1.5 text-left font-medium text-gray-700 border-b border-r border-gray-200 whitespace-nowrap">
                                                参加者
                                            </th>
                                            {visibleRounds.map((r) => (
                                                <th key={r.roundNo} className="px-2 py-1.5 text-center font-medium text-gray-700 border-b border-gray-200 whitespace-nowrap">
                                                    {r.roundNo}回目
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {persons.map((person) => {
                                            const isMe = myParticipationId !== null && person.participationId === myParticipationId
                                            const rowClass = isMe ? 'bg-red-50' : ''
                                            const fixedNo = randomNumberByParticipationId.get(person.participationId)
                                            return (
                                                <tr key={person.participationId} className={rowClass}>
                                                    <td className={`sticky left-0 z-10 px-2 py-1.5 border-b border-r border-gray-200 whitespace-nowrap ${isMe ? 'font-bold text-red-600 bg-red-50' : 'bg-white'}`}>
                                                        <span className="inline-flex items-baseline gap-1">
                                                            {showLevel && !randomMode && (
                                                                <span
                                                                    className="inline-flex items-center justify-center px-1 rounded bg-emerald-100 text-emerald-700 font-medium"
                                                                    style={{ fontSize: '0.85em' }}
                                                                >
                                                                    {(levelLabels[person.level] ?? `Lv${person.level}`)}:Lv{person.level}
                                                                </span>
                                                            )}
                                                            {randomMode ? (
                                                                <span>{fixedNo ?? '?'} <span className="text-gray-700" style={{ fontSize: '0.85em' }}>({person.displayName})</span></span>
                                                            ) : (
                                                                <span>{person.displayName}</span>
                                                            )}
                                                        </span>
                                                    </td>
                                                    {visibleRounds.map((r) => {
                                                        const cell = perPersonRound.get(person.participationId)?.get(r.roundNo)
                                                        return (
                                                            <td key={r.roundNo} className={`px-2 py-1.5 text-center border-b border-gray-200 whitespace-nowrap ${isMe ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
                                                                {cell ? `コート${cell.courtNo}` : <span className="text-gray-400">休憩</span>}
                                                            </td>
                                                        )
                                                    })}
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )
                    })()
                ) : (
                    <>
                        {/* Issue 9 (revised): 乱数モードでは「参加者ごとに固定の番号」を割り当てる。
                    スケジュール内で同じ参加者は常に同じ番号で表示される（採番は randomNumberByParticipationId 参照）。 */}
                        {data.rounds
                            .filter((r) => filteredRoundNo === null || r.roundNo === filteredRoundNo)
                            .map((round) => {
                                const appearanceMap = appearanceCountByRoundParticipation.get(round.roundNo)

                                // 1人分の表示要素（自分ハイライト・乱数番号・レベル・累計回数）
                                // 表示形式（案A）: [Lv3] 山田太郎 ×2
                                //   - 左：レベルバッジ（管理者のみ・乱数モードでは非表示）
                                //   - 中央：氏名 or 乱数番号(氏名)
                                //   - 右：累計対戦回数 ×N
                                const renderParticipant = (
                                    p: { participationId: string; displayName: string; level: number },
                                    opts: { showLevel: boolean; randomMode: boolean },
                                ) => {
                                    const appearance = appearanceMap?.get(p.participationId)
                                    const isMe = myParticipationId !== null && p.participationId === myParticipationId
                                    const fixedNo = randomNumberByParticipationId.get(p.participationId)
                                    const showLevelBadge = opts.showLevel && !opts.randomMode
                                    return (
                                        <span className={`inline-flex items-baseline gap-1 ${isMe ? 'font-bold text-red-600' : ''}`}>
                                            {showLevelBadge && (
                                                <span
                                                    className="inline-flex items-center justify-center px-1 rounded bg-emerald-100 text-emerald-700 font-medium"
                                                    style={{ fontSize: '0.7em' }}
                                                >
                                                    {(levelLabels[p.level] ?? `Lv${p.level}`)}:Lv{p.level}
                                                </span>
                                            )}
                                            {opts.randomMode ? (
                                                <span>
                                                    {fixedNo ?? '?'}
                                                    <span className="text-gray-700" style={{ fontSize: '0.8em' }}> ({p.displayName})</span>
                                                </span>
                                            ) : (
                                                <span>{p.displayName}</span>
                                            )}
                                            {appearance !== undefined && (
                                                <span className="text-gray-500" style={{ fontSize: '0.75em' }}>({appearance}回目)</span>
                                            )}
                                        </span>
                                    )
                                }

                                return (
                                    <section key={round.roundNo} id={`round-${round.roundNo}`} className="rounded-lg border border-gray-200 p-4 space-y-3 scroll-mt-4">
                                        <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                            {round.roundNo}回目
                                            {isAdminOrAbove && (
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingRoundNo(round.roundNo)}
                                                    className="text-xs text-blue-600 hover:text-blue-700 font-normal"
                                                >
                                                    編集
                                                </button>
                                            )}
                                        </h2>
                                        <div className="space-y-2">
                                            {round.courts.map((court) => {
                                                const dupInfo = duplicateInfoByRoundCourt.get(round.roundNo)?.get(court.courtNo)
                                                const dupParts: string[] = []
                                                if (dupInfo?.pairDups.length) {
                                                    for (const pd of dupInfo.pairDups) {
                                                        const label = pd.participationIds
                                                            .map((pid) => {
                                                                for (const g of court.groups) {
                                                                    const found = g.participants.find((p) => p.participationId === pid)
                                                                    if (found) return formatParticipantLabel(pid, found.displayName)
                                                                }
                                                                return pid
                                                            })
                                                            .join('/')
                                                        dupParts.push(`ペア重複：${label}-${pd.nth}回目`)
                                                    }
                                                }
                                                if (dupInfo?.matchupDupNth) {
                                                    dupParts.push(`対戦組み合わせ重複：${dupInfo.matchupDupNth}回目`)
                                                }
                                                const showLevel = isAdminOrAbove
                                                const randomMode = data.mode === 'RANDOM'
                                                return (
                                                    <div key={court.courtNo} className="text-sm text-gray-700">
                                                        <div>
                                                            <div className="text-xs font-medium text-gray-600 mb-1">コート{court.courtNo}</div>
                                                            <div
                                                                className="grid border-2 border-gray-400 rounded overflow-hidden bg-green-50"
                                                                style={{ gridTemplateColumns: `repeat(${court.groups.length}, minmax(0, 1fr))` }}
                                                            >
                                                                {court.groups.map((group, idx) => (
                                                                    <div
                                                                        key={group.groupNo}
                                                                        className={`p-2 min-h-[3.5rem] flex flex-col justify-center gap-0.5 ${idx > 0 ? 'border-l-2 border-gray-400' : ''}`}
                                                                    >
                                                                        {group.participants.map((p, pi) => (
                                                                            <div key={pi} className="text-xs leading-tight">
                                                                                {renderParticipant(p, { showLevel, randomMode })}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        {showDuplicateCheck && dupParts.length > 0 && (
                                                            <div className="text-xs text-orange-500 font-normal mt-1">
                                                                [{dupParts.join(' , ')}]
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </section>
                                )
                            })}
                    </>
                )}
            </div>

            <LevelAdjustModal
                open={showLevelModal}
                onClose={() => setShowLevelModal(false)}
                isRandom={data.mode === 'RANDOM'}
                participants={participantLevels}
                showHint={true}
                levelLabels={levelLabels}
                onUpdateMemberLevel={(userId, level) => updateMemberLevelMutation.mutate({ communityId, userId, level })}
                onUpdateVisitorLevel={(participationId, level) => updateVisitorLevelMutation.mutate({ participationId, level })}
            />

            {/* 3-4: delete confirmation dialog */}
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>組み合わせを削除しますか？</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600">この操作は取り消せません。</p>
                    <div className="flex justify-end gap-3 mt-4">
                        <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>キャンセル</Button>
                        <Button
                            variant="destructive"
                            onClick={() => { deleteMutation.mutate(); setShowDeleteConfirm(false) }}
                            disabled={deleteMutation.isPending}
                        >
                            削除
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* 固定ペア変更モーダル（既存ラウンドは変更されず、次回追加生成から反映） */}
            <Dialog open={showFixedPairsModal} onOpenChange={setShowFixedPairsModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>固定ペアの変更</DialogTitle>
                    </DialogHeader>
                    <FixedPairsEditor
                        participants={participantLevels}
                        value={fixedPairs}
                        onChange={setFixedPairs}
                    />
                    <div className="flex justify-end gap-2 pt-1">
                        <Button variant="outline" size="sm" onClick={() => setShowFixedPairsModal(false)}>キャンセル</Button>
                        <Button
                            size="sm"
                            disabled={updateFixedPairsMutation.isPending}
                            onClick={() => {
                                updateFixedPairsMutation.mutate(fixedPairs, {
                                    onSuccess: () => setShowFixedPairsModal(false),
                                })
                            }}
                        >
                            保存
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* 各回編集モーダル */}
            {editingRoundNo !== null && (() => {
                const target = data.rounds.find((r) => r.roundNo === editingRoundNo)
                if (!target) return null
                const initialCourts = target.courts.map((c) => ({
                    courtNo: c.courtNo,
                    groups: c.groups.map((g) => ({
                        groupNo: g.groupNo,
                        participantIds: g.participants.map((p) => p.participationId),
                    })),
                }))
                return (
                    <RoundEditModal
                        open={editingRoundNo !== null}
                        onClose={() => setEditingRoundNo(null)}
                        roundNo={editingRoundNo}
                        initialCourts={initialCourts}
                        allParticipants={participantLevels}
                        saving={updateRoundMutation.isPending}
                        onSave={(courts) => {
                            updateRoundMutation.mutate(
                                { roundNo: editingRoundNo, courts },
                                { onSuccess: () => setEditingRoundNo(null) },
                            )
                        }}
                    />
                )
            })()}
        </div>
    )
}
