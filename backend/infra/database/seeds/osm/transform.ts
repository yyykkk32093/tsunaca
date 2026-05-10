/**
 * extracted.jsonl (GeoJSON Feature) を Place 投入用に整形
 *
 * 入力: ./data/extracted.jsonl
 * 出力: ./data/places.jsonl  (Prisma Place upsert 用の正規化済みレコード)
 *
 * 各行の形式:
 * {
 *   sourceId: 'osm:node:123',
 *   name: '...',
 *   address: '...',
 *   lat: 35.0,
 *   lng: 135.0,
 *   normalizedName: '...',
 *   normalizedAddress: '...',
 *   category: '...'
 * }
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import { detectCategory, shouldExclude, SOURCE } from './config.js'
import { normalizeAddress, normalizeName } from './normalize.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const IN_JSONL = path.join(DATA_DIR, 'extracted.jsonl')
const OUT_JSONL = path.join(DATA_DIR, 'places.jsonl')

type Feature = {
    type: 'Feature'
    geometry: { type: string; coordinates: unknown }
    properties: Record<string, string | number | undefined>
    id?: string | number
}

/**
 * GeoJSON geometry の代表点（centroid 簡易版）を取得
 * - Point: そのまま
 * - Polygon / MultiPolygon: 外周リングの全頂点平均
 * - LineString: 全頂点平均
 *
 * 注意: ここを way/area で揃えておかないと dedup の格子判定がズレる。
 */
function representativePoint(geom: Feature['geometry']): { lat: number; lng: number } | null {
    if (!geom || !geom.coordinates) return null
    if (geom.type === 'Point') {
        const [lng, lat] = geom.coordinates as [number, number]
        return { lat, lng }
    }
    const averageRing = (ring: number[][]): { lat: number; lng: number } | null => {
        if (!ring?.length) return null
        let sumLat = 0
        let sumLng = 0
        for (const [lng, lat] of ring) {
            sumLat += lat
            sumLng += lng
        }
        return { lat: sumLat / ring.length, lng: sumLng / ring.length }
    }
    if (geom.type === 'Polygon') {
        const ring = (geom.coordinates as number[][][])[0]
        return averageRing(ring)
    }
    if (geom.type === 'LineString') {
        return averageRing(geom.coordinates as number[][])
    }
    if (geom.type === 'MultiPolygon') {
        const polys = geom.coordinates as number[][][][]
        const outerRing = polys[0]?.[0]
        return averageRing(outerRing)
    }
    return null
}

/**
 * OSM Feature プロパティから住所文字列を組み立て
 * - 日本のOSMタグでは addr:province / addr:city / addr:district / addr:quarter / addr:neighbourhood / addr:block_number / addr:housenumber などが使われる
 */
function buildAddress(props: Feature['properties']): string | null {
    const parts = [
        props['addr:province'],
        props['addr:city'],
        props['addr:district'],
        props['addr:quarter'],
        props['addr:neighbourhood'],
        props['addr:block_number'],
        props['addr:housenumber'],
    ]
        .filter((p): p is string => typeof p === 'string' && p.length > 0)
    if (parts.length === 0) {
        // fallback
        const full = props['addr:full']
        if (typeof full === 'string' && full.length > 0) return full
        return null
    }
    return parts.join('')
}

function buildSourceId(feature: Feature): string | null {
    // osmium export の id はOSMの種別+IDを含む文字列（例: 'n123', 'w456', 'r789', 'a123'）
    // ※ area (a) は multipolygon/closed-way から自動生成され、対応する way と重複出力される
    const id = feature.id
    if (typeof id !== 'string' && typeof id !== 'number') return null
    const s = String(id)
    if (s.startsWith('n')) return `${SOURCE}:node:${s.slice(1)}`
    if (s.startsWith('w')) return `${SOURCE}:way:${s.slice(1)}`
    if (s.startsWith('r')) return `${SOURCE}:relation:${s.slice(1)}`
    if (s.startsWith('a')) return `${SOURCE}:area:${s.slice(1)}`
    return `${SOURCE}:unknown:${s}`
}

/**
 * 同一施設の優先順位（数値が小さいほど優先）
 * way/relation > node > area の順で先勝ち
 *
 * 理由:
 * - osmium export は同じ施設を area と way で重複出力する
 * - way/relation は最初から OSM に登録された主データ
 * - area は multipolygon/closed-way から派生生成された二次データ
 */
function sourceTypePriority(sourceId: string): number {
    if (sourceId.startsWith(`${SOURCE}:way:`)) return 1
    if (sourceId.startsWith(`${SOURCE}:relation:`)) return 1
    if (sourceId.startsWith(`${SOURCE}:node:`)) return 2
    if (sourceId.startsWith(`${SOURCE}:area:`)) return 3
    return 9
}

async function main(): Promise<void> {
    if (!fs.existsSync(IN_JSONL)) {
        throw new Error(`Input not found: ${IN_JSONL}. Run "pnpm osm:extract" first.`)
    }

    const out = fs.createWriteStream(OUT_JSONL, { encoding: 'utf-8' })
    const rl = readline.createInterface({
        input: fs.createReadStream(IN_JSONL, { encoding: 'utf-8' }),
        crlfDelay: Infinity,
    })

    let total = 0
    let kept = 0
    let excluded = 0

    // 重複排除: name+address でユニーク化、way > node > area の優先順で先勝ち
    type Record = {
        sourceId: string
        name: string
        address: string
        lat: number
        lng: number
        normalizedName: string
        normalizedAddress: string
        category: string
    }
    const dedupMap = new Map<string, Record>()

    for await (const line of rl) {
        if (!line.trim()) continue
        total++
        let feature: Feature
        try {
            feature = JSON.parse(line) as Feature
        } catch {
            continue
        }

        const props = feature.properties ?? {}
        const tags = Object.fromEntries(
            Object.entries(props).filter(([, v]) => typeof v === 'string'),
        ) as Record<string, string>

        const name = (props['name:ja'] ?? props['name']) as string | undefined ?? null
        const address = buildAddress(props)
        if (shouldExclude({ name, address })) {
            excluded++
            continue
        }

        const point = representativePoint(feature.geometry)
        if (!point) {
            excluded++
            continue
        }

        const sourceId = buildSourceId(feature)
        if (!sourceId) {
            excluded++
            continue
        }

        // 住所は欠落OK（緯度経度ベースで Google Maps リンクするため）
        const addressStr = address ?? ''
        const record: Record = {
            sourceId,
            name: name!.slice(0, 200),
            address: addressStr.slice(0, 500),
            lat: point.lat,
            lng: point.lng,
            normalizedName: normalizeName(name!).slice(0, 200),
            normalizedAddress: addressStr ? normalizeAddress(addressStr).slice(0, 500) : '',
            category: detectCategory(tags),
        }

        // 重複排除キー: 正規化済 name + category + lat/lng（小数2桁≒約1km格子）
        // - 住所が空のレコードでも同一地点判定可能
        // - way と area で代表点が数十m〜数百mずれても同じ格子に落ちるよう精度を粗く取る
        // - 別市区町村の同名施設（例: 別の "中央公園"）は別格子になるため残る
        const dedupKey = `${record.normalizedName}|${record.category}|${record.lat.toFixed(2)},${record.lng.toFixed(2)}`
        const existing = dedupMap.get(dedupKey)
        if (!existing) {
            dedupMap.set(dedupKey, record)
        } else if (sourceTypePriority(record.sourceId) < sourceTypePriority(existing.sourceId)) {
            dedupMap.set(dedupKey, record)
        }
    }

    // 出力
    let dedupedOut = 0
    for (const record of dedupMap.values()) {
        out.write(JSON.stringify(record) + '\n')
        dedupedOut++
    }
    kept = dedupedOut

    out.end()
    console.log(`[transform] total=${total} kept=${kept} excluded=${excluded} (deduped from ${total - excluded - 0} → ${kept})`)
    console.log(`[transform] wrote → ${OUT_JSONL}`)
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
