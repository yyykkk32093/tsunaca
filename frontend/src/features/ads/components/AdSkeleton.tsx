/**
 * 広告ロード中のスケルトンプレースホルダー
 *
 * レイアウトシフト防止のため、広告ロード前に固定高さの枠を表示する。
 */
interface Props {
    className?: string
}

export function AdSkeleton({ className }: Props) {
    return (
        <div
            className={`animate-pulse rounded bg-gray-100 ${className ?? ''}`}
            style={{ minHeight: 100 }}
        >
            <div className="flex h-full min-h-[100px] items-center justify-center">
                <span className="text-xs text-gray-300">Ad</span>
            </div>
        </div>
    )
}
