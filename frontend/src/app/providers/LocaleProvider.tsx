/**
 * Wave6 Phase 9b-05: ロケール Context
 *
 * - 起動時に resolveActiveLocale() で初期解決
 * - setLocale() で localStorage 永続化 + (認証時) BE PATCH /v1/users/me/locale
 * - AuthProvider 連携: 認証ユーザーの locale が null かつ localStorage に値あれば
 *   API で同期し、`null` のままなら resolved locale を BE に送る
 */
import type { HelpLocale } from '@/features/help/content/helpLoader'
import {
    isSupportedLocale,
    readStoredLocale,
    resolveActiveLocale,
    writeStoredLocale,
} from '@/features/help/lib/localeService'
import { http } from '@/shared/lib/apiClient'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

interface LocaleContextValue {
    locale: HelpLocale
    setLocale: (next: HelpLocale, opts?: { syncToBackend?: boolean }) => Promise<void>
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<HelpLocale>(() => resolveActiveLocale())

    const setLocale = useCallback(
        async (next: HelpLocale, opts?: { syncToBackend?: boolean }) => {
            setLocaleState(next)
            writeStoredLocale(next)
            if (opts?.syncToBackend) {
                try {
                    await http<{ locale: HelpLocale | null }>('/v1/users/me/locale', {
                        method: 'PATCH',
                        json: { locale: next },
                    })
                } catch {
                    // BE 同期失敗は致命的ではないので握り潰す（次回ログイン時に再試行可能）
                }
            }
        },
        [],
    )

    // 認証成功後に User.locale を取得して同期
    useEffect(() => {
        let cancelled = false
        async function syncFromUser() {
            try {
                const r = await http<{ locale: string | null }>('/v1/users/me/locale')
                if (cancelled) return
                if (isSupportedLocale(r.locale)) {
                    setLocaleState(r.locale)
                    writeStoredLocale(r.locale)
                } else {
                    // BE 側未設定: 現在の locale を BE に登録（理想案: User.locale に値が入る）
                    const stored = readStoredLocale()
                    const current = stored ?? resolveActiveLocale()
                    await http('/v1/users/me/locale', {
                        method: 'PATCH',
                        json: { locale: current },
                    }).catch(() => undefined)
                }
            } catch {
                // 401 等は未認証 → 何もしない
            }
        }
        syncFromUser()
        return () => {
            cancelled = true
        }
    }, [])

    const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale])
    return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleContextValue {
    const ctx = useContext(LocaleContext)
    if (!ctx) {
        // Provider 未設定時のフォールバック（テスト等）
        return {
            locale: resolveActiveLocale(),
            setLocale: async (next) => {
                writeStoredLocale(next)
            },
        }
    }
    return ctx
}
