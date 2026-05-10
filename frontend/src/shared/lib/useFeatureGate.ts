import { useAuth } from '@/app/providers/AuthProvider'

/**
 * Feature Gate フック
 *
 * 認証ユーザーの features / limits を手軽に参照するためのユーティリティ。
 * AuthProvider の user.features / user.limits をラップする。
 *
 * @example
 * const { canUse, getLimit, isPaid } = useFeatureGate()
 * if (canUse('CUSTOM_STAMP')) { ... }
 * if (getLimit('maxCustomStamps') > currentCount) { ... }
 */
export function useFeatureGate() {
    const { user } = useAuth()

    /** 指定 feature が利用可能か */
    const canUse = (feature: string): boolean => {
        if (!user) return false
        return user.features[feature] === true
    }

    /** 指定 limitKey の上限値を返す (-1 = unlimited, 0 = default) */
    const getLimit = (limitKey: string): number => {
        if (!user) return 0
        return user.limits[limitKey] ?? 0
    }

    /** 有料プラン（LITE/PRO/LIFETIME）かどうか */
    const isPaid = user != null && user.plan !== 'FREE'

    /** PREMIUMコミュニティグレード対象プラン（PRO/LIFETIME）かどうか */
    const isPremiumPlan = user != null && (user.plan === 'PRO' || user.plan === 'LIFETIME')

    /** 現在のプラン */
    const plan = user?.plan ?? null

    return { canUse, getLimit, isPaid, isPremiumPlan, plan } as const
}
