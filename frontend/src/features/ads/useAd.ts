import { useAuth } from '@/app/providers/AuthProvider'
import { AD_SLOTS } from './adConfig'
import type { AdMode, AdSlotConfig } from './types'

/**
 * 広告スロットの表示可否を判定する Hook
 *
 * 判定ロジック:
 * 1. スロットが enabled かつ存在する
 * 2. ユーザーが FREE プラン
 * 3. LIFF 環境でない
 *
 * Cookie 同意状態は Consent Mode v2 経由で AdSense が自動制御するため、
 * この Hook では広告の「表示/非表示」のみ判定する。
 */
export function useAd(slotId: string): {
    config: AdSlotConfig | null
    shouldShow: boolean
    adMode: AdMode
} {
    const { user } = useAuth()
    const config = AD_SLOTS[slotId] ?? null
    const adMode = (import.meta.env.VITE_AD_MODE ?? 'mock') as AdMode

    // LIFF 環境判定（LINE WebView 内では AdSense ポリシー上広告を表示できない）
    const isLiff = typeof window !== 'undefined' && '__LIFF_INTERNAL__' in window

    // FREE プランのみ広告表示
    const isFreeUser = user?.plan === 'FREE'

    const shouldShow = !!(config?.enabled && isFreeUser && !isLiff)

    return { config, shouldShow, adMode }
}
