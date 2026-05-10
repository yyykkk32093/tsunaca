import { ScheduleCard } from '@/features/activity/components/ScheduleCard'
import { useUserSchedules } from '@/features/activity/hooks/useActivityQueries'
import { AdBanner } from '@/features/ads/components/AdBanner'
import { AdFeedItem } from '@/features/ads/components/AdFeedItem'
import { useAd } from '@/features/ads/useAd'
import { participationApi } from '@/features/participation/api/participationApi'
import { SectionTabs } from '@/shared/components/SectionTabs'
import { Calendar } from '@/shared/components/ui/calendar'
import { Input } from '@/shared/components/ui/input'
import type { UserScheduleItem } from '@/shared/types/api'
import { formatDay, formatWeekday, groupByMonthAndDate } from '@/shared/utils/dateGroup'
import { useQueryClient } from '@tanstack/react-query'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import { Search } from 'lucide-react'
import { Fragment, useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'

/**
 * ActivityTopPage — BottomNav「アクティビティ」タブのランディング
 *
 * 2つのサブタブ:
 * - Calendar: 月間カレンダー + 日付タップで下部にスケジュール一覧
 * - TimeLine: 検索バー + 時系列スケジュールリスト
 */
export function ActivityTopPage() {
    return (
        <div className="flex flex-col h-full">
            <SectionTabs
                tabs={[
                    { value: 'timeline', label: 'タイムライン', content: <TimeLineTab /> },
                    { value: 'calendar', label: 'カレンダー', content: <CalendarTab /> },
                ]}
                defaultValue="timeline"
            />
        </div>
    )
}

// ─── Calendar Tab ────────────────────────────────────────

function CalendarTab() {
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
    const queryClient = useQueryClient()

    const from = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
    const to = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
    const { data, isLoading } = useUserSchedules(from, to)

    const handleRemove = useCallback(async (scheduleId: string) => {
        if (!confirm('この参加を取り消しますか？')) return
        try {
            await participationApi.cancelAttendance(scheduleId)
            queryClient.invalidateQueries({ queryKey: ['schedules', 'list', 'user'] })
            toast.success('参加を取り消しました')
        } catch (e) {
            const msg = e instanceof Error ? e.message : '参加取り消しに失敗しました'
            toast.error(msg)
        }
    }, [queryClient])

    const schedules = data?.schedules ?? []

    // スケジュールがある日のセット（ドット表示用）
    const scheduleDates = useMemo(() => {
        const set = new Set<string>()
        schedules.forEach((s) => set.add(s.date))
        return set
    }, [schedules])

    // 選択日のスケジュール
    const selectedSchedules = useMemo(() => {
        if (!selectedDate) return []
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        return schedules.filter((s) => s.date === dateStr)
    }, [schedules, selectedDate])

    // modifiers: スケジュールがある日
    const hasSchedule = (date: Date) => scheduleDates.has(format(date, 'yyyy-MM-dd'))

    return (
        <div className="px-4 py-3">
            <div className="flex justify-center">
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
                />
            </div>

            {/* 選択日のスケジュール一覧 */}
            <div className="mt-4">
                {isLoading ? (
                    <div className="py-8 text-center text-gray-400 text-sm">読み込み中...</div>
                ) : selectedDate ? (
                    selectedSchedules.length > 0 ? (
                        <div className="divide-y divide-gray-100">
                            {selectedSchedules.map((s) => (
                                <ScheduleCard key={s.scheduleId} schedule={s} timeOnly onRemove={handleRemove} />
                            ))}
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

            {/* [11] カレンダー — 選択日スケジュール直下 */}
            <AdBanner slotId="activity-calendar-feed" />
        </div>
    )
}

// ─── TimeLine Tab ────────────────────────────────────────

function TimeLineTab() {
    const [search, setSearch] = useState('')
    const [showPast, setShowPast] = useState(false)
    const queryClient = useQueryClient()

    // 未来90日分
    const futureFrom = format(new Date(), 'yyyy-MM-dd')
    const futureToDate = new Date()
    futureToDate.setDate(futureToDate.getDate() + 90)
    const futureTo = format(futureToDate, 'yyyy-MM-dd')

    // 過去90日分
    const pastToDate = new Date()
    pastToDate.setDate(pastToDate.getDate() - 1)
    const pastTo = format(pastToDate, 'yyyy-MM-dd')
    const pastFromDate = new Date()
    pastFromDate.setDate(pastFromDate.getDate() - 90)
    const pastFrom = format(pastFromDate, 'yyyy-MM-dd')

    const { data: futureData, isLoading: futureLoading } = useUserSchedules(futureFrom, futureTo)
    const { data: pastData, isLoading: pastLoading } = useUserSchedules(
        showPast ? pastFrom : futureFrom,
        showPast ? pastTo : futureFrom,
    )

    const isLoading = futureLoading || (showPast && pastLoading)

    const schedules = useMemo(() => {
        const future = futureData?.schedules ?? []
        const past = showPast ? (pastData?.schedules ?? []) : []
        // 過去は新しい順 (reverse)、合わせて「過去 (desc) → 今日 → 未来 (asc)」
        const combined = [...past.slice().reverse(), ...future]
        if (!search.trim()) return combined
        const q = search.toLowerCase()
        return combined.filter(
            (s: UserScheduleItem) =>
                s.activityTitle.toLowerCase().includes(q) ||
                s.communityName.toLowerCase().includes(q) ||
                (s.location?.toLowerCase().includes(q) ?? false)
        )
    }, [futureData, pastData, showPast, search])

    const handleRemove = useCallback(async (scheduleId: string) => {
        if (!confirm('この参加を取り消しますか？')) return
        try {
            await participationApi.cancelAttendance(scheduleId)
            queryClient.invalidateQueries({ queryKey: ['schedules', 'list', 'user'] })
            toast.success('参加を取り消しました')
        } catch (e) {
            const msg = e instanceof Error ? e.message : '参加取り消しに失敗しました'
            toast.error(msg)
        }
    }, [queryClient])

    // [9] フィード広告の表示判定
    const timelineFeedAd = useAd('activity-timeline-feed')
    const feedInterval = timelineFeedAd.config?.feedInterval ?? 4
    const showFeedAd = timelineFeedAd.shouldShow && schedules.length >= (timelineFeedAd.config?.feedMinItems ?? feedInterval)

    return (
        <div className="flex flex-col">
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

            {/* [10] タイムライン — 検索フィルタ直下 */}
            <AdBanner slotId="activity-timeline-past-below" />

            {isLoading ? (
                <div className="py-8 text-center text-gray-400 text-sm">読み込み中...</div>
            ) : schedules.length > 0 ? (
                <div>
                    {/* [9] タイムラインフィード広告（日付グループ間に挿入） */}
                    {(() => {
                        let itemCount = 0
                        return groupByMonthAndDate(schedules, (s) => s.date).map((mg) => {
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
                                                        {dg.items.map((s: UserScheduleItem) => (
                                                            <ScheduleCard
                                                                key={s.scheduleId}
                                                                schedule={s}
                                                                timeOnly
                                                                onRemove={handleRemove}
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
                    スケジュールがありません
                </p>
            )}
        </div>
    )
}
