import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'tsunaca_cookie_consent'

type ConsentStatus = 'pending' | 'granted' | 'denied'

let listeners: Array<() => void> = []
let cachedStatus: ConsentStatus | null = null

function getStatus(): ConsentStatus {
    if (cachedStatus) return cachedStatus
    const stored = localStorage.getItem(STORAGE_KEY)
    cachedStatus = (stored === 'granted' || stored === 'denied') ? stored : 'pending'
    return cachedStatus
}

function notify() {
    for (const listener of listeners) {
        listener()
    }
}

/**
 * Cookie 同意状態を更新する
 */
export function setConsentStatus(status: 'granted' | 'denied'): void {
    localStorage.setItem(STORAGE_KEY, status)
    cachedStatus = status
    notify()

    // Google Consent Mode v2 を更新
    if (typeof window.gtag === 'function') {
        if (status === 'granted') {
            window.gtag('consent', 'update', {
                ad_storage: 'granted',
                ad_user_data: 'granted',
                ad_personalization: 'granted',
                analytics_storage: 'granted',
            })
        } else {
            window.gtag('consent', 'update', {
                ad_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied',
                analytics_storage: 'denied',
            })
        }
    }
}

/**
 * Cookie 同意状態を React の外部ストアとして購読する Hook
 */
export function useConsentStatus(): ConsentStatus {
    return useSyncExternalStore(
        (listener) => {
            listeners.push(listener)
            return () => {
                listeners = listeners.filter((l) => l !== listener)
            }
        },
        getStatus,
        () => 'pending' as const,
    )
}
