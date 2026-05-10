import { http } from '@/shared/lib/apiClient'
import type { PlaceSearchItem } from '@/shared/types/api'

export const placeApi = {
    search: (q: string, limit = 10) =>
        http<{ items: PlaceSearchItem[] }>('/v1/places/search', {
            query: { q, limit },
        }),
}
