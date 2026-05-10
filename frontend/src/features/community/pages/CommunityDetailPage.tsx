import { AdBanner } from '@/features/ads/components/AdBanner'
import { CommunityProfileHeader } from '@/features/community/components/CommunityProfileHeader'
import { ActivitiesTab } from '@/features/community/components/detail/tabs/ActivitiesTab'
import { AlbumTab, AnnouncementTab, ChatTab } from '@/features/community/components/tabs'
import { useCommunity, useMyRole } from '@/features/community/hooks/useCommunityQueries'
import { FloatingActionButton } from '@/shared/components/FloatingActionButton'
import { useSetHeaderTitle } from '@/shared/components/HeaderActionsContext'
import { SectionTabs } from '@/shared/components/SectionTabs'
import { useRedirectOnNotFound } from '@/shared/hooks/useRedirectOnNotFound'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

const VALID_TABS = ['announcements', 'activities', 'chat', 'album'] as const

/**
 * CommunityDetailPage — コミュニティ詳細画面
 *
 * プロフィールヘッダー + 4タブ（お知らせ / アクティビティ / チャット / アルバム）
 * + FAB（タブに応じた作成ボタン）
 * 統計・設定は CommunityProfileHeader 内にボタンとして配置（OWNER/ADMIN のみ）
 */
export function CommunityDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { data: community, isLoading, error: communityError } = useCommunity(id!)
    useRedirectOnNotFound(communityError)
    const { isAdminOrAbove } = useMyRole(id!)
    const [searchParams, setSearchParams] = useSearchParams()
    const tabParam = searchParams.get('tab')
    const activeTab = tabParam && (VALID_TABS as readonly string[]).includes(tabParam) ? tabParam : 'announcements'
    const setActiveTab = (tab: string) => {
        setSearchParams({ tab }, { replace: true })
    }

    // 2-4: ヘッダータイトルをコミュニティ名に動的変更
    useSetHeaderTitle(community?.name)

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            </div>
        )
    }

    if (!community) {
        return <div className="p-6 text-center text-red-500">コミュニティが見つかりません</div>
    }

    const tabs = [
        { value: 'announcements', label: 'お知らせ', content: <AnnouncementTab /> },
        { value: 'activities', label: 'アクティビティ', content: <ActivitiesTab /> },
        { value: 'chat', label: 'チャット', content: <ChatTab /> },
        { value: 'album', label: 'アルバム', content: <AlbumTab /> },
    ]

    // 2-10: FAB — タブ固有の1ボタン即遷移
    const fabAction = getFabAction(activeTab, id!)

    return (
        <div className="pb-4">
            {/* 2-2, 2-3: 統計・設定ボタンは CommunityProfileHeader 内に配置 */}
            <CommunityProfileHeader community={community} />

            {/* [8] コミュニティ詳細 — 招待ボタン等の下 */}
            <AdBanner slotId="community-detail-below" />

            <div className="mt-2 px-4">
                <SectionTabs
                    tabs={tabs}
                    value={activeTab}
                    onValueChange={(v) => setActiveTab(v)}
                />
            </div>

            {/* 2-9, 2-10: FAB — タブ固有アイコンの1ボタン即遷移（OWNER/ADMINのみ） */}
            {fabAction && (
                <FloatingActionButton
                    visible={isAdminOrAbove}
                    actions={[{
                        icon: <img src={fabAction.icon} alt={fabAction.label} className="w-full h-full rounded-full" />,
                        onClick: () => navigate(fabAction.path),
                        label: fabAction.label,
                    }]}
                />
            )}
        </div>
    )
}

/**
 * アクティブタブに応じた FAB 情報を返す（null = 非表示）
 */
function getFabAction(activeTab: string, communityId: string): { label: string; icon: string; path: string } | null {
    switch (activeTab) {
        case 'announcements':
            return { label: 'お知らせ作成', icon: '/icons/announcement-create.png', path: `/communities/${communityId}/announcements/new` }
        case 'activities':
            return { label: 'アクティビティ作成', icon: '/icons/activity-create.png', path: `/communities/${communityId}/activities/new` }
        case 'album':
            return { label: 'アルバム作成', icon: '/icons/album-create.png', path: `/communities/${communityId}/albums/new` }
        default:
            return null // チャットタブ等では FAB 非表示
    }
}
