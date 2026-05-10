/**
 * 広告機能の型定義
 */

/** 広告スロットの表示タイプ */
export type AdSlotType = 'fixed' | 'feed'

/** 広告モード（環境変数 VITE_AD_MODE で制御） */
export type AdMode = 'mock' | 'test' | 'production'

/** 広告スロット設定 */
export interface AdSlotConfig {
    /** 広告スロット一意ID */
    slotId: string
    /** AdSense 広告ユニット ID（production のみ使用） */
    adUnitId: string
    /** 表示タイプ */
    type: AdSlotType
    /** フィード内広告の場合: N件に1つ */
    feedInterval?: number
    /** フィード内広告の場合: 最低何件あれば表示するか */
    feedMinItems?: number
    /** 広告フォーマット */
    format: 'responsive' | 'fixed'
    /** 固定サイズの場合の幅x高さ */
    size?: { width: number; height: number }
    /** 上マージン（px） */
    marginTop: number
    /** 有効/無効 */
    enabled: boolean
}

/** フィード内広告のマーカー（Discriminated Union 用） */
export interface AdFeedMarker {
    readonly _isAd: true
    slotId: string
}

/** 型ガード: フィードアイテムが広告かどうか */
export function isAdFeedMarker(item: unknown): item is AdFeedMarker {
    return typeof item === 'object' && item !== null && '_isAd' in item && (item as AdFeedMarker)._isAd === true
}
