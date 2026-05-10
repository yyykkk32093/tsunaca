/**
 * Wave6 Phase 9b-05: ロケール解決 / 永続化サービス
 *
 * 優先順位:
 *   1. User.locale (BE 同期 / AuthProvider が初期化時にロード)
 *   2. localStorage 'app.locale'
 *   3. navigator.language（先頭2文字）
 *   4. 'ja'
 */
import type { HelpLocale } from '@/features/help/content/helpLoader'

const STORAGE_KEY = 'app.locale'
const SUPPORTED_LOCALES: HelpLocale[] = ['ja', 'en']

export function isSupportedLocale(value: unknown): value is HelpLocale {
    return typeof value === 'string' && (SUPPORTED_LOCALES as string[]).includes(value)
}

/** localStorage から取得（無効値は除外） */
export function readStoredLocale(): HelpLocale | null {
    try {
        const v = localStorage.getItem(STORAGE_KEY)
        return isSupportedLocale(v) ? v : null
    } catch {
        return null
    }
}

export function writeStoredLocale(locale: HelpLocale | null): void {
    try {
        if (locale === null) localStorage.removeItem(STORAGE_KEY)
        else localStorage.setItem(STORAGE_KEY, locale)
    } catch {
        // no-op (private browsing 等)
    }
}

/** navigator.language から取得 */
export function detectBrowserLocale(): HelpLocale {
    const lang = (typeof navigator !== 'undefined' ? navigator.language : '') ?? ''
    const head = lang.slice(0, 2).toLowerCase()
    return isSupportedLocale(head) ? head : 'ja'
}

/**
 * User.locale > localStorage > navigator.language > 'ja' の順で解決。
 */
export function resolveActiveLocale(userLocale?: string | null): HelpLocale {
    if (isSupportedLocale(userLocale)) return userLocale
    const stored = readStoredLocale()
    if (stored) return stored
    return detectBrowserLocale()
}

export const SUPPORTED = SUPPORTED_LOCALES
