/**
 * PaywallPage — RevenueCat Web SDK 版
 *
 * GET /v1/plans API からプラン一覧を動的取得し、
 * RevenueCat の Web Billing 経由でサブスクリプション購入・管理を行う。
 */

import { useAuth } from '@/app/providers/AuthProvider'
import { Button } from '@/shared/components/ui/button'
import { http } from '@/shared/lib/apiClient'
import { getOrConfigurePurchases, isRevenueCatConfigured } from '@/shared/lib/revenuecat'
import type { Offering, Purchases, Package as RCPackage } from '@revenuecat/purchases-js'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'

/** API から返るプラン情報 */
interface PlanMasterDTO {
    id: string
    displayName: string
    description: string | null
    monthlyPrice: number | null
    oneTimePrice: number | null
    sortOrder: number
}

/** プランごとの静的 UI 情報（APIで取得できない部分を補完） */
const planUIConfig: Record<string, {
    features: string[]
    limitations: string[]
    highlight: boolean
}> = {
    FREE: {
        features: [
            'コミュニティ参加',
            'スケジュール閲覧・参加',
            'チャット利用',
            'お知らせ閲覧',
        ],
        limitations: [
            'コミュニティ作成 1つまで',
            'サブコミュニティ 1つまで',
        ],
        highlight: false,
    },
    LITE: {
        features: [
            'Free の全機能',
            '広告非表示',
        ],
        limitations: [],
        highlight: false,
    },
    PRO: {
        features: [
            'Lite の全機能',
            'コミュニティ無制限作成',
            'DM・チャット検索・ファイル添付',
            '参加費の徴収（Stripe Connect）',
            '高度な通知設定',
            'カスタムスタンプ',
        ],
        limitations: [],
        highlight: true,
    },
    LIFETIME: {
        features: [
            'Pro の全機能',
            '永久利用権',
            '将来の機能もすべて利用可能',
        ],
        limitations: [],
        highlight: false,
    },
}

function formatPrice(plan: PlanMasterDTO): { price: string; period: string } {
    if (plan.monthlyPrice != null) {
        return { price: `¥${plan.monthlyPrice.toLocaleString()}`, period: '/月' }
    }
    if (plan.oneTimePrice != null) {
        return { price: `¥${plan.oneTimePrice.toLocaleString()}`, period: '（買い切り）' }
    }
    return { price: '¥0', period: '' }
}

export function PaywallPage() {
    const { user } = useAuth()
    const currentPlan = user?.plan ?? 'FREE'
    const [purchasing, setPurchasing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [offering, setOffering] = useState<Offering | null>(null)
    const purchasesRef = useRef<Purchases | null>(null)
    const purchaseTargetRef = useRef<HTMLDivElement>(null)

    // プラン一覧を API から取得
    const { data: plansData } = useQuery({
        queryKey: ['plans'],
        queryFn: () => http<{ plans: PlanMasterDTO[] }>('/v1/plans'),
    })
    const plans = plansData?.plans ?? []

    // RevenueCat SDK を初期化して Offerings を取得
    useEffect(() => {
        if (!user?.userId || !isRevenueCatConfigured()) return

        const init = async () => {
            try {
                const purchases = getOrConfigurePurchases(user.userId)
                purchasesRef.current = purchases
                const offerings = await purchases.getOfferings()
                setOffering(offerings.current ?? null)
            } catch (err) {
                console.error('[RevenueCat] Failed to load offerings:', err)
            }
        }
        init()
    }, [user?.userId])

    /**
     * サブスク購入
     * RevenueCat の purchase() が Stripe の決済UIを自動でマウントする
     */
    const handleCancel = useCallback(async () => {
        if (!window.confirm('現在のプランを解約してFREEプランに変更しますか？')) return
        setPurchasing(true)
        setError(null)
        try {
            await http('/v1/billing/cancel', { method: 'POST' })
            window.location.reload()
        } catch (err) {
            const message = err instanceof Error ? err.message : '解約処理に失敗しました'
            setError(message)
        } finally {
            setPurchasing(false)
        }
    }, [])

    const handlePurchase = useCallback(async (planId: string) => {
        if (!purchasesRef.current || !offering) return

        // offering から該当パッケージを探す
        const pkg: RCPackage | undefined = planId === 'LITE'
            ? offering.availablePackages.find((p) => p.identifier.includes('lite'))
            : (offering.monthly ?? offering.availablePackages[0])

        if (!pkg) {
            setError('購入可能なパッケージが見つかりません')
            return
        }

        setPurchasing(true)
        setError(null)

        try {
            await purchasesRef.current.purchase({
                rcPackage: pkg,
                customerEmail: user?.email,
                htmlTarget: purchaseTargetRef.current ?? undefined,
            })
            // 購入成功 → ページリロードで AuthProvider が新しい plan を取得
            window.location.reload()
        } catch (err) {
            const message = err instanceof Error ? err.message : '購入処理に失敗しました'
            setError(message)
        } finally {
            setPurchasing(false)
        }
    }, [offering, user?.email])

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-2">プランを選択</h1>
            <p className="text-gray-600 mb-6">
                現在のプラン:{' '}
                <span className="font-semibold text-blue-600">{currentPlan}</span>
            </p>

            <div className={`grid grid-cols-1 ${plans.some(p => p.id === 'LIFETIME') ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4 mb-8`}>
                {plans.map((plan) => {
                    const isCurrent = plan.id === currentPlan
                    const ui = planUIConfig[plan.id] ?? { features: [], limitations: [], highlight: false }
                    const { price, period } = formatPrice(plan)
                    const canUpgrade = !isCurrent && plan.id !== 'FREE' && currentPlan !== 'LIFETIME'

                    return (
                        <div
                            key={plan.id}
                            className={`border rounded-xl p-5 flex flex-col ${ui.highlight
                                ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50/50'
                                : 'border-gray-200'
                                }`}
                        >
                            {ui.highlight && (
                                <span className="text-xs font-semibold text-blue-600 mb-2">
                                    おすすめ
                                </span>
                            )}
                            <h2 className="text-xl font-bold">{plan.displayName}</h2>
                            <p className="mt-2 mb-4">
                                <span className="text-3xl font-bold">{price}</span>
                                <span className="text-gray-500 text-sm">{period}</span>
                            </p>
                            <ul className="space-y-2 flex-1">
                                {ui.features.map((f) => (
                                    <li key={f} className="text-sm text-gray-700 flex items-start gap-1.5">
                                        <span className="text-green-500 mt-0.5">✓</span>
                                        {f}
                                    </li>
                                ))}
                                {ui.limitations.map((l) => (
                                    <li key={l} className="text-sm text-gray-400 flex items-start gap-1.5">
                                        <span className="text-gray-300 mt-0.5">—</span>
                                        {l}
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-4">
                                {isCurrent ? (
                                    <span className="block text-center px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm font-medium">
                                        現在のプラン
                                    </span>
                                ) : canUpgrade && (plan.id === 'LITE' || plan.id === 'PRO') ? (
                                    <Button
                                        className="w-full"
                                        onClick={() => handlePurchase(plan.id)}
                                        disabled={purchasing || !offering}
                                    >
                                        {purchasing ? '処理中...' : '変更する'}
                                    </Button>
                                ) : plan.id === 'FREE' && currentPlan !== 'FREE' ? (
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={handleCancel}
                                        disabled={purchasing}
                                    >
                                        {purchasing ? '処理中...' : '変更する'}
                                    </Button>
                                ) : plan.id === 'LIFETIME' && currentPlan !== 'LIFETIME' ? (
                                    <span className="block text-center px-4 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm">
                                        📱 アプリから購入
                                    </span>
                                ) : null}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* RevenueCat 決済 UI のマウント先 */}
            <div ref={purchaseTargetRef} />

            {error && (
                <p className="text-red-500 text-sm text-center mb-4">{error}</p>
            )}

            {plans.some(p => p.id === 'LIFETIME') && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="font-semibold text-yellow-800 mb-1">
                        💡 Lifetime プランについて
                    </h3>
                    <p className="text-sm text-yellow-700">
                        Lifetime プランの購入は iOS / Android アプリからお願いします。
                        アプリ内の「設定」→「プラン」から購入できます。
                    </p>
                </div>
            )}
        </div>
    )
}
