import { normalizePlaceQuery } from '@/_sharedTech/text/placeNormalize.js'
import type { Prisma, PrismaClient, Place as PrismaPlace } from '@prisma/client'
import { Place } from '../../domain/model/entity/Place.js'
import { GeoCoordinate } from '../../domain/model/valueObject/GeoCoordinate.js'
import { PlaceAddress } from '../../domain/model/valueObject/PlaceAddress.js'
import { PlaceId } from '../../domain/model/valueObject/PlaceId.js'
import { PlaceName } from '../../domain/model/valueObject/PlaceName.js'
import type { IPlaceRepository, PlaceSearchResult } from '../../domain/repository/IPlaceRepository.js'
import { PlaceMemoryCache } from '../cache/PlaceMemoryCache.js'

type PrismaClientLike = PrismaClient | Prisma.TransactionClient

/**
 * 検索仕様（W6-07 後続改修）:
 * - 第一選択: PlaceMemoryCache（全件オンメモリ + char-bigram Jaccard）
 * - フォールバック: 下記 SQL（cache 未準備時のみ）
 *
 * フォールバック SQL のスコア式（pg_trgm は日本語マルチバイトに効かないため LIKE のみで構成）:
 *   prefix(0.5) + contains(0.2) + log10(1+usage)*0.1 + (1/len)*0.05
 */
const SEARCH_SQL_FALLBACK = `
SELECT "id", "name", "address", "lat", "lng", "normalizedName", "normalizedAddress",
       "category", "source", "sourceId", "usageCount", "isActive",
       (
           CASE WHEN "normalizedName" LIKE $1 THEN 0.5 ELSE 0 END
         + CASE WHEN "normalizedName" LIKE $2 THEN 0.2 ELSE 0 END
         + (LOG(10, 1 + "usageCount"::numeric)) * 0.1
         + (1.0 / GREATEST(1, LENGTH("normalizedName"))) * 0.05
       ) AS "score"
FROM "Place"
WHERE "isActive" = TRUE
  AND ("normalizedName" LIKE $1 OR "normalizedName" LIKE $2)
ORDER BY "score" DESC
LIMIT $3
`

type SearchRow = PrismaPlace & { score: number }

export class PlaceRepositoryImpl implements IPlaceRepository {
    constructor(private readonly prisma: PrismaClientLike) { }

    async findById(id: string): Promise<Place | null> {
        const row = await this.prisma.place.findUnique({ where: { id } })
        return row ? this.toDomain(row) : null
    }

    async search(params: { query: string; limit: number }): Promise<PlaceSearchResult[]> {
        const cache = PlaceMemoryCache.get()
        if (cache.isReady()) {
            return cache.search(params.query, params.limit)
        }
        return this.searchByDB(params)
    }

    private async searchByDB(params: { query: string; limit: number }): Promise<PlaceSearchResult[]> {
        const normalized = normalizePlaceQuery(params.query)
        if (normalized.length === 0) return []

        const prefixPattern = `${normalized}%`
        const containsPattern = `%${normalized}%`
        const rows = await (this.prisma as PrismaClient).$queryRawUnsafe<SearchRow[]>(
            SEARCH_SQL_FALLBACK,
            prefixPattern,
            containsPattern,
            params.limit,
        )

        return rows.map((row) => ({
            place: this.toDomain(row),
            score: Number(row.score),
        }))
    }

    async incrementUsageCount(id: string): Promise<void> {
        await this.prisma.place.update({
            where: { id },
            data: { usageCount: { increment: 1 } },
        })
        // メモリキャッシュ側のカウンタも同期更新
        PlaceMemoryCache.get().incrementUsage(id)
    }

    private toDomain(row: PrismaPlace): Place {
        return Place.reconstruct({
            id: PlaceId.reconstruct(row.id),
            name: PlaceName.reconstruct(row.name),
            address: PlaceAddress.reconstruct(row.address),
            coordinate: GeoCoordinate.reconstruct(row.lat, row.lng),
            normalizedName: row.normalizedName,
            normalizedAddress: row.normalizedAddress,
            category: row.category,
            source: row.source,
            sourceId: row.sourceId,
            usageCount: row.usageCount,
            isActive: row.isActive,
        })
    }
}
