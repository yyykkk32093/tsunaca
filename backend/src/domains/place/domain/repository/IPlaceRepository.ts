import type { Place } from '../model/entity/Place.js'

/**
 * Place検索結果（人気順 + similarity合成スコア順）
 */
export type PlaceSearchResult = {
    place: Place
    /** スコア（similarity + usageCount由来）。デバッグ・ソート結果検証用 */
    score: number
}

export interface IPlaceRepository {
    findById(id: string): Promise<Place | null>

    /**
     * 検索クエリにマッチする Place を上位 N 件返す。
     *
     * 仕様（Wave6 Phase6 W6-07 確定）:
     * - 前方一致 + pg_trgm similarity + usageCount DESC の合成スコアで上位 N 件
     * - isActive=true のみ対象
     * - 0件時は空配列（フロントは自由入力誘導）
     */
    search(params: {
        query: string
        limit: number
    }): Promise<PlaceSearchResult[]>

    /**
     * 使用カウントをインクリメント（Activity保存成功時に呼ぶ）
     */
    incrementUsageCount(id: string): Promise<void>
}
