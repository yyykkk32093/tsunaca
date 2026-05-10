/**
 * Place 検索用の文字列正規化（投入時/検索時で共通利用）
 *
 * 仕様:
 * - 全角英数字記号 → 半角
 * - 漢数字 → 算用数字（簡易: 〇/零/一〜九のみ。十百千は対応しない）
 * - 空白除去
 * - 小文字化
 * - 名前: カッコ書き除去
 * - 住所: 丁目/番地/番/号 → ハイフン正規化
 *
 * 投入時 (`backend/infra/osm/transform.ts`) と検索時
 * (`backend/src/domains/place/infrastructure/repository/PlaceRepositoryImpl.ts`,
 *  `backend/src/domains/place/infrastructure/cache/PlaceMemoryCache.ts`)
 * の両方からimportして対称性を担保する。
 */

const KANJI_DIGIT_MAP: Record<string, string> = {
    '〇': '0', '零': '0',
    '一': '1', '二': '2', '三': '3', '四': '4', '五': '5',
    '六': '6', '七': '7', '八': '8', '九': '9',
}

/** 全角英数字記号 → 半角 */
function toHalfWidth(s: string): string {
    return s
        .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
        .replace(/　/g, ' ')
}

/** 漢数字 → 算用数字（単純置換、十百千は対応しない簡易版） */
function kanjiDigitsToArabic(s: string): string {
    return s.replace(/[〇零一二三四五六七八九]/g, (ch) => KANJI_DIGIT_MAP[ch] ?? ch)
}

/** 検索用に名前を正規化 */
export function normalizePlaceName(name: string): string {
    return toHalfWidth(name)
        .toLowerCase()
        .replace(/[\s\u3000]+/g, '')
        .replace(/[（(].*?[)）]/g, '') // カッコ書き除去
        .trim()
}

/** 検索用に住所を正規化 */
export function normalizePlaceAddress(address: string): string {
    let s = toHalfWidth(address)
    s = kanjiDigitsToArabic(s)
    s = s.toLowerCase()
    s = s.replace(/[\s\u3000]+/g, '')
    s = s.replace(/[‐－―ー\-]/g, '-')
    s = s.replace(/丁目/g, '-').replace(/番地/g, '-').replace(/番/g, '-').replace(/号/g, '')
    s = s.replace(/-+/g, '-').replace(/-$/g, '')
    return s.trim()
}

/** ユーザー入力クエリの正規化（名前と同等の処理） */
export function normalizePlaceQuery(query: string): string {
    return normalizePlaceName(query)
}
