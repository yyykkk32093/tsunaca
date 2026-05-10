import { http, isHttpError } from '@/shared/lib/apiClient'
import { queryClient } from '@/shared/lib/queryClient'
import { authKeys } from '@/shared/lib/queryKeys'
import type { AuthMeResponse } from '@/shared/types/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface AuthUser {
    userId: string
    plan: 'FREE' | 'LITE' | 'PRO' | 'LIFETIME'
    displayName: string | null
    email: string
    avatarUrl: string | null
    /** Wave6 Phase 8-A: プラットフォーム（運営側）権限 */
    systemRole: 'USER' | 'OPERATOR' | 'SUPER_ADMIN'
    features: Record<string, boolean>
    limits: Record<string, number>
}

interface AuthContextValue {
    user: AuthUser | null
    isAuthenticated: boolean
    isLoading: boolean
    setUser: (user: AuthUser | null) => void
    logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * 認証状態を取得するフック
 */
export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext)
    if (!ctx) {
        throw new Error('useAuth must be used within AuthProvider')
    }
    return ctx
}

interface AuthProviderProps {
    children: ReactNode
}

/**
 * 認証状態管理 Provider（TanStack Query ベース）
 *
 * - useQuery(["auth","me"]) でサーバーに認証確認（ページリロード時に自動フェッチ）
 * - logout は useMutation でサーバーの Cookie をクリア
 * - setUser は queryClient.setQueryData のラッパー（ログイン成功時に即反映）
 * - 500系エラー時は console.warn でログ出力し、未認証扱い（通信障害の可能性）
 */
export function AuthProvider({ children }: AuthProviderProps) {
    const navigate = useNavigate()
    const qc = useQueryClient()

    // ── 認証状態の取得（自動フェッチ） ──
    const { data: user, isPending: isLoading } = useQuery<AuthUser | null>({
        queryKey: authKeys.me(),
        queryFn: async () => {
            try {
                const res = await http<AuthMeResponse>('/v1/auth/me')
                return {
                    userId: res.userId,
                    plan: res.plan,
                    displayName: res.displayName,
                    email: res.email,
                    avatarUrl: res.avatarUrl,
                    systemRole: res.systemRole,
                    features: res.features,
                    limits: res.limits,
                }
            } catch (err) {
                if (isHttpError(err) && err.status === 401) {
                    // 未認証 — 正常系（ログインしていない状態）
                    return null
                }
                // 500 系やネットワーク障害 — ログを残して未認証扱い
                console.warn(
                    '[AuthProvider] 認証確認に失敗しました（通信障害の可能性があります）:',
                    err,
                )
                return null
            }
        },
        retry: false,
        staleTime: 5 * 60_000, // 認証状態は 5 分間 stale にしない
    })

    // ── ログアウト ──
    const logoutMutation = useMutation({
        mutationFn: () => http<void>('/v1/auth/logout', { method: 'POST' }),
        onSettled: () => {
            // サーバーエラーでもローカル状態はクリア（全キャッシュ削除で他ユーザのデータ残留を防止）
            qc.removeQueries()
            navigate('/login', { replace: true })
        },
    })

    // ── setUser（ログイン/OAuth 成功時に即反映するラッパー） ──
    const setUser = useCallback(
        (u: AuthUser | null) => {
            qc.setQueryData(authKeys.me(), u)
        },
        [qc],
    )

    return (
        <AuthContext.Provider
            value={{
                user: user ?? null,
                isAuthenticated: user != null,
                isLoading,
                setUser,
                logout: () => logoutMutation.mutate(),
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

/**
 * AuthProvider 外から queryClient を使って認証キャッシュを直接操作するためのヘルパー。
 * useMutation の onSuccess 内など、React コンポーネント外で使う場合に利用。
 */
export function setAuthUser(user: AuthUser | null): void {
    queryClient.setQueryData(authKeys.me(), user)
}
