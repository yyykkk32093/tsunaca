import { ActivityForm, type ActivityFormValues } from '@/features/activity/components/ActivityForm'
import { useCreateActivity } from '@/features/activity/hooks/useActivityQueries'
import { extractErrorMessage } from '@/shared/lib/apiClient'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

/**
 * ActivityCreatePage — アクティビティ作成画面
 *
 * コミュニティ詳細のアクティビティタブから遷移:
 *   /communities/:communityId/activities/new
 *
 * アクティビティ作成時、日付が指定されていれば初回スケジュールもバックエンド側で同一トランザクション内に自動作成される。
 */
export function ActivityCreatePage() {
    const { communityId } = useParams<{ communityId: string }>()
    const navigate = useNavigate()
    const createMutation = useCreateActivity(communityId!)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (values: ActivityFormValues) => {
        setError(null)
        try {
            const result = await createMutation.mutateAsync({
                title: values.title,
                description: values.description || undefined,
                defaultPlaceId: values.defaultPlaceId || null,
                defaultLocationCustom: values.defaultLocationCustom || null,
                defaultStartTime: values.defaultStartTime || undefined,
                defaultEndTime: values.defaultEndTime || undefined,
                recurrenceRule: values.recurrenceRule,
                organizerUserId: values.organizerUserId || null,
                date: values.date || undefined,
                participationFee: values.participationFee,
                visitorFee: values.visitorFee,
                isOnline: values.isOnline,
                meetingUrl: values.meetingUrl,
                capacity: values.capacity,
                shouldPostAnnouncement: values.shouldPostAnnouncement,
                allowVisitorWaitlist: values.allowVisitorWaitlist,
                visibility: values.visibility === 'public' ? 'PUBLIC' : 'PRIVATE',
                recurrenceGenerationMonths: values.recurrenceGenerationMonths,
            })

            const scheduleParam = result.scheduleId ? `?schedule=${result.scheduleId}` : ''
            navigate(`/communities/${communityId}/activities/${result.activityId}${scheduleParam}`, { replace: true })
        } catch (e) {
            setError(extractErrorMessage(e, 'アクティビティの作成に失敗しました'))
        }
    }

    if (!communityId) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <p className="text-sm">コミュニティが指定されていません</p>
            </div>
        )
    }

    return (
        <ActivityForm
            communityId={communityId}
            submitLabel="作成"
            onSubmit={handleSubmit}
            isPending={createMutation.isPending}
            error={error}
        />
    )
}
