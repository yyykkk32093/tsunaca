import { useCommunityMasters } from '@/features/community/hooks/useCommunityQueries'
import { useMemo } from 'react'

/**
 * ParticipationLevelMaster (DB) からレベル論理名を取得するフック。
 * sortOrder をキー（=Lv番号）にした Record を返す。
 * 取得前は空オブジェクトを返すので、参照側は ?? `Lv${n}` 等のフォールバックを推奨。
 */
export function useParticipationLevelLabels(): Record<number, string> {
    const { data } = useCommunityMasters()
    return useMemo(() => {
        const map: Record<number, string> = {}
        for (const lv of data?.participationLevels ?? []) {
            map[lv.sortOrder] = lv.name
        }
        return map
    }, [data])
}

/** Lv表記とマスタ論理名を結合: 例 「中級 (Lv4)」 */
export function formatLevelWith(labels: Record<number, string>, level: number): string {
    const label = labels[level] ?? `Lv${level}`
    return `${label} (Lv${level})`
}
