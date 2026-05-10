/**
 * PlaceMemoryCache — 全件オンメモリ Place 検索キャッシュ
 *
 * 設計（projects/01_design/01_backend/place-search-and-cache.md）:
 * - 起動時に Place 全件 (isActive=true) をロード
 * - LIKE prefix/contains + char-bigram Jaccard 類似度 で日本語にも効く検索
 * - usageCount は Activity 保存時にメモリ側もインクリメント
 * - DB は永続化として残し、cache 未準備時は Repository 側でフォールバック
 *
 * 容量: 約34,970件 × 約500B = 約17MB（許容範囲）
 *
 * 注: 現状は単一プロセス前提。複数プロセス化時は Pub/Sub によるリロード機構が必要。
 */

import { normalizePlaceQuery } from '@/_sharedTech/text/placeNormalize.js'
import type { PrismaClient } from '@prisma/client'
import { Place } from '../../domain/model/entity/Place.js'
import { GeoCoordinate } from '../../domain/model/valueObject/GeoCoordinate.js'
import { PlaceAddress } from '../../domain/model/valueObject/PlaceAddress.js'
import { PlaceId } from '../../domain/model/valueObject/PlaceId.js'
import { PlaceName } from '../../domain/model/valueObject/PlaceName.js'
import type { PlaceSearchResult } from '../../domain/repository/IPlaceRepository.js'

type CacheRecord = {
    id: string
    name: string
    address: string
    lat: number
    lng: number
    normalizedName: string
    normalizedAddress: string
    category: string | null
    source: string
    sourceId: string
    usageCount: number
    /** 事前計算済み bigram 集合（検索時の高速化） */
    bigrams: Set<string>
    /** 事前計算済み name の長さ（タイブレーク用） */
    nameLength: number
}

/** 文字列 -> 連続2文字の集合 */
function toBigrams(s: string): Set<string> {
    const set = new Set<string>()
    if (s.length < 2) {
        if (s.length === 1) set.add(s)
        return set
    }
    for (let i = 0; i < s.length - 1; i++) {
        set.add(s.substring(i, i + 2))
    }
    return set
}

/** Jaccard 類似度: |A ∩ B| / |A ∪ B| */
function bigramJaccard(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 || b.size === 0) return 0
    let intersection = 0
    const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a]
    for (const v of smaller) {
        if (larger.has(v)) intersection++
    }
    const union = a.size + b.size - intersection
    return union === 0 ? 0 : intersection / union
}

export class PlaceMemoryCache {
    private static instance: PlaceMemoryCache | null = null

    /** id -> CacheRecord（usageCount 同期用） */
    private byId = new Map<string, CacheRecord>()
    /** 検索対象の配列（順序固定） */
    private records: CacheRecord[] = []
    private ready = false

    private constructor() { }

    static get(): PlaceMemoryCache {
        if (!PlaceMemoryCache.instance) {
            PlaceMemoryCache.instance = new PlaceMemoryCache()
        }
        return PlaceMemoryCache.instance
    }

    /** テスト用 */
    static resetForTest(): void {
        PlaceMemoryCache.instance = null
    }

    isReady(): boolean {
        return this.ready
    }

    size(): number {
        return this.records.length
    }

    /** 起動時 1 回だけ呼ぶ。失敗しても例外は投げず、ready=false のまま継続。 */
    async initialize(prisma: PrismaClient): Promise<void> {
        try {
            const start = Date.now()
            const rows = await prisma.place.findMany({
                where: { isActive: true },
                select: {
                    id: true,
                    name: true,
                    address: true,
                    lat: true,
                    lng: true,
                    normalizedName: true,
                    normalizedAddress: true,
                    category: true,
                    source: true,
                    sourceId: true,
                    usageCount: true,
                },
            })

            const records: CacheRecord[] = rows.map((r) => ({
                id: r.id,
                name: r.name,
                address: r.address,
                lat: r.lat,
                lng: r.lng,
                normalizedName: r.normalizedName,
                normalizedAddress: r.normalizedAddress,
                category: r.category,
                source: r.source,
                sourceId: r.sourceId,
                usageCount: r.usageCount,
                bigrams: toBigrams(r.normalizedName),
                nameLength: r.normalizedName.length,
            }))

            // アトミックスワップ
            this.records = records
            this.byId = new Map(records.map((r) => [r.id, r]))
            this.ready = true

            const elapsed = Date.now() - start
            console.log(`[PlaceMemoryCache] loaded ${records.length} records in ${elapsed}ms`)
        } catch (err) {
            console.warn('[PlaceMemoryCache] initialize failed (will fallback to DB):', err)
            this.ready = false
        }
    }

    /** 月次最新化ジョブ後等で再ロード */
    async reload(prisma: PrismaClient): Promise<void> {
        await this.initialize(prisma)
    }

    /**
     * メモリ検索
     *
     * スコア式:
     *   prefix一致(0.5) + contains一致(0.2) + bigramJaccard*0.4
     *   + log10(1+usage)*0.1 + (1/max(1,len))*0.05
     */
    search(query: string, limit: number): PlaceSearchResult[] {
        if (!this.ready) return []
        const q = normalizePlaceQuery(query)
        if (q.length === 0) return []
        const qBigrams = toBigrams(q)

        type Scored = { record: CacheRecord; score: number }
        const candidates: Scored[] = []

        for (const r of this.records) {
            const isPrefix = r.normalizedName.startsWith(q)
            const isContains = !isPrefix && r.normalizedName.includes(q)
            let sim = 0
            if (!isPrefix && !isContains) {
                sim = bigramJaccard(qBigrams, r.bigrams)
                if (sim < 0.2) continue
            } else {
                // 一致系も sim を加味してランク差をつける
                sim = bigramJaccard(qBigrams, r.bigrams)
            }

            const score =
                (isPrefix ? 0.5 : 0)
                + (isContains ? 0.2 : 0)
                + sim * 0.4
                + Math.log10(1 + r.usageCount) * 0.1
                + (1 / Math.max(1, r.nameLength)) * 0.05

            candidates.push({ record: r, score })
        }

        candidates.sort((a, b) => b.score - a.score)
        const top = candidates.slice(0, limit)

        return top.map(({ record, score }) => ({
            place: this.toDomain(record),
            score,
        }))
    }

    /** Activity 保存時等に呼ばれる */
    incrementUsage(id: string): void {
        const r = this.byId.get(id)
        if (r) r.usageCount += 1
    }

    private toDomain(r: CacheRecord): Place {
        return Place.reconstruct({
            id: PlaceId.reconstruct(r.id),
            name: PlaceName.reconstruct(r.name),
            address: PlaceAddress.reconstruct(r.address),
            coordinate: GeoCoordinate.reconstruct(r.lat, r.lng),
            normalizedName: r.normalizedName,
            normalizedAddress: r.normalizedAddress,
            category: r.category,
            source: r.source,
            sourceId: r.sourceId,
            usageCount: r.usageCount,
            isActive: true,
        })
    }
}
