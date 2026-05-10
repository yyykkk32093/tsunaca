import { AuthProvider, useAuth } from '@/app/providers/AuthProvider'
import { LocaleProvider } from '@/app/providers/LocaleProvider'
import { SocketProvider } from '@/app/providers/SocketProvider'
import { CookieConsent } from '@/features/ads/components/CookieConsent'
import { useUnreadNotificationCount } from '@/features/notification/hooks/useNotificationQueries'
import { useSocketNotification } from '@/features/notification/hooks/useSocketNotification'
import { BottomNav } from '@/shared/components/BottomNav'
import { HamburgerMenu } from '@/shared/components/HamburgerMenu'
import {
    HeaderActionsProvider,
    useHeaderActions,
    useHeaderTitle,
} from '@/shared/components/HeaderActionsContext'
import type { RouteHandle } from '@/shared/types/route'
import { Bell, ChevronLeft } from 'lucide-react'
import { Link, Outlet, useMatches, useNavigate } from 'react-router-dom'

/**
 * AppLayout — ルートレイアウトコンポーネント
 *
 * createBrowserRouter のルート定義で最上位の element として配置。
 * - AuthProvider でラップ（useNavigate が必要なため Router 内側に配置）
 * - useMatches() → handle.title / handle.showBack でヘッダーを動的制御
 * - BottomNav を最下部に固定表示
 *
 * Wave6 Phase 9 共通基盤再設計（2026-04-27）:
 * - ヘッダー右側を「通知ベル + ハンバーガー」に簡素化
 * - アバター直接タップ → マイページ遷移は廃止（メニュー内プロフィールヘッダーに集約）
 * - ログアウトボタンも廃止し、ハンバーガーメニュー内に集約
 * - 未認証時は最小ヘッダー（タイトル/戻るボタンのみ）を表示
 */
export function AppLayout() {
    return (
        <AuthProvider>
            <LocaleProvider>
                <SocketProvider>
                    <HeaderActionsProvider>
                        <AppLayoutInner />
                    </HeaderActionsProvider>
                </SocketProvider>
            </LocaleProvider>
        </AuthProvider>
    )
}

function AppLayoutInner() {
    const { isAuthenticated } = useAuth()
    const navigate = useNavigate()
    const matches = useMatches()
    const headerActions = useHeaderActions()
    const headerTitle = useHeaderTitle()

    // WebSocket 通知リスナー（グローバルで 1 回だけ起動）
    useSocketNotification()

    // 未読通知数（ヘッダーバッジ用）— 認証済みのときだけ有効化される hook 側で制御
    const { data: unreadData } = useUnreadNotificationCount()

    // 最も深いマッチのhandleを取得
    const currentHandle = [...matches]
        .reverse()
        .find((m) => (m.handle as RouteHandle | undefined)?.title !== undefined)
        ?.handle as RouteHandle | undefined

    // headerTitle（動的上書き）が設定されていればそちらを優先
    const title = headerTitle ?? currentHandle?.title ?? ''
    const showBack = currentHandle?.showBack ?? false

    return (
        <div className="min-h-screen pb-16 pt-12">
            {/* ── ヘッダー ── */}
            <header className="fixed top-0 inset-x-0 h-12 bg-white border-b border-gray-200 z-50 flex items-center justify-between px-4">
                {/* 左: 戻るボタン or タイトル */}
                <div className="flex items-center gap-1 min-w-0">
                    {showBack ? (
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-0.5 text-blue-600 hover:text-blue-700 transition-colors -ml-1"
                            aria-label="戻る"
                        >
                            <ChevronLeft className="w-5 h-5" />
                            <span className="text-sm">戻る</span>
                        </button>
                    ) : (
                        <span className="text-base font-bold text-gray-800 truncate">
                            {title || 'Tsunaca'}
                        </span>
                    )}
                </div>

                {/* 中央: タイトル（戻るボタン表示時） */}
                {showBack && title && (
                    <span className="absolute left-1/2 -translate-x-1/2 text-base font-semibold text-gray-800 truncate max-w-[50%]">
                        {title}
                    </span>
                )}

                {/* 右: ページ固有アクション + 通知ベル + ハンバーガー（認証時のみ） */}
                <div className="flex items-center gap-3">
                    {headerActions}
                    {isAuthenticated && (
                        <>
                            <Link
                                to="/notifications"
                                className="relative text-gray-500 hover:text-blue-600 transition-colors"
                                aria-label="通知"
                            >
                                <Bell className="w-5 h-5" />
                                {(unreadData?.unreadCount ?? 0) > 0 && (
                                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                                        {unreadData!.unreadCount > 99 ? '99+' : unreadData!.unreadCount}
                                    </span>
                                )}
                            </Link>
                            <HamburgerMenu />
                        </>
                    )}
                </div>
            </header>

            <Outlet />
            {isAuthenticated && <BottomNav />}
            <CookieConsent />
        </div>
    )
}
