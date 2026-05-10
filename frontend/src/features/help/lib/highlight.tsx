/**
 * Wave6 Phase 9b-08: 検索ヒット範囲を <mark> でハイライトするユーティリティ
 *
 * Fuse.js の `matches[].indices` は包含的範囲 `[start, end]`（end も含む）。
 */
import type { HelpSearchMatch } from '@/features/help/lib/searchClient'
import type { ReactNode } from 'react'

/** 指定 key の matches を抽出 */
function findMatch(matches: HelpSearchMatch[] | undefined, key: string): HelpSearchMatch | null {
    if (!matches) return null
    return matches.find((m) => m.key === key) ?? null
}

/**
 * `text` のうち、`matches[].indices` に該当する範囲を <mark> でラップした React 配列を返す。
 * 該当 key の match が無ければ素のテキストを返す。
 */
export function highlightText(
    text: string,
    matches: HelpSearchMatch[] | undefined,
    key: string,
): ReactNode {
    const m = findMatch(matches, key)
    if (!m || m.indices.length === 0) return text

    // indices をソート + 重複マージ
    const sorted = [...m.indices].sort((a, b) => a[0] - b[0])
    const merged: Array<[number, number]> = []
    for (const [s, e] of sorted) {
        const last = merged[merged.length - 1]
        if (last && s <= last[1] + 1) {
            last[1] = Math.max(last[1], e)
        } else {
            merged.push([s, e])
        }
    }

    const out: ReactNode[] = []
    let cursor = 0
    merged.forEach(([s, e], i) => {
        if (s > cursor) out.push(text.slice(cursor, s))
        out.push(
            <mark key={`m-${i}`} className="bg-yellow-200 text-gray-900 rounded px-0.5">
                {text.slice(s, e + 1)}
            </mark>,
        )
        cursor = e + 1
    })
    if (cursor < text.length) out.push(text.slice(cursor))
    return out
}
