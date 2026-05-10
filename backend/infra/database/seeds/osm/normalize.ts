/**
 * 検索用文字列正規化ユーティリティ（OSM投入時用）
 *
 * ⚠️ 重要: このファイルは `backend/src/_sharedTech/text/placeNormalize.ts` と
 *          完全に同じ正規化結果を返す必要がある。
 *          rootDir 制約でモジュール共有できないため、両ファイルを必ず同期させること。
 *
 * - 全角→半角
 * - 空白の畳み込み
 * - 漢数字 → 算用数字
 * - 記号除去（一部）
 * - 小文字化
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
export function normalizeName(name: string): string {
    return toHalfWidth(name)
        .toLowerCase()
        .replace(/[\s\u3000]+/g, '')
        .replace(/[（(].*?[)）]/g, '') // カッコ書き除去
        .trim()
}

/** 検索用に住所を正規化 */
export function normalizeAddress(address: string): string {
    let s = toHalfWidth(address)
    s = kanjiDigitsToArabic(s)
    s = s.toLowerCase()
    s = s.replace(/[\s\u3000]+/g, '')
    s = s.replace(/[‐－―ー\-]/g, '-')
    s = s.replace(/丁目/g, '-').replace(/番地/g, '-').replace(/番/g, '-').replace(/号/g, '')
    s = s.replace(/-+/g, '-').replace(/-$/g, '')
    return s.trim()
}
