import { isHttpError } from '@/shared/lib/apiClient'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Wave6 W6-04: APIから 404 が返された時に専用の「見つかりません」画面へ
 * リダイレクトするための共通フック。
 *
 * - 認証されていない/権限がない/非公開リソースは BE で 404 として返却される（存在秘匿）
 * - 詳細画面はこのフックを呼び出すだけで一貫した挙動になる
 */
export function useRedirectOnNotFound(error: unknown): void {
    const navigate = useNavigate()
    useEffect(() => {
        if (!error) return
        if (isHttpError(error) && error.status === 404) {
            navigate('/not-found', { replace: true })
        }
    }, [error, navigate])
}
