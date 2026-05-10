import { useAuth } from '@/app/providers/AuthProvider'
import { ChatView } from '@/features/chat/components/ChatView'
import { useLeaveDmChannel, useMarkChannelRead, useMyChannels } from '@/features/chat/hooks/useChatQueries'
import { useCallback, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

/**
 * ChannelPage — チャット画面（フルスクリーン）
 *
 * URL パラメータから channelId を取得し、チャンネル名を解決して
 * ChatView コアコンポーネントに委譲する薄いラッパー。
 */
export function ChannelPage() {
    const { channelId } = useParams<{ channelId: string }>()
    const { user } = useAuth()
    const currentUserId = user?.userId ?? ''
    const navigate = useNavigate()
    const leaveDm = useLeaveDmChannel()
    const markRead = useMarkChannelRead()

    // W5-25: チャンネル入室時に既読マーク
    useEffect(() => {
        if (channelId) {
            markRead.mutate(channelId)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [channelId])

    // チャンネル名・タイプを useMyChannels キャッシュから解決
    const { data: channelsData } = useMyChannels()

    const { channelName, isDm, navigateTo } = useMemo(() => {
        if (!channelsData || !channelId) return { channelName: 'チャット', isDm: false, navigateTo: undefined }

        const community = channelsData.community.find((c) => c.channelId === channelId)
        if (community) return { channelName: community.name, isDm: false, navigateTo: `/communities/${community.communityId}` }

        const activity = channelsData.activity.find((a) => a.channelId === channelId)
        if (activity) {
            const communityLabel = activity.communityName || activity.subtitle || ''
            const scheduleLabel = activity.scheduleDate && activity.scheduleStartTime && activity.scheduleEndTime
                ? `${activity.scheduleDate} ${activity.scheduleStartTime}〜${activity.scheduleEndTime}`
                : ''
            return {
                channelName: [communityLabel, activity.name, scheduleLabel].filter(Boolean).join('：'),
                isDm: false,
                navigateTo: `/communities/${activity.communityId}/activities/${activity.activityId}`,
            }
        }

        const dm = channelsData.dm.find((d) => d.channelId === channelId)
        if (dm) {
            return {
                channelName: dm.participants.filter((p) => p !== currentUserId).join(', ') || 'DM',
                isDm: true,
                navigateTo: undefined,
            }
        }

        return { channelName: 'チャット', isDm: false, navigateTo: undefined }
    }, [channelsData, channelId, currentUserId])

    const handleTitlePress = useCallback(() => {
        if (navigateTo) navigate(navigateTo)
    }, [navigateTo, navigate])

    const handleLeave = useCallback(() => {
        if (!channelId) return
        leaveDm.mutate(channelId, {
            onSuccess: () => navigate('/chat', { replace: true }),
        })
    }, [channelId, leaveDm, navigate])

    if (!channelId) return null

    return (
        <div className="h-[calc(100vh-6.5rem)]">
            <ChatView
                channelId={channelId}
                showHeader={true}
                headerName={channelName}
                onTitlePress={navigateTo ? handleTitlePress : undefined}
                onLeave={isDm ? handleLeave : undefined}
            />
        </div>
    )
}
