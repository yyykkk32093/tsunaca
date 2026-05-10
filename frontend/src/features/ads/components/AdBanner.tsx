import { useEffect, useRef, useState } from 'react'
import { loadAdSenseScript } from '../adScriptLoader'
import type { AdSlotConfig } from '../types'
import { useAd } from '../useAd'
import { useInView } from '../useInView'
import { AdSkeleton } from './AdSkeleton'

interface Props {
    slotId: string
    className?: string
}

/**
 * 広告バナーコンポーネント
 *
 * - mock: グレーのプレースホルダー（slotId 表示）
 * - test/production: AdSense 広告ユニット
 * - Intersection Observer で画面に入った時のみロード
 * - ロード失敗時は高さ 0 に collapse
 */
export function AdBanner({ slotId, className }: Props) {
    const { config, shouldShow, adMode } = useAd(slotId)
    const { ref: inViewRef, inView } = useInView()
    const adPushed = useRef(false)
    const [adFailed, setAdFailed] = useState(false)

    useEffect(() => {
        if (!shouldShow || !config || !inView || adMode === 'mock' || adPushed.current) return

        let cancelled = false

        loadAdSenseScript()
            .then(() => {
                if (cancelled || adPushed.current) return
                try {
                    ; (window.adsbygoogle = window.adsbygoogle || []).push({})
                    adPushed.current = true
                } catch {
                    if (!cancelled) setAdFailed(true)
                }
            })
            .catch(() => {
                if (!cancelled) setAdFailed(true)
            })

        return () => {
            cancelled = true
        }
    }, [shouldShow, config, inView, adMode])

    if (!shouldShow || !config || adFailed) return null

    const marginStyle = { marginTop: config.marginTop }

    // Mock モード: グレーのプレースホルダー
    if (adMode === 'mock') {
        return (
            <div ref={inViewRef} className={className} style={marginStyle}>
                <MockAdPlaceholder slotId={slotId} config={config} />
            </div>
        )
    }

    // Production / Test モード: AdSense
    return (
        <div ref={inViewRef} className={className} style={marginStyle}>
            {inView ? (
                <ins
                    className="adsbygoogle"
                    style={{ display: 'block' }}
                    data-ad-client={import.meta.env.VITE_ADSENSE_CLIENT_ID}
                    data-ad-slot={config.adUnitId}
                    data-ad-format={config.format === 'responsive' ? 'auto' : undefined}
                    data-full-width-responsive={config.format === 'responsive' ? 'true' : undefined}
                    data-adtest={adMode === 'test' ? 'on' : undefined}
                />
            ) : (
                <AdSkeleton />
            )}
        </div>
    )
}

function MockAdPlaceholder({ slotId, config }: { slotId: string; config: AdSlotConfig }) {
    return (
        <div
            className="flex items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 text-gray-400"
            style={{ minHeight: 100 }}
        >
            <div className="text-center text-xs">
                <div className="font-medium">Ad: {slotId}</div>
                <div className="mt-0.5 text-[10px]">
                    {config.type === 'feed' ? `feed (every ${config.feedInterval})` : 'fixed'}
                </div>
            </div>
        </div>
    )
}
