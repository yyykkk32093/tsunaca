import { NotFoundPage } from '@/app/pages/NotFoundPage'
import { createPlatformPorts } from '@/app/platformDetect'
import { PlatformProvider } from '@/app/providers/PlatformProvider'
import { QueryProvider } from '@/app/providers/QueryProvider'
import { ActivityCreatePage } from '@/features/activity/pages/ActivityCreatePage'
import { ActivityDetailPage } from '@/features/activity/pages/ActivityDetailPage'
import { ActivityEditPage } from '@/features/activity/pages/ActivityEditPage'
import { ActivityTopPage } from '@/features/activity/pages/ActivityTopPage'
import { AlbumCreatePage } from '@/features/album/pages/AlbumCreatePage'
import { AnnouncementCreatePage } from '@/features/announcement/pages/AnnouncementCreatePage'
import { AnnouncementDetailPage } from '@/features/announcement/pages/AnnouncementDetailPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { OAuthCallbackPage } from '@/features/auth/pages/OAuthCallbackPage'
import { SignupPage } from '@/features/auth/pages/SignupPage'
import { PaywallPage } from '@/features/billing/pages/PaywallPage'
import { ChannelPage } from '@/features/chat/pages/ChannelPage'
import { ChatListPage } from '@/features/chat/pages/ChatListPage'
import { AnalyticsPage } from '@/features/community/pages/AnalyticsPage'
import { CommunityCreatePage } from '@/features/community/pages/CommunityCreatePage'
import { CommunityDetailPage } from '@/features/community/pages/CommunityDetailPage'
import { CommunityJoinPage } from '@/features/community/pages/CommunityJoinPage'
import { CommunityListPage } from '@/features/community/pages/CommunityListPage'
import { CommunitySearchDetailPage } from '@/features/community/pages/CommunitySearchDetailPage'
import { CommunitySearchPage } from '@/features/community/pages/CommunitySearchPage'
import CommunitySettingsPage from '@/features/community/pages/CommunitySettingsPage'
import { CreateSubCommunityPage } from '@/features/community/pages/CreateSubCommunityPage'
import InviteAcceptPage from '@/features/community/pages/InviteAcceptPage'
import { MemberListPage } from '@/features/community/pages/MemberListPage'
import { SubCommunityTreePage } from '@/features/community/pages/SubCommunityTreePage'
import { FinancePage } from '@/features/expense/pages/FinancePage'
import { HomePage } from '@/features/home/pages/HomePage'
import { NotificationListPage } from '@/features/notification/pages/NotificationListPage'
import { RefundHistoryPage } from '@/features/participation/pages/RefundHistoryPage'
import { RefundManagementPage } from '@/features/participation/pages/RefundManagementPage'

import { AdminHelpFeedbackPage } from '@/features/admin/pages/AdminHelpFeedbackPage'
import { AdminHomePage } from '@/features/admin/pages/AdminHomePage'
import { AdminInquiriesPage } from '@/features/admin/pages/AdminInquiriesPage'
import { AdminInquiryDetailPage } from '@/features/admin/pages/AdminInquiryDetailPage'
import { HelpArticlePage } from '@/features/help/pages/HelpArticlePage'
import { HelpCategoryPage } from '@/features/help/pages/HelpCategoryPage'
import { HelpTopPage } from '@/features/help/pages/HelpTopPage'
import { AnonymousContactPage } from '@/features/inquiry/pages/AnonymousContactPage'
import { ContactPage } from '@/features/inquiry/pages/ContactPage'
import { MyInquiriesPage } from '@/features/inquiry/pages/MyInquiriesPage'
import { MyInquiryDetailPage } from '@/features/inquiry/pages/MyInquiryDetailPage'
import { MatchingPage } from '@/features/matching/pages/MatchingPage'
import { MyPage } from '@/features/user/pages/MyPage'
import { AdminProtectedRoute } from '@/shared/components/AdminProtectedRoute'
import { AppLayout } from '@/shared/components/AppLayout'
import { ProtectedRoute } from '@/shared/components/ProtectedRoute'
import { Toaster } from '@/shared/components/ui/sonner'
import type { RouteHandle } from '@/shared/types/route'
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom'

const ports = createPlatformPorts()

/**
 * ルート定義
 *
 * handle: { title, showBack } で画面ごとのヘッダー情報を宣言的に管理。
 * AppLayout が useMatches() で取得してヘッダーに反映する。
 */
const router = createBrowserRouter([
    {
        // ルートレイアウト: AuthProvider + AppLayout
        element: <AppLayout />,
        children: [
            // ── 認証不要 ──
            {
                path: '/login',
                element: <LoginPage />,
                handle: { title: '', showBack: false } satisfies RouteHandle,
            },
            {
                path: '/signup',
                element: <SignupPage />,
                handle: { title: '新規登録', showBack: true } satisfies RouteHandle,
            },
            // Wave6 Phase 8-B: 匿名（未ログイン）からの問い合わせ
            {
                path: '/contact/anonymous',
                element: <AnonymousContactPage />,
                handle: { title: 'お問い合わせ', showBack: true } satisfies RouteHandle,
            },
            // Wave6 Phase 7: ヘルプ（公開ルート、画面側で audience 判定）
            {
                path: '/help',
                element: <HelpTopPage />,
                handle: { title: 'ヘルプ', showBack: true } satisfies RouteHandle,
            },
            {
                path: '/help/:categorySlug',
                element: <HelpCategoryPage />,
                handle: { title: 'ヘルプ', showBack: true } satisfies RouteHandle,
            },
            {
                path: '/help/:categorySlug/:articleSlug',
                element: <HelpArticlePage />,
                handle: { title: 'ヘルプ', showBack: true } satisfies RouteHandle,
            },
            {
                path: '/auth/callback/:provider',
                element: <OAuthCallbackPage />,
                handle: { title: '', showBack: false } satisfies RouteHandle,
            },

            // ── 認証必要 ──
            {
                element: <ProtectedRoute />,
                children: [
                    // Home
                    {
                        path: '/home',
                        element: <HomePage />,
                        handle: { title: 'ホーム', showBack: false } satisfies RouteHandle,
                    },

                    // Community
                    {
                        path: '/communities',
                        element: <CommunityListPage />,
                        handle: { title: 'コミュニティ', showBack: false } satisfies RouteHandle,
                    },
                    {
                        path: '/communities/create',
                        element: <CommunityCreatePage />,
                        handle: { title: 'コミュニティ作成', showBack: true } satisfies RouteHandle,
                    },
                    {
                        path: '/communities/search',
                        element: <CommunitySearchPage />,
                        handle: { title: 'コミュニティ検索', showBack: true } satisfies RouteHandle,
                    },
                    {
                        path: '/communities/search/:id',
                        element: <CommunitySearchDetailPage />,
                        handle: { title: 'コミュニティ検索詳細', showBack: true } satisfies RouteHandle,
                    },
                    {
                        path: '/communities/search/:id/join',
                        element: <CommunityJoinPage />,
                        handle: { title: 'コミュニティ参加', showBack: true } satisfies RouteHandle,
                    },
                    {
                        path: '/communities/:id',
                        element: <CommunityDetailPage />,
                        handle: { title: 'コミュニティ詳細', showBack: true } satisfies RouteHandle,
                    },
                    {
                        path: '/communities/:id/analytics',
                        element: <AnalyticsPage />,
                        handle: { title: '統計', showBack: true } satisfies RouteHandle,
                    },

                    // Album
                    {
                        path: '/communities/:communityId/albums/new',
                        element: <AlbumCreatePage />,
                        handle: { title: 'アルバム作成', showBack: true } satisfies RouteHandle,
                    },

                    // Activity（コミュニティ配下）
                    {
                        path: '/communities/:communityId/activities/new',
                        element: <ActivityCreatePage />,
                        handle: { title: 'アクティビティ作成', showBack: true } satisfies RouteHandle,
                    },
                    {
                        path: '/communities/:communityId/activities/:id',
                        element: <ActivityDetailPage />,
                        handle: { title: 'アクティビティ詳細', showBack: true } satisfies RouteHandle,
                    },
                    {
                        path: '/communities/:communityId/activities/:id/edit',
                        element: <ActivityEditPage />,
                        handle: { title: 'アクティビティ更新', showBack: true } satisfies RouteHandle,
                    },
                    {
                        path: '/communities/:communityId/schedules/:scheduleId/matching',
                        element: <MatchingPage />,
                        handle: { title: '組み合わせ', showBack: true } satisfies RouteHandle,
                    },

                    // Activity（トップレベル — クロスコミュニティビュー）
                    {
                        path: '/activities',
                        element: <ActivityTopPage />,
                        handle: { title: 'アクティビティ', showBack: false } satisfies RouteHandle,
                    },

                    // Announcement
                    {
                        path: '/communities/:communityId/announcements/new',
                        element: <AnnouncementCreatePage />,
                        handle: { title: '投稿作成', showBack: true } satisfies RouteHandle,
                    },
                    {
                        path: '/announcements/:id',
                        element: <AnnouncementDetailPage />,
                        handle: { title: 'お知らせ詳細', showBack: true } satisfies RouteHandle,
                    },

                    // Members (UBL-33)
                    {
                        path: '/communities/:id/members',
                        element: <MemberListPage />,
                        handle: { title: 'メンバー一覧', showBack: true } satisfies RouteHandle,
                    },

                    // Community Settings (UBL-10)
                    {
                        path: '/communities/:id/settings',
                        element: <CommunitySettingsPage />,
                        handle: { title: 'コミュニティ設定', showBack: true } satisfies RouteHandle,
                    },

                    // サブコミュニティ
                    {
                        path: '/communities/:id/sub/new',
                        element: <CreateSubCommunityPage />,
                        handle: { title: 'サブコミュニティ作成', showBack: true } satisfies RouteHandle,
                    },
                    {
                        path: '/communities/:id/sub/tree',
                        element: <SubCommunityTreePage />,
                        handle: { title: 'コミュニティツリー', showBack: true } satisfies RouteHandle,
                    },

                    // 返金管理（管理者向け）
                    {
                        path: '/communities/:id/refunds',
                        element: <RefundManagementPage />,
                        handle: { title: '返金管理', showBack: true } satisfies RouteHandle,
                    },
                    {
                        path: '/communities/:id/refunds/history',
                        element: <RefundHistoryPage />,
                        handle: { title: '返金履歴', showBack: true } satisfies RouteHandle,
                    },

                    // 収支確認（管理者向け）
                    {
                        path: '/communities/:id/finance',
                        element: <FinancePage />,
                        handle: { title: '収支確認', showBack: true } satisfies RouteHandle,
                    },

                    // MyPage (UBL-32)
                    {
                        path: '/mypage',
                        element: <MyPage />,
                        handle: { title: 'マイページ', showBack: true } satisfies RouteHandle,
                    },

                    // Wave6 Phase 8-B: 問い合わせ（認証ユーザー側）
                    {
                        path: '/contact',
                        element: <ContactPage />,
                        handle: { title: 'お問い合わせ', showBack: true } satisfies RouteHandle,
                    },
                    {
                        path: '/mypage/inquiries',
                        element: <MyInquiriesPage />,
                        handle: { title: '問い合わせ履歴', showBack: true } satisfies RouteHandle,
                    },
                    {
                        path: '/mypage/inquiries/:id',
                        element: <MyInquiryDetailPage />,
                        handle: { title: '問い合わせ詳細', showBack: true } satisfies RouteHandle,
                    },

                    // Invite Accept (UBL-11)
                    {
                        path: '/invites/:token/accept',
                        element: <InviteAcceptPage />,
                        handle: { title: '招待', showBack: true } satisfies RouteHandle,
                    },

                    // Chat
                    {
                        path: '/chats',
                        element: <ChatListPage />,
                        handle: { title: 'チャット', showBack: false } satisfies RouteHandle,
                    },
                    {
                        path: '/chats/:channelId',
                        element: <ChannelPage />,
                        handle: { title: 'チャット', showBack: true } satisfies RouteHandle,
                    },
                    {
                        path: '/channels/:channelId',
                        element: <ChannelPage />,
                        handle: { title: 'チャット', showBack: true } satisfies RouteHandle,
                    },

                    // DM → チャット一覧にリダイレクト（DM導線はチャット一覧に統合）
                    {
                        path: '/dm',
                        element: <Navigate to="/chats" replace />,
                    },

                    // Notification
                    {
                        path: '/notifications',
                        element: <NotificationListPage />,
                        handle: { title: '通知', showBack: true } satisfies RouteHandle,
                    },

                    // Paywall
                    {
                        path: '/paywall',
                        element: <PaywallPage />,
                        handle: { title: 'プラン', showBack: true } satisfies RouteHandle,
                    },
                ],
            },

            // ── 運営管理画面（Wave6 Phase 8-A: SystemAdmin ロール基盤） ──
            {
                element: <AdminProtectedRoute />,
                children: [
                    {
                        path: '/admin',
                        element: <AdminHomePage />,
                        handle: { title: '運営管理', showBack: true } satisfies RouteHandle,
                    },
                    // Wave6 Phase 8-C: 運営側 問い合わせ管理
                    {
                        path: '/admin/inquiries',
                        element: <AdminInquiriesPage />,
                        handle: { title: '問い合わせ管理', showBack: true } satisfies RouteHandle,
                    },
                    {
                        path: '/admin/inquiries/:id',
                        element: <AdminInquiryDetailPage />,
                        handle: { title: '問い合わせ詳細', showBack: true } satisfies RouteHandle,
                    },
                    // Wave6 Phase 9b-04: ヘルプフィードバック集計
                    {
                        path: '/admin/help-feedback',
                        element: <AdminHelpFeedbackPage />,
                        handle: { title: 'ヘルプフィードバック集計', showBack: true } satisfies RouteHandle,
                    },
                ],
            },

            // ── リダイレクト ──
            {
                path: '/',
                element: <Navigate to="/home" replace />,
            },
            {
                path: '*',
                element: <NotFoundPage />,
            },
        ],
    },
])

export default function App() {
    return (
        <PlatformProvider ports={ports}>
            <QueryProvider>
                <RouterProvider router={router} />
                <Toaster />
            </QueryProvider>
        </PlatformProvider>
    )
}
