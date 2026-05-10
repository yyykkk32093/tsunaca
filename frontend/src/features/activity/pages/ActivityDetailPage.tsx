import { useAuth } from '@/app/providers/AuthProvider'
import { useActivity, useChangeOrganizer, type NotifyOption } from '@/features/activity/hooks/useActivityQueries'
import { AdBanner } from '@/features/ads/components/AdBanner'
import { chatApi } from '@/features/chat/api/chatApi'
import { useMyRole } from '@/features/community/hooks/useCommunityQueries'
import { useMembers } from '@/features/community/hooks/useMemberQueries'
import { BulkConfirmDialog } from '@/features/participation/components/BulkConfirmDialog'
import { ParticipationActionButton } from '@/features/participation/components/ParticipationActionButton'
import { RefundPendingSection } from '@/features/participation/components/RefundPendingSection'
import { useAddVisitor, useBulkUpdatePayment, useConfirmPayment, useParticipants, useRemoveParticipation, useUpdateVisitorPayment, useVisitorNameSuggestions, useWaitlistEntries } from '@/features/participation/hooks/useParticipationQueries'
import { useCancelOrDeleteSchedule, useRestoreSchedule, useSchedule, useSchedules } from '@/features/schedule/hooks/useScheduleQueries'
import { useSetHeaderActions } from '@/shared/components/HeaderActionsContext'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Separator } from '@/shared/components/ui/separator'
import { useRedirectOnNotFound } from '@/shared/hooks/useRedirectOnNotFound'
import type { Member, ParticipantItem, ScheduleListItem } from '@/shared/types/api'
import { formatDateLabel } from '@/shared/utils/dateGroup'
import { ArrowLeftRight, Banknote, Calendar, ClipboardCheck, Edit, ExternalLink, MapPin, Repeat, Settings, Trash2, User, UserMinus, UserPlus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

/**
 * ActivityDetailPage — アクティビティ詳細画面
 *
 * 遷移パターン:
 *  1. コミュニティ詳細 > アクティビティタブ > 該当アクティビティ選択
 *  2. ユーザーのアクティビティタブ > 該当アクティビティ選択
 *
 * 表示項目:
 *  - 開催場所、日時、幹事
 *  - スケジュール一覧（参加費・参加者数・参加ボタン付き）
 */
export function ActivityDetailPage() {
    const { communityId, id } = useParams<{ communityId: string; id: string }>()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const scheduleIdParam = searchParams.get('schedule')
    const { data: activity, isLoading, error: activityError } = useActivity(id!)
    useRedirectOnNotFound(activityError)
    const { data: schedulesData, isLoading: isSchedulesLoading, isError: isSchedulesError, error: schedulesError, refetch: refetchSchedules } = useSchedules(id!)
    useRedirectOnNotFound(schedulesError)
    const schedules = schedulesData?.schedules ?? []
    const { role: currentUserRole, isAdminOrAbove } = useMyRole(activity?.communityId ?? '')
    const cancelOrDeleteMutation = useCancelOrDeleteSchedule(id!, activity?.communityId ?? '')
    const cancelOrDeleteRef = useRef(cancelOrDeleteMutation)
    cancelOrDeleteRef.current = cancelOrDeleteMutation
    const [showOrganizerDialog, setShowOrganizerDialog] = useState(false)
    const [showActionDialog, setShowActionDialog] = useState(false)
    const [dialogOperation, setDialogOperation] = useState<'cancel' | 'delete'>('cancel')
    const [dialogScope, setDialogScope] = useState<'single' | 'all'>('single')
    const [dialogNotifyOption, setDialogNotifyOption] = useState<NotifyOption>('push_only')

    // 表示対象のスケジュールを決定（param があれば優先、なければ先頭にフォールバック）
    const activeSchedule = useMemo(() => {
        if (schedules.length === 0) return null
        if (scheduleIdParam) {
            return schedules.find((s) => s.id === scheduleIdParam) ?? schedules[0]
        }
        return schedules[0]
    }, [schedules, scheduleIdParam])

    const activeIndex = activeSchedule ? schedules.findIndex((s) => s.id === activeSchedule.id) : -1

    const switchSchedule = (idx: number) => {
        const s = schedules[idx]
        if (s) setSearchParams({ schedule: s.id }, { replace: true })
    }

    // C-16: 全スケジュールが過去かどうか判定（過去なら編集/削除ボタン非表示）
    const isPastActivity = useMemo(() => {
        if (schedules.length === 0) return false
        return schedules.every((s) => {
            if (!s.date || !s.endTime) return false
            const endDateTime = new Date(`${s.date}T${s.endTime}`)
            return endDateTime.getTime() < Date.now()
        })
    }, [schedules])

    // ヘッダーに編集・削除アイコンを設定（C-16: 過去禁止 + C-17: 権限チェック + キャンセル済み/削除済み禁止）
    const isActiveScheduleCancelled = activeSchedule?.status === 'CANCELLED'
    const isScheduleUnavailable = !activeSchedule
    const headerActions = useMemo(
        () =>
            activity && isAdminOrAbove && !isPastActivity && !isActiveScheduleCancelled && !isScheduleUnavailable ? (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate(`/communities/${communityId}/activities/${id}/edit`)}
                        className="p-1.5 hover:bg-gray-100 rounded-md"
                        aria-label="編集"
                    >
                        <Edit className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                        onClick={() => {
                            setDialogOperation('cancel')
                            setDialogScope('single')
                            setDialogNotifyOption('push_only')
                            setShowActionDialog(true)
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded-md"
                        aria-label="キャンセル・削除"
                    >
                        <Trash2 className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
            ) : null,
        [activity, id, navigate, isAdminOrAbove, isPastActivity, isActiveScheduleCancelled, isScheduleUnavailable]
    )
    useSetHeaderActions(headerActions)

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            </div>
        )
    }

    if (!activity) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-red-500">
                <p className="text-sm">アクティビティが見つかりません</p>
            </div>
        )
    }

    if (activity.deleted) {
        return (
            <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-3">
                <Trash2 className="w-10 h-10 text-gray-300 mx-auto" />
                <h1 className="text-lg font-semibold text-gray-700">このアクティビティは削除されました</h1>
                <p className="text-sm text-gray-500">「{activity.title}」は削除済みです。</p>
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="text-sm text-blue-600 hover:underline"
                >
                    戻る
                </button>
            </div>
        )
    }

    return (
        <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
            {/* ── アクティビティ名 ── */}
            <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">{activity.title}</h1>
                {activeSchedule?.status === 'CANCELLED' && (
                    <span className="text-xs text-red-500 font-medium bg-red-50 px-2 py-0.5 rounded shrink-0">中止</span>
                )}
            </div>

            {/* ── アクティビティ概要 ── */}
            {activity.description && (
                <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
                    <p className="text-xs font-semibold text-gray-500 mb-1">アクティビティ概要</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{activity.description}</p>
                </div>
            )}

            {/* ── 情報セクション ── */}
            <div className="space-y-2 text-sm text-gray-700">
                {activity.communityName && (
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400 shrink-0" />
                        <span>コミュニティ名：</span>
                        <button
                            type="button"
                            onClick={() => navigate(`/communities/${activity.communityId}`)}
                            className="text-blue-600 hover:underline"
                        >
                            {activity.communityName}
                        </button>
                    </div>
                )}
                {activity.defaultLocation && activity.defaultLocation !== 'オンライン' && (
                    <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                        <span>開催場所：{activity.defaultLocation}</span>
                    </div>
                )}
                {activity.defaultAddress && (
                    <div className="flex items-center gap-2 ml-6">
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.defaultAddress)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                            Googleマップで開く
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                )}
                {activeSchedule ? (
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                        <span>
                            日時：{formatDateLabel(activeSchedule.date)} {activeSchedule.startTime} 〜 {activeSchedule.endTime}
                        </span>
                    </div>
                ) : (activity.defaultStartTime || activity.defaultEndTime) ? (
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                        <span>
                            日時：{activity.defaultStartTime ?? '--:--'} 〜 {activity.defaultEndTime ?? '--:--'}
                        </span>
                    </div>
                ) : null}
                {/* 幹事 + 参加費 + チャットボタン (#33) */}
                <div className="flex items-stretch gap-3">
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400 shrink-0" />
                            <span>幹事：{activity.organizerDisplayName ?? activity.organizerUserId ? (activity.organizerDisplayName ?? '—') : '未定'}</span>
                            {isAdminOrAbove && (
                                <button
                                    type="button"
                                    onClick={() => setShowOrganizerDialog(true)}
                                    className="p-1 hover:bg-gray-100 rounded"
                                    aria-label="幹事を変更"
                                >
                                    <ArrowLeftRight className="w-3.5 h-3.5 text-gray-400" />
                                </button>
                            )}
                        </div>
                        {/* 参加費（表示中のスケジュールから取得） */}
                        {activeSchedule && (
                            <div className="flex items-center gap-2">
                                <Banknote className="w-4 h-4 text-gray-400 shrink-0" />
                                <span>
                                    参加費：{activeSchedule.participationFee != null && activeSchedule.participationFee > 0
                                        ? `¥${activeSchedule.participationFee.toLocaleString()}`
                                        : '無料'}
                                    {activeSchedule.visitorFee != null && activeSchedule.visitorFee !== activeSchedule.participationFee && (
                                        <span className="text-gray-500 ml-1">
                                            （ビジター：¥{activeSchedule.visitorFee.toLocaleString()}）
                                        </span>
                                    )}
                                </span>
                            </div>
                        )}
                    </div>
                    {/* チャットボタン: 幹事・参加費の右横に2行分の高さ */}
                    <button
                        type="button"
                        onClick={async () => {
                            try {
                                const { channelId } = await chatApi.getActivityChannel(id!)
                                navigate(`/chats/${channelId}`)
                            } catch {
                                // エラー時は何もしない
                            }
                        }}
                        className="flex items-center justify-center px-4 border border-gray-300 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition-colors shrink-0 text-xs font-medium whitespace-nowrap"
                    >
                        チャットを始める
                    </button>
                </div>
                {/* 繰り返し予定ナビ（recurrenceRule あり時） */}
                {activity.recurrenceRule && activeSchedule && (
                    <div className="flex items-center gap-2">
                        <Repeat className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-700">繰り返し予定：</span>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => switchSchedule(activeIndex - 1)}
                                disabled={activeIndex <= 0}
                                className="text-xs text-blue-600 disabled:text-gray-300 disabled:cursor-not-allowed"
                            >
                                ← 前の予定
                            </button>
                            <span className="text-xs text-gray-400">
                                {activeIndex + 1} / {schedules.length}
                            </span>
                            <button
                                type="button"
                                onClick={() => switchSchedule(activeIndex + 1)}
                                disabled={activeIndex >= schedules.length - 1}
                                className="text-xs text-blue-600 disabled:text-gray-300 disabled:cursor-not-allowed"
                            >
                                次の予定 →
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <Separator />

            {/* ── スケジュール ── */}
            <div>
                {isSchedulesLoading ? (
                    <div className="flex items-center justify-center py-6">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                    </div>
                ) : isSchedulesError ? (
                    <div className="text-center py-4 space-y-2">
                        <p className="text-sm text-red-500">スケジュールの取得に失敗しました</p>
                        <p className="text-xs text-gray-400">{(schedulesError as Error)?.message}</p>
                        <button
                            onClick={() => refetchSchedules()}
                            className="text-xs text-blue-600 underline"
                        >
                            再読み込み
                        </button>
                    </div>
                ) : !activeSchedule ? (
                    <p className="text-sm text-gray-400 text-center py-4">削除済みのスケジュールです。</p>
                ) : (
                    <ScheduleSection
                        schedule={activeSchedule}
                        communityId={activity.communityId}
                        enabledPaymentMethods={activity.communityPaymentSettings?.enabledPaymentMethods}
                        paypayId={activity.communityPaymentSettings?.paypayId}
                        isAdminOrAbove={isAdminOrAbove}
                        currentUserRole={currentUserRole ?? undefined}
                    />
                )}
            </div>

            {/* [14] スケジュールセクション直下 */}
            <AdBanner slotId="activity-detail-participants-below" />

            {/* ── 幹事変更ダイアログ ── */}
            {activity && (
                <ChangeOrganizerDialog
                    activityId={id!}
                    communityId={activity.communityId}
                    open={showOrganizerDialog}
                    onOpenChange={setShowOrganizerDialog}
                />
            )}

            {/* ── キャンセル・削除ダイアログ ── */}
            <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>スケジュールの操作</DialogTitle>
                    </DialogHeader>

                    {/* ① 操作の選択 */}
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-500">操作</p>
                        {([
                            { value: 'cancel' as const, label: 'キャンセルする', desc: 'スケジュールを「中止」にする（履歴は残ります）' },
                            { value: 'delete' as const, label: '削除する', desc: 'スケジュールを完全に削除する' },
                        ]).map(({ value, label, desc }) => (
                            <label key={value} className="flex items-start gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="dialogOperation"
                                    value={value}
                                    checked={dialogOperation === value}
                                    onChange={() => setDialogOperation(value)}
                                    className="mt-0.5"
                                />
                                <div>
                                    <span className="text-sm text-gray-700">{label}</span>
                                    <p className="text-xs text-gray-400">{desc}</p>
                                </div>
                            </label>
                        ))}
                    </div>

                    {/* ② 対象範囲（recurrenceRule がある場合のみ） */}
                    {activity?.recurrenceRule && (
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-gray-500">対象</p>
                            {([
                                { value: 'single' as const, label: 'この回のみ', desc: '表示中のスケジュールだけに適用' },
                                { value: 'all' as const, label: 'すべての回', desc: 'このアクティビティの全スケジュールに適用' },
                            ]).map(({ value, label, desc }) => (
                                <label key={value} className="flex items-start gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="dialogScope"
                                        value={value}
                                        checked={dialogScope === value}
                                        onChange={() => setDialogScope(value)}
                                        className="mt-0.5"
                                    />
                                    <div>
                                        <span className="text-sm text-gray-700">{label}</span>
                                        <p className="text-xs text-gray-400">{desc}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}

                    {/* ③ 通知オプション (Wave6 W6-10: 削除時は「お知らせ投稿」選択肢のみ除外) */}
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-500">参加者への通知</p>
                        {(dialogOperation === 'delete'
                            ? ([
                                { value: 'push_only' as NotifyOption, label: 'プッシュ通知のみ', desc: '参加者・キャンセル待ちユーザーへのプッシュ通知のみ' },
                                { value: 'none' as NotifyOption, label: '通知しない', desc: '参加者・キャンセル待ちユーザーには通知しない' },
                            ])
                            : ([
                                { value: 'announcement' as NotifyOption, label: 'お知らせ投稿 + プッシュ通知', desc: 'コミュニティのお知らせとして投稿し、参加者にプッシュ通知を送信' },
                                { value: 'push_only' as NotifyOption, label: 'プッシュ通知のみ', desc: '参加者・キャンセル待ちユーザーへのプッシュ通知のみ' },
                                { value: 'none' as NotifyOption, label: '通知しない', desc: '参加者・キャンセル待ちユーザーには通知しない' },
                            ])
                        ).map(({ value, label, desc }) => (
                            <label key={value} className="flex items-start gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="dialogNotify"
                                    value={value}
                                    checked={dialogNotifyOption === value}
                                    onChange={() => setDialogNotifyOption(value)}
                                    className="mt-0.5"
                                />
                                <div>
                                    <span className="text-sm text-gray-700">{label}</span>
                                    <p className="text-xs text-gray-400">{desc}</p>
                                </div>
                            </label>
                        ))}
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={() => setShowActionDialog(false)}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                        >
                            戻る
                        </button>
                        <button
                            type="button"
                            onClick={async () => {
                                if (!activeSchedule) return
                                const result = await cancelOrDeleteRef.current.mutateAsync({
                                    scheduleId: activeSchedule.id,
                                    operation: dialogOperation,
                                    scope: activity?.recurrenceRule ? dialogScope : 'single',
                                    notifyOption: dialogNotifyOption,
                                })
                                setShowActionDialog(false)
                                // Activityが削除された場合は前の画面に戻る
                                if (result.activityDeleted) {
                                    navigate(-1)
                                }
                            }}
                            disabled={cancelOrDeleteMutation.isPending}
                            className={`px-3 py-1.5 text-sm text-white rounded-md disabled:opacity-50 ${dialogOperation === 'delete'
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-orange-500 hover:bg-orange-600'
                                }`}
                        >
                            {cancelOrDeleteMutation.isPending
                                ? '処理中...'
                                : dialogOperation === 'delete' ? '削除する' : 'キャンセルする'}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// ─── スケジュール単位の参加セクション ────────────────────

function ScheduleSection({ schedule, communityId, enabledPaymentMethods, paypayId, isAdminOrAbove, currentUserRole }: { schedule: ScheduleListItem; communityId: string; enabledPaymentMethods?: string[]; paypayId?: string | null; isAdminOrAbove?: boolean; currentUserRole?: string }) {
    const { user } = useAuth()
    const currentUserId = user?.userId
    const { data: participantsData } = useParticipants(schedule.id)
    const { data: waitlistData } = useWaitlistEntries(schedule.id)
    const confirmPaymentMutation = useConfirmPayment(schedule.id)
    const addVisitorMutation = useAddVisitor(schedule.id)
    const updateVisitorPaymentMutation = useUpdateVisitorPayment(schedule.id)
    const removeParticipationMutation = useRemoveParticipation(schedule.id)
    // 個別スケジュールAPIで myStatus / attendingCount / waitlistCount を取得
    const { data: scheduleDetail, isLoading: isDetailLoading } = useSchedule(schedule.id)
    const participants = participantsData?.participants ?? []
    const waitlistEntries = waitlistData?.entries ?? []
    const isCancelled = schedule.status === 'CANCELLED'
    const remaining = schedule.capacity != null ? schedule.capacity - participants.length : null
    // #40: 一括確認ダイアログ
    const [showBulkConfirm, setShowBulkConfirm] = useState(false)
    const [showAddVisitor, setShowAddVisitor] = useState(false)
    const hasReportedPayments = participants.some((p) => p.paymentStatus === 'REPORTED')

    // 一括支払い方法設定
    const bulkUpdatePaymentMutation = useBulkUpdatePayment(schedule.id)
    const [showBulkPaymentMethodDialog, setShowBulkPaymentMethodDialog] = useState(false)
    const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set())
    const [bulkPaymentMethod, setBulkPaymentMethod] = useState<string>('')
    const resolvedPaymentMethods = enabledPaymentMethods ?? ['CASH']
    const bulkTargetParticipants = participants.filter((p) => p.isVisitor && !p.userId)

    useEffect(() => {
        if (showBulkPaymentMethodDialog) {
            setBulkSelectedIds(new Set(bulkTargetParticipants.map((p) => p.id)))
            setBulkPaymentMethod(resolvedPaymentMethods[0] ?? 'CASH')
        }
    }, [showBulkPaymentMethodDialog])

    // #34: 過去アクティビティ判定（endTime を過ぎたらボタン非活性）
    const isExpired = (() => {
        if (!schedule.date || !schedule.endTime) return false
        const endDateTime = new Date(`${schedule.date}T${schedule.endTime}`)
        return endDateTime.getTime() < Date.now()
    })()

    const myStatus = scheduleDetail?.myStatus ?? 'none'
    const hasFee = (schedule.participationFee != null && schedule.participationFee > 0) || (schedule.visitorFee != null && schedule.visitorFee > 0)
    const isFull = schedule.capacity != null
        && (scheduleDetail?.attendingCount ?? participants.length) >= schedule.capacity

    // ── 参加者削除: 権限判定 ──
    const canDeleteParticipant = (p: ParticipantItem): boolean => {
        if (isCancelled) return false
        // ビジター: 追加者本人 OR ADMIN+
        if (p.isVisitor) {
            return (p.addedBy === currentUserId) || !!isAdminOrAbove
        }
        // 自分自身は削除ボタンで消さない（キャンセルフローを使う）
        if (p.userId === currentUserId) return false
        // ADMIN は MEMBER のみ削除可、OWNER は ADMIN/MEMBER 削除可（OWNER は削除不可）
        // → フロントは isAdminOrAbove でざっくり表示し、バックエンドが厳密に権限チェック
        return !!isAdminOrAbove
    }
    const handleDeleteParticipant = (p: ParticipantItem) => {
        const name = p.visitorName ?? p.displayName ?? p.userId?.slice(0, 8) ?? '参加者'
        if (window.confirm(`${name} を参加者から削除しますか？`)) {
            removeParticipationMutation.mutate(p.id)
        }
    }

    return (
        <div className="border rounded-lg p-4 space-y-3">

            {/* C-18: オンライン時に会議URL表示 */}
            {schedule.isOnline && schedule.meetingUrl && (
                <div className="flex items-center gap-1.5 text-sm text-blue-600">
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <a
                        href={schedule.meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline truncate"
                        onClick={(e) => e.stopPropagation()}
                    >
                        会議URLを開く
                    </a>
                </div>
            )}

            {/* 参加者一覧 */}
            <div>
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-semibold text-gray-600">
                        参加者一覧（{remaining != null ? `残り: ${remaining}/${schedule.capacity}` : `${participants.length}名`}）
                    </h3>
                    {!isCancelled && !isExpired && (
                        <button
                            type="button"
                            onClick={() => setShowAddVisitor(true)}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                        >
                            <UserPlus className="w-3.5 h-3.5" />
                            ビジター追加
                        </button>
                    )}
                </div>
                <div className="border rounded overflow-hidden">
                    <div className="max-h-[331px] overflow-auto">
                        <table className="w-full text-xs">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-gray-50 border-b">
                                    <th className="px-2 py-1 text-left font-medium text-gray-600 w-8">No.</th>
                                    <th className="px-2 py-1 text-left font-medium text-gray-600">参加者</th>
                                    <th className="px-2 py-1 text-left font-medium text-gray-600 w-16">ビジター</th>
                                    {isAdminOrAbove && hasFee && (
                                        <th className="px-2 py-1 text-left font-medium text-gray-600 w-20">
                                            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                                支払い方法
                                                <button
                                                    type="button"
                                                    onClick={() => setShowBulkPaymentMethodDialog(true)}
                                                    className="p-0.5 hover:bg-gray-200 rounded transition-colors"
                                                    aria-label="支払い方法を一括設定"
                                                    title="支払い方法を一括設定"
                                                >
                                                    <Settings className="w-3.5 h-3.5 text-blue-600" />
                                                </button>
                                            </span>
                                        </th>
                                    )}
                                    {isAdminOrAbove && hasFee && (
                                        <th className="px-2 py-1 text-left font-medium text-gray-600 w-20">
                                            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                                支払い
                                                <button
                                                    type="button"
                                                    onClick={() => setShowBulkConfirm(true)}
                                                    className="p-0.5 hover:bg-gray-200 rounded transition-colors"
                                                    aria-label="支払いを一括確認"
                                                    title="支払いを一括確認"
                                                >
                                                    <ClipboardCheck className="w-3.5 h-3.5 text-blue-600" />
                                                </button>
                                            </span>
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const totalRows = schedule.capacity != null ? Math.max(schedule.capacity, participants.length) : Math.max(participants.length, 1)
                                    return Array.from({ length: totalRows }, (_, i) => {
                                        const p = participants[i] as ParticipantItem | undefined
                                        return (
                                            <tr key={p?.id ?? `empty-${i}`} className="border-b last:border-0">
                                                <td className="px-2 py-1 text-gray-600">{i + 1}</td>
                                                <td className="px-2 py-1 text-gray-900">
                                                    {p ? (
                                                        <span className="flex items-center justify-between">
                                                            <span className="truncate">
                                                                {p.visitorName
                                                                    ? p.visitorName
                                                                    : (p.displayName ?? (p.userId ? p.userId.slice(0, 8) : '—'))}
                                                            </span>
                                                            {canDeleteParticipant(p) && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteParticipant(p)}
                                                                    disabled={removeParticipationMutation.isPending}
                                                                    className="p-0.5 hover:bg-red-50 rounded transition-colors flex-shrink-0 ml-1"
                                                                    aria-label="参加を取り消す"
                                                                    title="参加を取り消す"
                                                                >
                                                                    <UserMinus className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                                                                </button>
                                                            )}
                                                        </span>
                                                    ) : <span className="text-gray-300">—</span>}
                                                </td>
                                                <td className="px-2 py-1 text-center align-middle">
                                                    {p ? (
                                                        p.isVisitor
                                                            ? <div className="flex flex-col items-center justify-center leading-none h-[21px]">
                                                                <span className="text-sm">✓</span>
                                                                {!p.userId && <span className="text-[7px] text-gray-400 -mt-px">（ゲスト）</span>}
                                                            </div>
                                                            : <div className="flex items-center justify-center h-[21px]">—</div>
                                                    ) : <div className="flex items-center justify-center h-[21px]"><span className="text-gray-300">—</span></div>}
                                                </td>
                                                {isAdminOrAbove && hasFee && (
                                                    <td className="px-2 py-1 text-center">
                                                        {p?.paymentMethod ? (
                                                            <span className="text-gray-700">
                                                                {p.paymentMethod === 'CASH' ? '現金' : p.paymentMethod === 'PAYPAY' ? 'PayPay' : p.paymentMethod === 'CREDIT_CARD' ? 'カード' : '—'}
                                                            </span>
                                                        ) : <span className="text-gray-300">—</span>}
                                                    </td>
                                                )}
                                                {isAdminOrAbove && hasFee && (
                                                    <td className="px-2 py-1 text-center">
                                                        {p ? (
                                                            p.paymentStatus === 'CONFIRMED' ? (
                                                                <span className="text-green-600">済</span>
                                                            ) : p.paymentStatus === 'REPORTED' ? (
                                                                <button
                                                                    type="button"
                                                                    className="text-yellow-600 hover:text-green-600 underline underline-offset-2 transition-colors"
                                                                    onClick={() => confirmPaymentMutation.mutate(p.id)}
                                                                    disabled={confirmPaymentMutation.isPending}
                                                                >
                                                                    確認待ち
                                                                </button>
                                                            ) : p.paymentStatus === 'UNPAID' ? (
                                                                <span className="text-red-500">未済</span>
                                                            ) : p.paymentStatus === 'REFUND_PENDING' ? (
                                                                <span className="text-orange-500">返金待ち</span>
                                                            ) : p.paymentStatus === 'REFUNDED' ? (
                                                                <span className="text-gray-500">返金済</span>
                                                            ) : p.paymentStatus === 'NO_REFUND' ? (
                                                                <span className="text-gray-400">返金不要</span>
                                                            ) : '—'
                                                        ) : <span className="text-gray-300">—</span>}
                                                    </td>
                                                )}
                                            </tr>
                                        )
                                    })
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>
                {/* Wave6 W6-08: 中止スケジュールの中止取り消し */}
                {isCancelled && isAdminOrAbove && schedule.date && new Date(`${schedule.date}T23:59:59`).getTime() >= Date.now() && (
                    <div className="mt-2 flex flex-col items-end gap-1">
                        {schedule.hasPayments && (
                            <p className="text-xs text-red-500">決済処理中のレコードが存在するため中止を取り消せません。</p>
                        )}
                        <RestoreScheduleButton
                            scheduleId={schedule.id}
                            activityId={schedule.activityId}
                            hasPayments={schedule.hasPayments ?? false}
                        />
                    </div>
                )}
            </div>

            {/* キャンセル待ち一覧（参加上限がある場合のみ表示） */}
            {schedule.capacity != null && (
                <div>
                    <h3 className="text-xs font-semibold text-gray-600 mb-1">
                        キャンセル待ち（{waitlistEntries.length}名）
                    </h3>
                    {waitlistEntries.length > 0 ? (
                        <div className="border rounded overflow-hidden">
                            <div className="max-h-40 overflow-auto">
                                <table className="w-full text-xs">
                                    <thead className="sticky top-0 z-10">
                                        <tr className="bg-orange-50 border-b">
                                            <th className="px-2 py-1 text-left font-medium text-gray-600 w-8">No.</th>
                                            <th className="px-2 py-1 text-left font-medium text-gray-600">名前</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {waitlistEntries.map((w, i) => (
                                            <tr key={w.id} className="border-b last:border-0">
                                                <td className="px-2 py-1 text-gray-600">{i + 1}</td>
                                                <td className="px-2 py-1 text-gray-900">
                                                    {w.displayName ?? '—'}
                                                    {w.isVisitor && (
                                                        <span className="ml-1 text-[10px] bg-gray-100 text-gray-500 px-1 py-0.5 rounded">ゲスト</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400">キャンセル待ちはいません。</p>
                    )}
                </div>
            )}

            {/* 参加アクションボタン（scheduleDetail読込完了まで表示しない） */}
            {!isCancelled && (
                isExpired ? (
                    <div className="text-center py-2">
                        <p className="text-sm text-gray-400">この予定は終了しました</p>
                    </div>
                ) : isDetailLoading ? (
                    <div className="flex justify-center py-2">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                    </div>
                ) : (
                    <ParticipationActionButton
                        scheduleId={schedule.id}
                        hasFee={hasFee}
                        participationFee={schedule.participationFee}
                        myStatus={myStatus}
                        isFull={isFull}
                        enabledPaymentMethods={enabledPaymentMethods}
                        isAdminOrAbove={isAdminOrAbove}
                        paypayId={paypayId}
                        myParticipationId={scheduleDetail?.myParticipationId}
                        myPaymentMethod={scheduleDetail?.myPaymentMethod}
                        myPaymentStatus={scheduleDetail?.myPaymentStatus}
                    />
                )
            )}

            {/* 管理者向け: 返金待ち一覧 */}
            {isAdminOrAbove && <RefundPendingSection scheduleId={schedule.id} />}

            {/* #40: 一括確認ダイアログ */}
            <BulkConfirmDialog
                scheduleId={schedule.id}
                participants={participants}
                open={showBulkConfirm}
                onClose={() => setShowBulkConfirm(false)}
            />

            {/* 一括支払い方法設定ダイアログ */}
            {showBulkPaymentMethodDialog && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
                    onClick={() => setShowBulkPaymentMethodDialog(false)}
                >
                    <div
                        className="bg-white rounded-2xl w-full max-w-md mx-4 p-5 animate-slide-up max-h-[80vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-base font-semibold text-gray-800 mb-1">支払い方法の一括設定</h3>
                        <p className="text-xs text-gray-500 mb-4">
                            ビジター（ゲスト）の支払い方法をまとめて設定します。
                        </p>

                        {bulkTargetParticipants.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-8">対象のビジターはいません</p>
                        ) : (
                            <>
                                {/* 全選択 / 全解除 */}
                                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                                    <input
                                        type="checkbox"
                                        checked={bulkSelectedIds.size === bulkTargetParticipants.length}
                                        onChange={() => {
                                            if (bulkSelectedIds.size === bulkTargetParticipants.length) {
                                                setBulkSelectedIds(new Set())
                                            } else {
                                                setBulkSelectedIds(new Set(bulkTargetParticipants.map((p) => p.id)))
                                            }
                                        }}
                                        className="w-4 h-4 rounded accent-blue-500"
                                    />
                                    <span className="text-xs text-gray-600 font-medium">
                                        全て選択（{bulkSelectedIds.size}/{bulkTargetParticipants.length}）
                                    </span>
                                </div>

                                {/* 対象者リスト */}
                                <div className="flex-1 overflow-y-auto space-y-1 min-h-0 mb-4">
                                    {bulkTargetParticipants.map((p) => (
                                        <label
                                            key={p.id}
                                            className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={bulkSelectedIds.has(p.id)}
                                                onChange={() => {
                                                    setBulkSelectedIds((prev) => {
                                                        const next = new Set(prev)
                                                        if (next.has(p.id)) next.delete(p.id)
                                                        else next.add(p.id)
                                                        return next
                                                    })
                                                }}
                                                className="w-4 h-4 rounded accent-blue-500"
                                            />
                                            <p className="flex-1 min-w-0 text-sm text-gray-800 truncate">
                                                {p.visitorName ?? p.displayName ?? '—'}
                                                <span className="text-[10px] text-gray-400 ml-1">
                                                    （{p.paymentMethod === 'CASH' ? '現金' : p.paymentMethod === 'PAYPAY' ? 'PayPay' : p.paymentMethod === 'CREDIT_CARD' ? 'カード' : '未指定'}）
                                                </span>
                                            </p>
                                        </label>
                                    ))}
                                </div>

                                {/* 支払い方法選択 */}
                                <div className="mb-4">
                                    <label className="block text-xs text-gray-600 font-medium mb-1">支払い方法</label>
                                    <select
                                        value={bulkPaymentMethod}
                                        onChange={(e) => setBulkPaymentMethod(e.target.value)}
                                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white"
                                    >
                                        {(['CASH', 'PAYPAY', 'CREDIT_CARD'] as const).map((method) => {
                                            const enabled = resolvedPaymentMethods.includes(method)
                                            const label = method === 'CASH' ? '現金' : method === 'PAYPAY' ? 'PayPay' : 'カード決済'
                                            return (
                                                <option key={method} value={method} disabled={!enabled}>
                                                    {label}{!enabled ? '（有効にする場合はコミュニティ設定→支払い方法の設定を行なってください）' : ''}
                                                </option>
                                            )
                                        })}
                                    </select>
                                </div>

                                <p className="text-[10px] text-gray-400 mb-2">
                                    ※ビジター（ゲスト）は、アプリ登録を行っていないビジターです。
                                </p>
                            </>
                        )}

                        {/* アクションボタン */}
                        <div className="flex gap-3 justify-end pt-3 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setShowBulkPaymentMethodDialog(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                キャンセル
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const updates = Array.from(bulkSelectedIds).map((pId) => ({
                                        participationId: pId,
                                        paymentMethod: bulkPaymentMethod,
                                    }))
                                    bulkUpdatePaymentMutation.mutate(updates, {
                                        onSuccess: () => {
                                            setShowBulkPaymentMethodDialog(false)
                                            setBulkSelectedIds(new Set())
                                        },
                                    })
                                }}
                                disabled={bulkSelectedIds.size === 0 || bulkUpdatePaymentMutation.isPending}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 rounded-lg transition-colors"
                            >
                                {bulkUpdatePaymentMutation.isPending ? '処理中...' : `${bulkSelectedIds.size}件に設定`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ビジター追加ダイアログ */}
            <AddVisitorDialog
                open={showAddVisitor}
                onOpenChange={setShowAddVisitor}
                communityId={communityId}
                onSubmit={async (visitorName) => {
                    await addVisitorMutation.mutateAsync({ visitorName })
                    setShowAddVisitor(false)
                }}
                isPending={addVisitorMutation.isPending}
            />
        </div>
    )
}

// ─── ビジター追加ダイアログ ──────────────────────────

function AddVisitorDialog({
    open,
    onOpenChange,
    communityId,
    onSubmit,
    isPending,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    communityId: string
    onSubmit: (visitorName: string) => Promise<void>
    isPending: boolean
}) {
    const [name, setName] = useState('')
    const [showSuggestions, setShowSuggestions] = useState(false)
    const { data: suggestionsData } = useVisitorNameSuggestions(communityId)
    const suggestions = suggestionsData?.names ?? []

    const filteredSuggestions = useMemo(() => {
        if (!name.trim()) return suggestions.slice(0, 8)
        const q = name.trim().toLowerCase()
        return suggestions.filter((s) => s.toLowerCase().includes(q)).slice(0, 8)
    }, [suggestions, name])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return
        setShowSuggestions(false)
        await onSubmit(name.trim())
        setName('')
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>ビジター追加</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="space-y-1.5 relative">
                        <label htmlFor="visitorName" className="text-sm font-medium text-gray-700">
                            ビジター名
                        </label>
                        <Input
                            id="visitorName"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value)
                                setShowSuggestions(true)
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            placeholder="名前を入力（最大50文字）"
                            maxLength={50}
                            autoComplete="off"
                            autoFocus
                        />
                        {showSuggestions && filteredSuggestions.length > 0 && (
                            <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                                {filteredSuggestions.map((suggestion) => (
                                    <li key={suggestion}>
                                        <button
                                            type="button"
                                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 cursor-pointer"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => {
                                                setName(suggestion)
                                                setShowSuggestions(false)
                                            }}
                                        >
                                            {suggestion}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <p className="text-xs text-gray-500">
                        ビジター参加者を追加します。支払い管理はあなたが行います。
                    </p>
                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                        >
                            キャンセル
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim() || isPending}
                            className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                        >
                            {isPending ? '追加中...' : '追加'}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}

// ─── 幹事変更ダイアログ ────────────────────────────────

function ChangeOrganizerDialog({
    activityId,
    communityId,
    open,
    onOpenChange,
}: {
    activityId: string
    communityId: string
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    const { data: membersData } = useMembers(communityId)
    const members = membersData?.members ?? []
    const changeOrganizerMutation = useChangeOrganizer(activityId, communityId)
    const [search, setSearch] = useState('')

    const filtered = useMemo(() => {
        if (!search.trim()) return members.slice(0, 10)
        const q = search.toLowerCase()
        return members.filter((m: Member) =>
            m.userId.toLowerCase().includes(q) ||
            (m.displayName && m.displayName.toLowerCase().includes(q))
        ).slice(0, 10)
    }, [members, search])

    const handleSelect = async (userId: string | null) => {
        await changeOrganizerMutation.mutateAsync({ organizerUserId: userId })
        onOpenChange(false)
        setSearch('')
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>幹事を変更</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="🔍 メンバーを検索"
                        className="text-sm"
                    />
                    <div className="max-h-60 overflow-auto space-y-1">
                        {/* 未定 */}
                        <button
                            type="button"
                            onClick={() => handleSelect(null)}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm text-left rounded"
                        >
                            <div className="w-6 h-6 bg-gray-100 rounded-full shrink-0 flex items-center justify-center text-xs text-gray-400">?</div>
                            <span className="text-gray-500">未定</span>
                        </button>
                        {filtered.map((m: Member) => (
                            <button
                                key={m.userId}
                                type="button"
                                onClick={() => handleSelect(m.userId)}
                                disabled={changeOrganizerMutation.isPending}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm text-left rounded disabled:opacity-50"
                            >
                                <div className="w-6 h-6 bg-gray-200 rounded-full shrink-0" />
                                <span>{m.displayName ?? m.userId}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// Wave6 W6-08: 中止スケジュールの中止取り消しボタン
function RestoreScheduleButton({ scheduleId, activityId, hasPayments }: {
    scheduleId: string
    activityId: string
    hasPayments: boolean
}) {
    const restoreMutation = useRestoreSchedule(activityId)
    const handleClick = () => {
        if (hasPayments) return
        if (!confirm('このスケジュールの中止を取り消しますか？参加者一覧が再表示されます（通知は送信されません）。')) return
        restoreMutation.mutate(scheduleId, {
            onError: (err: unknown) => {
                const message = err instanceof Error ? err.message : '中止取り消しに失敗しました'
                alert(message)
            },
        })
    }
    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={hasPayments || restoreMutation.isPending}
            className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-3 py-1.5 rounded-md shadow-sm border border-blue-700 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
            <Repeat className="w-3.5 h-3.5" />
            {restoreMutation.isPending ? '取り消し中…' : '中止を取り消す'}
        </button>
    )
}
