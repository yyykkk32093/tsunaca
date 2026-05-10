import type { AdMode } from './types'

const SCRIPT_ID = 'adsense-script'

let loadPromise: Promise<void> | null = null

/**
 * AdSense スクリプトを動的にロードする
 *
 * - Cookie 同意後 + FREE ユーザー時のみ呼び出す
 * - mock モード時は何もしない
 * - 二重ロード防止（同一 Promise を返す）
 */
export function loadAdSenseScript(): Promise<void> {
    const mode = (import.meta.env.VITE_AD_MODE ?? 'mock') as AdMode

    if (mode === 'mock') {
        return Promise.resolve()
    }

    if (loadPromise) return loadPromise

    const clientId = import.meta.env.VITE_ADSENSE_CLIENT_ID as string | undefined
    if (!clientId) {
        console.warn('[ads] VITE_ADSENSE_CLIENT_ID is not set. Skipping AdSense script load.')
        return Promise.resolve()
    }

    // 既にページに存在する場合（index.html で静的に入れていた場合など）
    if (document.getElementById(SCRIPT_ID)) {
        return Promise.resolve()
    }

    loadPromise = new Promise<void>((resolve, reject) => {
        const script = document.createElement('script')
        script.id = SCRIPT_ID
        script.async = true
        script.crossOrigin = 'anonymous'
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`
        script.onload = () => resolve()
        script.onerror = () => {
            loadPromise = null
            reject(new Error('[ads] Failed to load AdSense script'))
        }
        document.head.appendChild(script)
    })

    return loadPromise
}

/**
 * AdSense スクリプトがロード済みかどうか
 */
export function isAdSenseLoaded(): boolean {
    return document.getElementById(SCRIPT_ID) !== null
}
