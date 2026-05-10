/**
 * Place（開催場所マスタ）API スキーマ
 */
import { z } from 'zod/v4'

/** GET /v1/places/search?q=...&limit=... */
export const searchPlaceQuerySchema = z.object({
    q: z.string().min(1, '検索クエリは必須です').max(100),
    limit: z.coerce.number().int().min(1).max(20).optional(),
})

export type SearchPlaceQuery = z.infer<typeof searchPlaceQuerySchema>
