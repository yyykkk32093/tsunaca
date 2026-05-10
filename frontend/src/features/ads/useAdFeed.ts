import { useMemo } from 'react'
import type { AdFeedMarker } from './types'
import { useAd } from './useAd'

/**
 * フィード内広告挿入 Hook
 *
 * アイテムリストに広告マーカーを挿入した新しいリストを返す。
 * - 表示条件を満たさない場合は元のリストをそのまま返す
 * - feedMinItems 未満の場合は広告を挿入しない
 * - feedInterval 件ごとに広告マーカーを挿入
 */
export function useAdFeed<T>(
    slotId: string,
    items: T[],
): (T | AdFeedMarker)[] {
    const { config, shouldShow } = useAd(slotId)

    return useMemo(() => {
        if (!shouldShow || !config || config.type !== 'feed') {
            return items
        }

        const interval = config.feedInterval ?? 4
        const minItems = config.feedMinItems ?? interval

        if (items.length < minItems) return items

        const result: (T | AdFeedMarker)[] = []
        for (let i = 0; i < items.length; i++) {
            result.push(items[i])
            if ((i + 1) % interval === 0) {
                result.push({ _isAd: true, slotId })
            }
        }

        return result
    }, [items, shouldShow, config, slotId])
}
