/**
 * OSM 抽出対象タグと除外条件の定義
 *
 * 方針（Wave6 Phase6 W6-07 確定）:
 * - 第一弾は会場として妥当なPOIに限定（運動施設・コミュニティ施設・公共施設の中核）
 * - 運用後に拡張
 */

export type CategoryKey =
    | 'sports_centre'
    | 'community_centre'
    | 'civic'
    | 'park'
    | 'school'
    | 'public_building'
    | 'other'

/**
 * osmium tags-filter で抽出対象とするタグ
 * 形式: 'key=value' または 'key' （valueワイルドカード）
 *
 * 中間スコープ拡張（W6-07 後続）:
 *   - amenity=arts_centre / social_centre  : 文化センター・地域センター系の取りこぼし対策
 *   - building=civic / public               : 庁舎・公共建築物単位
 *   - office=government                     : 行政機関オフィス
 */
export const EXTRACT_TAGS: string[] = [
    // スポーツ施設
    'leisure=sports_centre',
    'leisure=fitness_centre',
    'leisure=stadium',
    'leisure=pitch',
    'leisure=swimming_pool',
    // コミュニティ・公共
    'amenity=community_centre',
    'amenity=arts_centre',
    'amenity=social_centre',
    'amenity=townhall',
    'amenity=public_building',
    'amenity=library',
    // 公園
    'leisure=park',
    // 学校（体育館を借りる用途想定）
    'amenity=school',
    'amenity=college',
    'amenity=university',
    // 公共建築物・行政（中間スコープ拡張）
    'building=civic',
    'building=public',
    'office=government',
]

/**
 * 抽出後に除外する条件（transform 時に適用）
 * - 名前なしは除外
 * - 住所は欠落OK（緯度経度は別途必須・transform側で確認）
 *   → Google Maps リンクは緯度経度ベースなので住所不要
 */
export function shouldExclude(props: {
    name?: string | null
    address?: string | null
}): boolean {
    if (!props.name || props.name.trim().length === 0) return true
    return false
}

/**
 * OSMタグからカテゴリを判定
 */
export function detectCategory(tags: Record<string, string>): CategoryKey {
    if (tags['leisure'] === 'sports_centre' || tags['leisure'] === 'fitness_centre' || tags['leisure'] === 'stadium' || tags['leisure'] === 'pitch' || tags['leisure'] === 'swimming_pool') {
        return 'sports_centre'
    }
    if (tags['amenity'] === 'community_centre' || tags['amenity'] === 'arts_centre' || tags['amenity'] === 'social_centre') return 'community_centre'
    if (tags['amenity'] === 'townhall' || tags['amenity'] === 'public_building') return 'civic'
    if (tags['office'] === 'government' || tags['building'] === 'civic') return 'civic'
    if (tags['leisure'] === 'park') return 'park'
    if (tags['amenity'] === 'school' || tags['amenity'] === 'college' || tags['amenity'] === 'university') return 'school'
    if (tags['amenity'] === 'library') return 'public_building'
    if (tags['building'] === 'public') return 'public_building'
    return 'other'
}

export const SOURCE = 'osm'
