import { activityApi } from '@/features/activity/api/activityApi'
import type { DndAction } from '@/features/activity/components/dnd/ScheduleDndConfirmDialog'
import { scheduleApi } from '@/features/schedule/api/scheduleApi'
import type { UserScheduleItem } from '@/shared/types/api'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

interface UseScheduleDndParams {
    communityId: string
}

/**
 * useScheduleDnd — D&D によるスケジュールのコピー/移動を実行するフック
 *
 * コピー: アクティビティごとクローン（Activity + Schedule を新規作成）
 * 移動: 既存スケジュールの日付を PATCH 更新
 */
export function useScheduleDnd({ communityId }: UseScheduleDndParams) {
    const qc = useQueryClient()
    const [isLoading, setIsLoading] = useState(false)

    const invalidate = () => {
        qc.invalidateQueries({ queryKey: ['community-schedules', communityId] })
        qc.invalidateQueries({ queryKey: ['schedules', 'list'] })
        qc.invalidateQueries({ queryKey: ['schedules', 'list', 'user'] })
        qc.invalidateQueries({ queryKey: ['activities', 'list', communityId] })
    }

    /**
     * 1件 or 複数件のスケジュールをコピー/移動する
     */
    const execute = async (
        action: DndAction,
        schedules: UserScheduleItem[],
        toDate: string,
    ) => {
        if (action === 'cancel' || schedules.length === 0) return

        setIsLoading(true)
        try {
            for (const schedule of schedules) {
                if (action === 'copy') {
                    // アクティビティ詳細を取得してクローン
                    const activity = await activityApi.findById(schedule.activityId)
                    const detail = await scheduleApi.findById(schedule.scheduleId)

                    // アクティビティ + スケジュールを同時作成（date を渡すと自動でスケジュールも生成）
                    await activityApi.create(schedule.communityId, {
                        title: activity.title,
                        description: activity.description,
                        defaultLocationCustom: detail.location,
                        defaultPlaceId: activity.defaultPlaceId,
                        defaultStartTime: detail.startTime,
                        defaultEndTime: detail.endTime,
                        organizerUserId: activity.organizerUserId,
                        date: toDate,
                        participationFee: detail.participationFee,
                        visitorFee: detail.visitorFee,
                        isOnline: detail.isOnline,
                        meetingUrl: detail.meetingUrl,
                        capacity: detail.capacity,
                    })
                } else if (action === 'move') {
                    await scheduleApi.update(schedule.scheduleId, { date: toDate })
                }
            }

            invalidate()
            const label = action === 'copy' ? 'コピー' : '移動'
            toast.success(
                schedules.length === 1
                    ? `スケジュールを${label}しました`
                    : `${schedules.length}件のスケジュールを${label}しました`,
            )
        } catch {
            toast.error('操作に失敗しました')
        } finally {
            setIsLoading(false)
        }
    }

    return { execute, isLoading }
}
