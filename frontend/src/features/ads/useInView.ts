import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Intersection Observer を使ったビューポート内判定 Hook
 *
 * 要素が画面内（+ rootMargin 分の余白）に入ったかどうかを返す。
 * 広告の遅延ロードに使用。一度 true になったら監視を解除する（広告は再非表示にしない）。
 */
export function useInView(options?: IntersectionObserverInit): {
    ref: (node: HTMLElement | null) => void
    inView: boolean
} {
    const [inView, setInView] = useState(false)
    const observerRef = useRef<IntersectionObserver | null>(null)

    const ref = useCallback(
        (node: HTMLElement | null) => {
            // 前の observer をクリーンアップ
            if (observerRef.current) {
                observerRef.current.disconnect()
                observerRef.current = null
            }

            if (!node || inView) return

            observerRef.current = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        setInView(true)
                        observerRef.current?.disconnect()
                        observerRef.current = null
                    }
                },
                { rootMargin: '200px', ...options },
            )

            observerRef.current.observe(node)
        },
        [inView, options],
    )

    useEffect(() => {
        return () => {
            observerRef.current?.disconnect()
        }
    }, [])

    return { ref, inView }
}
