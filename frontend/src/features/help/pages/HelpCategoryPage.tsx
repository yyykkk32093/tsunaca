import { useAuth } from '@/app/providers/AuthProvider'
import { useLocale } from '@/app/providers/LocaleProvider'
import {
    canAccess,
    findCategory,
    type HelpArticle,
    type HelpAudience,
    type HelpDomain,
} from '@/features/help/content/helpLoader'
import { Link, useParams } from 'react-router-dom'

function getUserAudience(systemRole?: string | null, isAuthed = false): HelpAudience {
    if (systemRole === 'OPERATOR' || systemRole === 'SUPER_ADMIN') return 'admin'
    if (isAuthed) return 'authenticated'
    return 'public'
}

const DOMAIN_LABEL: Record<HelpDomain, string> = {
    community: 'コミュニティ',
    activity: 'アクティビティ',
    payment: '決済・プラン',
    account: 'アカウント',
    others: 'その他',
}
const DOMAIN_ORDER: HelpDomain[] = ['community', 'activity', 'payment', 'account', 'others']

/** Wave6 Phase 7 / 9b-06: ヘルプカテゴリページ（ドメイン軸でグルーピング） */
export function HelpCategoryPage() {
    const { categorySlug = '' } = useParams<{ categorySlug: string }>()
    const { user, isAuthenticated } = useAuth()
    const { locale } = useLocale()
    const audience = getUserAudience(user?.systemRole, isAuthenticated)

    const category = findCategory(categorySlug, locale)
    if (!category) {
        return <div className="p-4 text-gray-500">カテゴリが見つかりません</div>
    }

    const visibleArticles = category.articles
        .filter((a) => canAccess(a, audience))
        .sort((a, b) => a.order - b.order)

    const grouped = new Map<HelpDomain, HelpArticle[]>()
    for (const a of visibleArticles) {
        const list = grouped.get(a.domain) ?? []
        list.push(a)
        grouped.set(a.domain, list)
    }
    const groupedSorted = DOMAIN_ORDER.filter((d) => grouped.has(d)).map((d) => ({
        domain: d,
        articles: grouped.get(d)!,
    }))

    return (
        <div className="container mx-auto max-w-3xl p-4 space-y-6">
            <header className="space-y-1">
                <div className="text-3xl">{category.icon}</div>
                <h1 className="text-xl font-bold">{category.label}</h1>
                <p className="text-sm text-gray-600">{category.description}</p>
            </header>

            {groupedSorted.length === 0 ? (
                <div className="rounded border border-dashed border-gray-300 p-8 text-center text-gray-500">
                    記事がありません
                </div>
            ) : (
                groupedSorted.map(({ domain, articles }) => (
                    <section key={domain} className="space-y-2">
                        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs">
                                {DOMAIN_LABEL[domain]}
                            </span>
                        </h2>
                        <ul className="space-y-2">
                            {articles.map((a) => (
                                <li key={a.slug}>
                                    <Link
                                        to={`/help/${category.slug}/${a.slug}`}
                                        className="block rounded border border-gray-200 p-3 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="text-sm font-semibold text-gray-900">
                                            {a.title}
                                        </div>
                                        <div className="text-xs text-gray-600 mt-1">
                                            {a.summary}
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))
            )}

            {/* カテゴリ末尾 CTA */}
            <div className="rounded border border-gray-200 p-4 bg-gray-50">
                <p className="text-sm text-gray-700 mb-2">解決しない場合は、お問い合わせください。</p>
                <Link
                    to={`/contact?category=${category.slug}`}
                    className="inline-block rounded bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700"
                >
                    このカテゴリで問い合わせる
                </Link>
            </div>
        </div>
    )
}
