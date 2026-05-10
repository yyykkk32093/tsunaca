import type { IPlaceRepository } from '@/domains/place/domain/repository/IPlaceRepository.js'

export type PlaceSearchItemDto = {
    id: string
    name: string
    address: string
    lat: number
    lng: number
    category: string | null
    usageCount: number
}

export type SearchPlaceResult = {
    items: PlaceSearchItemDto[]
}

/**
 * Place検索 UseCase
 *
 * - 1〜30文字のクエリで検索
 * - 1文字未満は空配列（フロントが2文字以上で叩く想定だが防御的に許容）
 * - 結果0件時は空配列（フロントは自由入力誘導）
 */
export class SearchPlaceUseCase {
    private static readonly DEFAULT_LIMIT = 10
    private static readonly MAX_LIMIT = 20

    constructor(private readonly placeRepository: IPlaceRepository) { }

    async execute(input: { query: string; limit?: number }): Promise<SearchPlaceResult> {
        const query = (input.query ?? '').trim()
        if (query.length === 0) {
            return { items: [] }
        }

        const limit = Math.min(
            Math.max(1, input.limit ?? SearchPlaceUseCase.DEFAULT_LIMIT),
            SearchPlaceUseCase.MAX_LIMIT,
        )

        const results = await this.placeRepository.search({ query, limit })

        return {
            items: results.map(({ place }) => ({
                id: place.getId().getValue(),
                name: place.getName().getValue(),
                address: place.getAddress().getValue(),
                lat: place.getCoordinate().getLatitude(),
                lng: place.getCoordinate().getLongitude(),
                category: place.getCategory(),
                usageCount: place.getUsageCount(),
            })),
        }
    }
}
