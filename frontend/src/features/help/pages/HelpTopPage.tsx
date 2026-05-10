import { useAuth } from '@/app/providers/AuthProvider'
import { useLocale } from '@/app/providers/LocaleProvider'
import {
    canAccess,
    findArticle,
    getHelpCategories,
    type HelpAudience,
} from '@/features/help/content/helpLoader'
import { highlightText } from '@/features/help/lib/highlight'
import { searchHelpArticles } from '@/features/help/lib/searchClient'
import { ArrowRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

function getUserAudience(authedSystemRole?: string | null, isAuthed = false): HelpAudience {
    if (authedSystemRole === 'OPERATOR' || authedSystemRole === 'SUPER_ADMIN') return 'admin'
    if (isAuthed) return 'authenticated'
    return 'public'
}

// Wave6 Phase 9b-06: ドメインラベル（検索結果バッジ用）
const DOMAIN_LABEL: Record<string, string> = {
    community: 'コミュニティ',
    activity: 'アクティビティ',
    payment: '決済',
    account: 'アカウント',
    others: 'その他',
}

const RECENT_KEY = 'help:recent-slugs'

interface RecentArticleRef {
    categorySlug: string
    articleSlug: string
    title?: string
}

/**
 * localStorage からの読み込み。新形式（オブジェクト配列）と旧形式（文字列配列 `${cat}/${slug}`）の両方に対応。
 */
function loadRecentArticles(): RecentArticleRef[] {
    try {
        const raw = localStorage.getItem(RECENT_KEY)
        if (!raw) return []
        const parsed = JSON.parse(raw) as unknown
        if (!Array.isArray(parsed)) return []
        const norm: RecentArticleRef[] = []
        for (const item of parsed.slice(0, 5)) {
            if (typeof item === 'string') {
                const [categorySlug, articleSlug] = item.split('/')
                if (categorySlug && articleSlug) norm.push({ categorySlug, articleSlug })
            } else if (
                item &&
                typeof item === 'object' &&
                typeof (item as RecentArticleRef).categorySlug === 'string' &&
                typeof (item as RecentArticleRef).articleSlug === 'string'
            ) {
                norm.push(item as RecentArticleRef)
            }
        }
        return norm
    } catch {
        return []
    }
}

/** Wave6 Phase 7: ヘルプトップ */
export function HelpTopPage() {
    const { user, isAuthenticated } = useAuth()
    const { locale } = useLocale()
    const audience = getUserAudience(user?.systemRole, isAuthenticated)
    const [query, setQuery] = useState('')
    const [openCats, setOpenCats] = useState<Record<string, boolean>>({})

    const recents = useMemo(() => {
        // 表示時に最新タイトルを解決（記事リネームにも追随）
        return loadRecentArticles()
            .map((r) => {
                const found = findArticle(r.categorySlug, r.articleSlug, locale)
                return found
                    ? {
                        categorySlug: r.categorySlug,
                        articleSlug: r.articleSlug,
                        title: found.article.title,
                        categoryLabel: found.category.label,
                        icon: found.category.icon,
                    }
                    : null
            })
            .filter((r): r is NonNullable<typeof r> => r !== null)
    }, [locale])

    const searchResults = useMemo(
        () => searchHelpArticles(query, audience, 20, locale),
        [query, audience, locale],
    )

    const visibleCategories = getHelpCategories(locale).filter((cat) =>
        cat.articles.some((a) => canAccess(a, audience)),
    )

    return (
        <div className="container mx-auto max-w-3xl p-4 space-y-6">
            <header className="space-y-2">
                <h1 className="text-2xl font-bold">ヘルプ</h1>
                <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="キーワードで検索（例: ログイン・招待）"
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
            </header>

            {query.trim() ? (
                <section className="space-y-2">
                    <h2 className="text-sm font-semibold text-gray-700">
                        検索結果（{searchResults.length}件）
                    </h2>
                    {searchResults.length === 0 ? (
                        <div className="rounded border border-dashed border-gray-300 p-4 text-center text-gray-500">
                            該当する記事が見つかりません
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {searchResults.map(({ category, article, matches }) => (
                                <li key={`${category.slug}-${article.slug}`}>
                                    <Link
                                        to={`/help/${category.slug}/${article.slug}`}
                                        className="block rounded border border-gray-200 p-3 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                                            <span>{category.icon} {category.label}</span>
                                            {/* Wave6 Phase 9b-06: ドメインバッジ */}
                                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px]">
                                                {DOMAIN_LABEL[article.domain] ?? article.domain}
                                            </span>
                                        </div>
                                        <div className="text-sm font-medium text-gray-900">
                                            {highlightText(article.title, matches, 'title')}
                                        </div>
                                        <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                                            {highlightText(article.summary, matches, 'summary')}
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            ) : (
                <>
                    {recents.length > 0 && (
                        <section className="space-y-2">
                            <h2 className="text-sm font-semibold text-gray-700">最近見た記事</h2>
                            <ul className="space-y-1 text-sm list-disc list-inside">
                                {recents.map((r) => (
                                    <li key={`${r.categorySlug}/${r.articleSlug}`}>
                                        <Link
                                            to={`/help/${r.categorySlug}/${r.articleSlug}`}
                                            className="text-blue-600 hover:underline"
                                        >
                                            {r.title}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    <section className="space-y-2">
                        <h2 className="text-sm font-semibold text-gray-700">カテゴリ</h2>
                        <ul className="space-y-2">
                            {visibleCategories.map((cat) => {
                                const isOpen = openCats[cat.slug] ?? false
                                const visibleArticles = cat.articles.filter((a) =>
                                    canAccess(a, audience),
                                )
                                return (
                                    <li
                                        key={cat.slug}
                                        className="rounded border border-gray-200"
                                    >
                                        {/* ヘッダー: アコーディオン開閉ボタン */}
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setOpenCats((s) => ({
                                                    ...s,
                                                    [cat.slug]: !isOpen,
                                                }))
                                            }
                                            className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50"
                                            aria-expanded={isOpen}
                                        >
                                            <span className="text-2xl">{cat.icon}</span>
                                            <div className="flex-1">
                                                <div className="text-sm font-semibold">
                                                    {cat.label}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {cat.description}
                                                </div>
                                            </div>
                                            <span className="text-gray-400" aria-hidden>
                                                {isOpen ? '▾' : '▸'}
                                            </span>
                                        </button>
                                        {isOpen && (
                                            <>
                                                <ul className="border-t border-gray-100 divide-y divide-gray-100">
                                                    {visibleArticles.map((a) => (
                                                        <li key={a.slug}>
                                                            <Link
                                                                to={`/help/${cat.slug}/${a.slug}`}
                                                                className="flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50"
                                                            >
                                                                <span>{a.title}</span>
                                                            </Link>
                                                        </li>
                                                    ))}
                                                </ul>
                                                {/* 9b-12: カテゴリ全件への誘導をリスト末尾に配置（アイコンだけより意図が明確） */}
                                                <Link
                                                    to={`/help/${cat.slug}`}
                                                    className="flex items-center justify-center gap-1 border-t border-gray-100 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50"
                                                >
                                                    {cat.label}の記事をすべて見る
                                                    <ArrowRight className="h-3 w-3" />
                                                </Link>
                                            </>
                                        )}
                                    </li>
                                )
                            })}
                        </ul>
                    </section>
                </>
            )}

            {/* 下部固定 CTA */}
            <div className="sticky bottom-4 pt-6">
                <Link
                    to="/contact"
                    className="block w-full rounded-lg bg-blue-600 text-white text-center py-3 text-sm font-semibold shadow hover:bg-blue-700 transition-colors"
                >
                    お問い合わせはこちら
                </Link>
            </div>
        </div>
    )
}
