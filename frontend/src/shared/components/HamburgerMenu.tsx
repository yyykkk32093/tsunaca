import { useAuth } from '@/app/providers/AuthProvider'
import { useLocale } from '@/app/providers/LocaleProvider'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import { Separator } from '@/shared/components/ui/separator'
import {
    Sheet,
    SheetContent,
    SheetTitle,
    SheetTrigger,
} from '@/shared/components/ui/sheet'
import { cn } from '@/shared/lib/utils'
import {
    BarChart3,
    CreditCard,
    HelpCircle,
    Inbox,
    LogOut,
    Menu,
    Settings,
    Shield,
    type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? 'dev'

/**
 * Wave6 Phase 9: ハンバーガーメニュー
 *
 * Q16 に基づく13項目構成（未実装画面は段階リリース方針で非表示）:
 *   1. プロフィールヘッダー（アバター + 名前 + メール）
 *   2. マイページ
 *   3. マイ問い合わせ履歴（Phase 8-B）
 *   4. 通知設定           — 未実装（非表示）
 *   5. プラン管理         → /paywall
 *   6. ヘルプ             — Phase 7 着手後に有効化（一旦リンクは置く）
 *   ─ 区切り ─
 *   9. 運営メニュー（systemRole が OPERATOR/SUPER_ADMIN のみ）
 *      - 問い合わせ管理（Phase 8-C）
 *   ─ 区切り ─
 *   11. 利用規約 / プライバシー — 未実装（非表示）
 *   12. アプリバージョン       — フッターに表示
 *   13. ログアウト
 *
 * バッジ（集約・項目別）は `useMenuBadges` hook 設計後に追加（Phase 9 残作業）。
 */
export function HamburgerMenu() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [open, setOpen] = useState(false)

    const isAdmin = user?.systemRole === 'OPERATOR' || user?.systemRole === 'SUPER_ADMIN'

    // ── メニュー項目定義（Phase 9 本体で拡張） ──
    type MenuItem =
        | { kind: 'link'; to: string; icon: LucideIcon; label: string }
        | { kind: 'separator' }

    const items: MenuItem[] = [
        { kind: 'link', to: '/mypage', icon: Settings, label: 'マイページ' },
        { kind: 'link', to: '/mypage/inquiries', icon: Inbox, label: '問い合わせ履歴' },
        { kind: 'link', to: '/paywall', icon: CreditCard, label: 'プラン管理' },
        { kind: 'separator' },
        { kind: 'link', to: '/help', icon: HelpCircle, label: 'ヘルプ' },
    ]

    if (isAdmin) {
        items.push({ kind: 'separator' })
        items.push({ kind: 'link', to: '/admin', icon: Shield, label: '運営トップ' })
        items.push({ kind: 'link', to: '/admin/inquiries', icon: Inbox, label: '問い合わせ管理' })
        items.push({
            kind: 'link',
            to: '/admin/help-feedback',
            icon: BarChart3,
            label: 'ヘルプフィードバック集計',
        })
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <button
                    type="button"
                    className="flex items-center justify-center w-9 h-9 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
                    aria-label="メニュー"
                >
                    <Menu className="w-5 h-5" />
                </button>
            </SheetTrigger>
            <SheetContent side="right" className="flex flex-col">
                {/* a11y: SheetTitle は必須。視覚的には sr-only にしてプロフィールヘッダーをタイトル代わりに見せる */}
                <SheetTitle className="sr-only">メニュー</SheetTitle>

                {/* プロフィールヘッダー（タップでマイページ） */}
                <Link
                    to="/mypage"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 pt-5 pb-4 hover:bg-gray-50 transition-colors"
                >
                    <Avatar className="h-12 w-12">
                        <AvatarImage
                            src={user?.avatarUrl ?? undefined}
                            alt={user?.displayName ?? ''}
                        />
                        <AvatarFallback className="bg-blue-100 text-blue-700">
                            {user?.displayName?.charAt(0)?.toUpperCase() ?? '?'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <div className="text-base font-semibold text-gray-900 truncate">
                            {user?.displayName ?? '未設定'}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{user?.email}</div>
                    </div>
                </Link>

                <Separator />

                {/* メニュー項目 */}
                <nav className="flex-1 overflow-y-auto py-2">
                    <ul className="space-y-0.5">
                        {items.map((item, idx) => {
                            if (item.kind === 'separator') {
                                return (
                                    <li key={`sep-${idx}`} className="py-2">
                                        <Separator />
                                    </li>
                                )
                            }
                            const Icon = item.icon
                            return (
                                <li key={item.to}>
                                    <Link
                                        to={item.to}
                                        onClick={() => setOpen(false)}
                                        className={cn(
                                            'flex items-center gap-3 px-4 py-3 text-sm text-gray-800',
                                            'hover:bg-gray-50 transition-colors',
                                        )}
                                    >
                                        <Icon className="w-5 h-5 text-gray-500" />
                                        <span className="flex-1">{item.label}</span>
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                </nav>

                <Separator />

                {/* Wave6 Phase 9b-05: ロケール切替 */}
                <LocaleSwitcher />

                <Separator />

                {/* ログアウト */}
                <button
                    type="button"
                    onClick={() => {
                        setOpen(false)
                        logout()
                        navigate('/login', { replace: true })
                    }}
                    className="flex items-center gap-3 px-4 py-4 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    <span>ログアウト</span>
                </button>

                {/* アプリバージョン（フッター） */}
                <div className="px-4 py-2 text-[10px] text-gray-400 text-center">
                    tsunaca v{APP_VERSION}
                </div>
            </SheetContent>
        </Sheet>
    )
}

/** Wave6 Phase 9b-05: ロケール切替コンポーネント */
function LocaleSwitcher() {
    const { locale, setLocale } = useLocale()
    const { isAuthenticated } = useAuth()
    return (
        <div className="px-4 py-3 flex items-center gap-3 text-sm">
            <span className="text-gray-500 flex-1">言語 / Language</span>
            <select
                value={locale}
                onChange={(e) =>
                    setLocale(e.target.value as 'ja' | 'en', { syncToBackend: isAuthenticated })
                }
                className="rounded border border-gray-300 px-2 py-1 text-sm"
                aria-label="表示言語"
            >
                <option value="ja">日本語</option>
                <option value="en">English</option>
            </select>
        </div>
    )
}
