import { useAuth } from '@/app/providers/AuthProvider'
import { Button } from '@/shared/components/ui/button'
import { useCallback, useEffect, useState } from 'react'
import { loadAdSenseScript } from '../adScriptLoader'
import { setConsentStatus, useConsentStatus } from '../consentStore'

/**
 * Cookie 同意バナー
 *
 * - 初回訪問時にページ下部に固定表示（FREE ユーザーのみ）
 * - 「同意する」→ Consent Mode v2 を granted に更新 + AdSense スクリプトロード
 * - 「今はしない」→ Consent Mode v2 を denied のまま（NPA 広告は表示継続）
 * - 選択済みの場合は非表示（localStorage で状態保持）
 *
 * パーソナライズの制御は Consent Mode v2 経由で AdSense が自動判定する。
 */
export function CookieConsent() {
    const consentStatus = useConsentStatus()
    const { user } = useAuth()
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (consentStatus === 'pending' && user?.plan === 'FREE') {
            const timer = setTimeout(() => setVisible(true), 500)
            return () => clearTimeout(timer)
        }
        setVisible(false)
    }, [consentStatus, user?.plan])

    const handleAccept = useCallback(() => {
        setConsentStatus('granted')
        setVisible(false)
        loadAdSenseScript().catch(() => { })
    }, [])

    const handleDecline = useCallback(() => {
        setConsentStatus('denied')
        setVisible(false)
    }, [])

    if (consentStatus !== 'pending' || user?.plan !== 'FREE') {
        return null
    }

    return (
        <div
            className={`fixed inset-x-0 bottom-16 z-50 mx-auto max-w-lg transform px-4 transition-all duration-300 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
                }`}
        >
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
                <p className="text-sm text-gray-600">
                    同意いただくと、あなたの興味に合った広告が表示されやすくなります。
                    詳しくは
                    <a
                        href="/privacy"
                        className="text-blue-600 underline hover:text-blue-700"
                    >
                        プライバシーポリシー
                    </a>
                    をご覧ください。
                </p>
                <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleDecline}>
                        今はしない
                    </Button>
                    <Button size="sm" onClick={handleAccept}>
                        同意する
                    </Button>
                </div>
            </div>
        </div>
    )
}
