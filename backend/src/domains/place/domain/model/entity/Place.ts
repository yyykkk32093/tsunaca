import { AggregateRoot } from '@/domains/_sharedDomains/model/entity/AggregateRoot.js'
import { GeoCoordinate } from '../valueObject/GeoCoordinate.js'
import { PlaceAddress } from '../valueObject/PlaceAddress.js'
import { PlaceId } from '../valueObject/PlaceId.js'
import { PlaceName } from '../valueObject/PlaceName.js'

/**
 * Place — 開催場所マスタ（OSM由来）
 *
 * - source / sourceId が外部マスタ上の安定IDを保持
 * - normalizedName / normalizedAddress は検索用正規化済み文字列
 * - usageCount は Activity 保存時にインクリメント（人気順検索のスコア要素）
 * - isActive=false で論理削除（OSMスナップショットから消えた場合等）
 */
export class Place extends AggregateRoot {
    private constructor(
        private readonly id: PlaceId,
        private name: PlaceName,
        private address: PlaceAddress,
        private coordinate: GeoCoordinate,
        private normalizedName: string,
        private normalizedAddress: string,
        private category: string | null,
        private readonly source: string,
        private readonly sourceId: string,
        private usageCount: number,
        private active: boolean,
    ) {
        super()
    }

    static reconstruct(params: {
        id: PlaceId
        name: PlaceName
        address: PlaceAddress
        coordinate: GeoCoordinate
        normalizedName: string
        normalizedAddress: string
        category: string | null
        source: string
        sourceId: string
        usageCount: number
        isActive: boolean
    }): Place {
        return new Place(
            params.id,
            params.name,
            params.address,
            params.coordinate,
            params.normalizedName,
            params.normalizedAddress,
            params.category,
            params.source,
            params.sourceId,
            params.usageCount,
            params.isActive,
        )
    }

    incrementUsage(): void {
        this.usageCount += 1
    }

    getId(): PlaceId { return this.id }
    getName(): PlaceName { return this.name }
    getAddress(): PlaceAddress { return this.address }
    getCoordinate(): GeoCoordinate { return this.coordinate }
    getNormalizedName(): string { return this.normalizedName }
    getNormalizedAddress(): string { return this.normalizedAddress }
    getCategory(): string | null { return this.category }
    getSource(): string { return this.source }
    getSourceId(): string { return this.sourceId }
    getUsageCount(): number { return this.usageCount }
    isActive(): boolean { return this.active }
}
