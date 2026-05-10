/// <reference types="vite/client" />

// Google Consent Mode v2 — gtag global
interface Window {
    gtag: (command: string, ...args: unknown[]) => void
    adsbygoogle: Array<Record<string, unknown>>
}

