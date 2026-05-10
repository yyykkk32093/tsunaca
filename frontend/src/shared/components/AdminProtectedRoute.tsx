import { useAuth } from '@/app/providers/AuthProvider'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

/**
 * Wave6 Phase 8-A: プラットフォーム運営権限を要求するレイアウトルート。
 *
 * テナント内権限（CommunityMembership.role）とは別概念。
 *
 * 認可方針:
 * - 未認証 → /login へリダイレクト（ログイン後に戻れるよう state.from を保持）
 * - 認証済みだが運営権限なし → 404（管理画面の存在自体を秘匿）
 * - OPERATOR / SUPER_ADMIN は通過
 *
 * 注意: フロントの判定はあくまで UX 上のもの。実際の認可は API 側 requireSystemAdmin が担保する。
 */
import { NotFoundPage } from '@/app/pages/NotFoundPage'

export function AdminProtectedRoute() {
    const { user, isAuthenticated, isLoading } = useAuth()
    const location = useLocation()

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        )
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    const role = user?.systemRole
    if (role !== 'OPERATOR' && role !== 'SUPER_ADMIN') {
        return <NotFoundPage />
    }

    return <Outlet />
}
