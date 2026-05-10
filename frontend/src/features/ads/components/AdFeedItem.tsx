import { AdBanner } from './AdBanner'

interface Props {
    slotId: string
}

/**
 * フィード内広告コンポーネント
 *
 * useAdFeed が挿入した AdFeedMarker の位置にレンダリングされる。
 * AdBanner のラッパーで、フィード内に適したスタイルを付与。
 */
export function AdFeedItem({ slotId }: Props) {
    return <AdBanner slotId={slotId} className="px-4" />
}
