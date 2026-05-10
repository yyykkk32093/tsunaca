import { ScheduleCard } from '@/features/activity/components/ScheduleCard'
import { CalendarSchedulesContext } from '@/features/activity/components/dnd/CalendarDndContext'
import { DateCellDragOverlay } from '@/features/activity/components/dnd/DateCellDragOverlay'
import { DraggableScheduleCard } from '@/features/activity/components/dnd/DraggableScheduleCard'
import { DroppableCalendarDay } from '@/features/activity/components/dnd/DroppableCalendarDay'
import { ScheduleDndConfirmDialog, type DndAction } from '@/features/activity/components/dnd/ScheduleDndConfirmDialog'
import { ScheduleSelectDialog } from '@/features/activity/components/dnd/ScheduleSelectDialog'
import { useActivities } from '@/features/activity/hooks/useActivityQueries'
import { useScheduleDnd } from '@/features/activity/hooks/useScheduleDnd'
import { AdBanner } from '@/features/ads/components/AdBanner'
import { AdFeedItem } from '@/features/ads/components/AdFeedItem'
import { useAd } from '@/features/ads/useAd'
import { useMyRole } from '@/features/community/hooks/useCommunityQueries'
import { useMembers } from '@/features/community/hooks/useMemberQueries'
import { Calendar } from '@/shared/components/ui/calendar'
import { Input } from '@/shared/components/ui/input'
import { http } from '@/shared/lib/apiClient'
import type { ListSchedulesResponse, UserScheduleItem } from '@/shared/types/api'
import { formatDay, formatWeekday, groupByMonthAndDate } from '@/shared/utils/dateGroup'
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { useQuery } from '@tanstack/react-query'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import { Search } from 'lucide-react'
import { Fragment, useCallback, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

/**
 * ActivitiesTab — コミュニティ詳細のアクティビティタブ
 *
 * サブタブ: カレンダー / タイムライン
 * - カレンダー: 月間ビュー + ドット表示 + 日付タップで一覧
 * - タイムライン: 検索バー + アクティビティ/スケジュールリスト + 作成FAB
 */
export function ActivitiesTab() {
    const { id: communityId } = useParams<{ id: string }>()
    const [subTab, setSubTab] = useState<'timeline' | 'calendar'>('timeline')

    return (
        <div className="py-2">
            {/* Sub-tab switcher */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setSubTab('timeline')}
                    className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${subTab === 'timeline'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    タイムライン
                </button>
                <button
                    onClick={() => setSubTab('calendar')}
                    className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${subTab === 'calendar'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    カレンダー
                </button>
            </div>

            {subTab === 'timeline' ? (
                <TimelineSubTab communityId={communityId!} />
            ) : (
                <CalendarSubTab communityId={communityId!} />
            )}
        </div>
    )
}

// ─── コミュニティ単位のスケジュール横断取得 Hook ──────────

function useCommunitySchedules(communityId: string, from: string, to: string) {
    const { data: activitiesData } = useActivities(communityId)
    const { data: membersData } = useMembers(communityId)
    const activities = activitiesData?.activities ?? []
    const members = membersData?.members ?? []
    const activityIds = activities.map((a) => a.id)

    return useQuery({
        queryKey: ['community-schedules', communityId, from, to, activityIds],
        queryFn: async (): Promise<UserScheduleItem[]> => {
            if (activities.length === 0) return []

            const results = await Promise.all(
                activities.map(async (activity) => {
                    const res = await http<ListSchedulesResponse>(
                        `/v1/activities/${activity.id}/schedules`
                    )
                    // 幹事名をメンバー一覧から解決
                    const organizer = activity.organizerUserId
                        ? members.find((m) => m.userId === activity.organizerUserId)
                        : undefined
                    const organizerName = organizer?.displayName ?? null

                    return res.schedules
                        .filter((s) => s.date >= from && s.date <= to)
                        .map((s) => ({
                            scheduleId: s.id,
                            date: s.date,
                            startTime: s.startTime,
                            endTime: s.endTime,
                            location: s.location,
                            status: s.status,
                            participationFee: s.participationFee,
                            visitorFee: s.visitorFee ?? null,
                            isOnline: s.isOnline,
                            meetingUrl: s.meetingUrl,
                            activityId: activity.id,
                            activityTitle: activity.title,
                            communityId: activity.communityId,
                            communityName: '',
                            organizerName,
                            participantCount: s.participantCount,
                            capacity: s.capacity,
                        }))
                })
            )

            return results
                .flat()
                .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
        },
        enabled: activities.length > 0,
    })
}

// ─── Timeline Sub-Tab ────────────────────────────────────

function TimelineSubTab({ communityId }: { communityId: string }) {
    const [search, setSearch] = useState('')
    const [showPast, setShowPast] = useState(false)

    // 全期間（十分広い範囲）のスケジュールを取得
    const from = '2000-01-01'
    const to = '2099-12-31'
    const { data: allSchedules = [], isLoading } = useCommunitySchedules(communityId, from, to)

    // 検索・過去フィルタ
    const scheduleItems = useMemo(() => {
        const today = new Date().toISOString().split('T')[0]
        return allSchedules.filter((s) => {
            if (!showPast && s.date < today) return false
            if (search.trim()) {
                const q = search.toLowerCase()
                if (
                    !s.activityTitle.toLowerCase().includes(q) &&
                    !(s.location?.toLowerCase().includes(q) ?? false)
                ) return false
            }
            return true
        })
    }, [allSchedules, search, showPast])

    // 月→日の二段グルーピング
    const monthGroups = useMemo(
        () => groupByMonthAndDate(scheduleItems, (s) => s.date),
        [scheduleItems],
    )

    // フィード広告の表示判定
    const timelineFeedAd = useAd('activity-timeline-feed')
    const feedInterval = timelineFeedAd.config?.feedInterval ?? 4
    const showFeedAd = timelineFeedAd.shouldShow && scheduleItems.length >= (timelineFeedAd.config?.feedMinItems ?? feedInterval)

    return (
        <div className="relative">
            <div className="px-4 py-3 space-y-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search"
                        className="pl-9"
                    />
                </div>
                <label className="flex items-center gap-2 text-xs text-gray-500">
                    <input
                        type="checkbox"
                        checked={showPast}
                        onChange={(e) => setShowPast(e.target.checked)}
                        className="rounded border-gray-300"
                    />
                    過去のスケジュールも表示
                </label>
            </div>

            {/* タイムライン — 検索フィルタ直下 */}
            <AdBanner slotId="activity-timeline-past-below" />

            {isLoading ? (
                <div className="py-8 text-center text-gray-400 text-sm">読み込み中...</div>
            ) : monthGroups.length > 0 ? (
                <div>
                    {/* タイムラインフィード広告（日付グループ間に挿入） */}
                    {(() => {
                        let itemCount = 0
                        return monthGroups.map((mg) => {
                            const [y, m] = mg.month.split('-')
                            return (
                                <div key={mg.month}>
                                    <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500">
                                        {y}年{Number(m)}月
                                    </div>
                                    {mg.dateGroups.map((dg) => {
                                        const prev = itemCount
                                        itemCount += dg.items.length
                                        const insertAd = showFeedAd && Math.floor(itemCount / feedInterval) > Math.floor(prev / feedInterval)
                                        return (
                                            <Fragment key={dg.date}>
                                                <div className="flex border-b border-gray-100">
                                                    {/* 左列: 日付 + 曜日 */}
                                                    <div className="w-14 shrink-0 flex flex-col items-center justify-start pt-3 text-gray-500">
                                                        <span className="text-lg font-semibold leading-none">{formatDay(dg.date)}</span>
                                                        <span className="text-[10px] mt-0.5">{formatWeekday(dg.date)}</span>
                                                    </div>
                                                    {/* 右列: その日のカード群 */}
                                                    <div className="flex-1 min-w-0 divide-y divide-gray-50">
                                                        {dg.items.map((s) => (
                                                            <ScheduleCard
                                                                key={`${s.activityId}-${s.date}-${s.startTime}`}
                                                                schedule={s}
                                                                timeOnly
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                                {insertAd && <AdFeedItem slotId="activity-timeline-feed" />}
                                            </Fragment>
                                        )
                                    })}
                                </div>
                            )
                        })
                    })()}
                </div>
            ) : (
                <p className="py-12 text-center text-gray-400 text-sm">
                    {search.trim() ? '一致するスケジュールがありません' : 'スケジュールがありません'}
                </p>
            )}
        </div>
    )
}

// ─── Calendar Sub-Tab ────────────────────────────────────

function CalendarSubTab({ communityId }: { communityId: string }) {
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
    const { isAdminOrAbove } = useMyRole(communityId)

    // ─── D&D 状態 ───
    /** ドラッグ中のオーバーレイに表示する日付（セル/カード共通） */
    const [activeDragDate, setActiveDragDate] = useState<string | null>(null)
    const [dndDialog, setDndDialog] = useState<{
        schedules: UserScheduleItem[]
        toDate: string
    } | null>(null)
    const [scheduleSelectDialog, setScheduleSelectDialog] = useState<{
        schedules: UserScheduleItem[]
        fromDate: string
        toDate: string
    } | null>(null)

    const { execute: executeDnd, isLoading: isDndLoading } = useScheduleDnd({ communityId })

    // ドラッグ開始に必要な距離を設定（誤操作防止）
    const pointerSensor = useSensor(PointerSensor, {
        activationConstraint: { distance: 8 },
    })
    const touchSensor = useSensor(TouchSensor, {
        activationConstraint: { delay: 200, tolerance: 5 },
    })
    const sensors = useSensors(pointerSensor, touchSensor)

    const from = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
    const to = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
    const { data: schedules = [], isLoading } = useCommunitySchedules(communityId, from, to)

    const scheduleDates = useMemo(() => {
        const set = new Set<string>()
        schedules.forEach((s) => set.add(s.date))
        return set
    }, [schedules])

    /** 日付→スケジュール配列のMap（DroppableCalendarDay に Context で渡す） */
    const schedulesMap = useMemo(() => {
        const map = new Map<string, UserScheduleItem[]>()
        schedules.forEach((s) => {
            const list = map.get(s.date) ?? []
            list.push(s)
            map.set(s.date, list)
        })
        return map
    }, [schedules])

    const selectedSchedules = useMemo(() => {
        if (!selectedDate) return []
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        return schedules.filter((s) => s.date === dateStr)
    }, [schedules, selectedDate])

    const hasSchedule = (date: Date) => scheduleDates.has(format(date, 'yyyy-MM-dd'))

    // ─── D&D ハンドラ ───
    const handleDragStart = useCallback((event: DragStartEvent) => {
        const data = event.active.data.current
        if (data?.type === 'date-cell') {
            // セル経路
            setActiveDragDate(data.date as string)
        } else if (data?.schedule) {
            // カード経路 — スケジュールの日付をオーバーレイに使う
            setActiveDragDate((data.schedule as UserScheduleItem).date)
        }
    }, [])

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        setActiveDragDate(null)
        const { active, over } = event
        if (!over) return

        const toDate = over.data.current?.date as string | undefined
        if (!toDate) return

        const data = active.data.current

        if (data?.type === 'date-cell') {
            // ─── セル経路 ───
            const fromDate = data.date as string
            const cellSchedules = data.schedules as UserScheduleItem[]
            if (fromDate === toDate || cellSchedules.length === 0) return

            if (cellSchedules.length === 1) {
                setDndDialog({ schedules: [cellSchedules[0]], toDate })
            } else {
                setScheduleSelectDialog({ schedules: cellSchedules, fromDate, toDate })
            }
        } else if (data?.schedule) {
            // ─── カード経路（1件固定） ───
            const schedule = data.schedule as UserScheduleItem
            if (schedule.date === toDate) return
            setDndDialog({ schedules: [schedule], toDate })
        }
    }, [])

    const handleDndAction = useCallback(async (action: DndAction) => {
        if (!dndDialog) return
        if (action !== 'cancel') {
            await executeDnd(action, dndDialog.schedules, dndDialog.toDate)
        }
        setDndDialog(null)
    }, [dndDialog, executeDnd])

    /** スケジュール選択ダイアログから複数件を確定 → コピー/移動ダイアログへ遷移 */
    const handleScheduleConfirm = useCallback((selected: UserScheduleItem[]) => {
        if (!scheduleSelectDialog) return
        setDndDialog({ schedules: selected, toDate: scheduleSelectDialog.toDate })
        setScheduleSelectDialog(null)
    }, [scheduleSelectDialog])

    // ─── レンダリング ───
    const calendarContent = (
        <div className="px-4 py-3">
            <div className="flex justify-center">
                <CalendarSchedulesContext.Provider value={schedulesMap}>
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        month={currentMonth}
                        onMonthChange={setCurrentMonth}
                        modifiers={{ hasSchedule }}
                        modifiersClassNames={{
                            hasSchedule: 'relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-blue-600 after:rounded-full',
                        }}
                        className="rounded-md border"
                        {...(isAdminOrAbove && {
                            components: { Day: DroppableCalendarDay },
                        })}
                    />
                </CalendarSchedulesContext.Provider>
            </div>

            {/* カレンダーUI直下 */}
            <AdBanner slotId="activity-calendar-below" />

            <div className="mt-4">
                {isLoading ? (
                    <div className="py-8 text-center text-gray-400 text-sm">読み込み中...</div>
                ) : selectedDate ? (
                    selectedSchedules.length > 0 ? (
                        <div className="divide-y divide-gray-100">
                            {selectedSchedules.map((s) =>
                                isAdminOrAbove ? (
                                    <DraggableScheduleCard key={s.scheduleId} schedule={s} timeOnly />
                                ) : (
                                    <ScheduleCard key={s.scheduleId} schedule={s} timeOnly />
                                )
                            )}
                        </div>
                    ) : (
                        <p className="py-8 text-center text-gray-400 text-sm">
                            この日のスケジュールはありません
                        </p>
                    )
                ) : (
                    <p className="py-8 text-center text-gray-400 text-sm">
                        日付をタップしてスケジュールを表示
                    </p>
                )}
            </div>

            {dndDialog && (
                <ScheduleDndConfirmDialog
                    open
                    schedules={dndDialog.schedules}
                    toDate={dndDialog.toDate}
                    isLoading={isDndLoading}
                    onAction={handleDndAction}
                />
            )}

            {scheduleSelectDialog && (
                <ScheduleSelectDialog
                    open
                    schedules={scheduleSelectDialog.schedules}
                    fromDate={scheduleSelectDialog.fromDate}
                    toDate={scheduleSelectDialog.toDate}
                    onConfirm={handleScheduleConfirm}
                    onCancel={() => setScheduleSelectDialog(null)}
                />
            )}
        </div>
    )

    // 管理者以上のみ DndContext でラップ
    if (!isAdminOrAbove) return calendarContent

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            {calendarContent}
            <DragOverlay dropAnimation={null}>
                {activeDragDate && (
                    <DateCellDragOverlay date={activeDragDate} />
                )}
            </DragOverlay>
        </DndContext>
    )
}
