import { useAuth } from '@/app/providers/AuthProvider'
import { useLocale } from '@/app/providers/LocaleProvider'
import { MarkdownRenderer } from '@/features/help/components/MarkdownRenderer'
import {
    canAccess,
    findArticle,
    getAdjacentArticles,
    type HelpAudience,
} from '@/features/help/content/helpLoader'
import { getRelatedArticles } from '@/features/help/lib/relatedArticles'
import { extractToc } from '@/features/help/lib/toc'
import { http } from '@/shared/lib/apiClient'
import { useMutation } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useLocation, useParams } from 'react-router-dom'
import { toast } from 'sonner'

function getUserAudience(systemRole?: string | null, isAuthed = false): HelpAudience {
    if (systemRole === 'OPERATOR' || systemRole === 'SUPER_ADMIN') return 'admin'
    if (isAuthed) return 'authenticated'
    return 'public'
}

const RECENT_KEY = 'help:recent-slugs'

interface RecentArticleRef {
    categorySlug: string
    articleSlug: string
    title?: string
}

function pushRecent(entry: RecentArticleRef) {
    try {
        const raw = localStorage.getItem(RECENT_KEY)
        const arr: unknown = raw ? JSON.parse(raw) : []
        const list: RecentArticleRef[] = Array.isArray(arr)
            ? arr
                .map((it) => {
                    if (typeof it === 'string') {
                        const [c, a] = it.split('/')
                        return c && a ? { categorySlug: c, articleSlug: a } : null
                    }
                    if (
                        it &&
                        typeof it === 'object' &&
                        typeof (it as RecentArticleRef).categorySlug === 'string' &&
                        typeof (it as RecentArticleRef).articleSlug === 'string'
                    ) {
                        return it as RecentArticleRef
                    }
                    return null
                })
                .filter((x): x is RecentArticleRef => x !== null)
            : []
        const next = [
            entry,
            ...list.filter(
                (p) =>
                    !(p.categorySlug === entry.categorySlug && p.articleSlug === entry.articleSlug),
            ),
        ].slice(0, 5)
        localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    } catch {
        /* noop */
    }
}

/** Wave6 Phase 7: ヘルプ記事ページ */
export function HelpArticlePage() {
    const { categorySlug = '', articleSlug = '' } = useParams<{
        categorySlug: string
        articleSlug: string
    }>()
    const location = useLocation()
    const { user, isAuthenticated } = useAuth()
    const { locale } = useLocale()
    const audience = getUserAudience(user?.systemRole, isAuthenticated)

    const [feedbackSent, setFeedbackSent] = useState(false)

    const found = findArticle(categorySlug, articleSlug, locale)

    // 最近見た記事に push（タイトル込み）
    useEffect(() => {
        if (found && canAccess(found.article, audience)) {
            pushRecent({
                categorySlug,
                articleSlug,
                title: found.article.title,
            })
        }
    }, [found, audience, categorySlug, articleSlug])

    // URL fragment による見出しスクロール（Markdown 内に rehype-slug が ID を付与）
    useEffect(() => {
        if (!found) return
        const hash = location.hash.replace(/^#/, '')
        if (!hash) return
        // レンダリング完了を待って scroll
        const id = window.setTimeout(() => {
            const el = document.getElementById(hash)
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 50)
        return () => window.clearTimeout(id)
    }, [location.hash, found])

    const feedbackMutation = useMutation({
        mutationFn: (helpful: boolean) =>
            http<{ ok: true }>('/v1/help/feedback', {
                method: 'POST',
                json: {
                    categorySlug,
                    articleSlug,
                    helpful,
                },
            }),
        onSuccess: () => {
            setFeedbackSent(true)
            toast.success('フィードバックありがとうございます')
        },
        onError: () => {
            toast.error('フィードバックの送信に失敗しました')
        },
    })

    if (!found) {
        return <div className="p-4 text-gray-500">記事が見つかりません</div>
    }

    if (!canAccess(found.article, audience)) {
        return (
            <div className="container mx-auto max-w-2xl p-4 space-y-4">
                <p className="text-sm text-gray-700">
                    この記事を閲覧するにはログインが必要です。
                </p>
                <Link
                    to="/login"
                    className="inline-block rounded bg-blue-600 text-white px-4 py-2 text-sm"
                >
                    ログイン
                </Link>
            </div>
        )
    }

    const { category, article } = found
    const { prev, next } = getAdjacentArticles(categorySlug, articleSlug, audience, locale)
    const toc = useMemo(() => extractToc(article.body), [article.body])
    const related = useMemo(
        () => getRelatedArticles(categorySlug, articleSlug, audience, 3, locale),
        [categorySlug, articleSlug, audience, locale],
    )

    return (
        <div className="container mx-auto max-w-5xl p-4">
            {/* a11y (Phase 9b-13): 本文への skip link */}
            <a
                href="#help-article-body"
                className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-blue-600 focus:px-3 focus:py-2 focus:text-white"
            >
                本文へスキップ
            </a>
            <div className="lg:flex lg:gap-8">
                <article id="help-article-body" className="flex-1 space-y-6">
                    <Helmet>
                        <title>{`${article.title} | ヘルプ | tsunaca`}</title>
                        <meta name="description" content={article.summary} />
                        <meta property="og:title" content={article.title} />
                        <meta property="og:description" content={article.summary} />
                        <meta property="og:type" content="article" />
                    </Helmet>

                    <nav className="text-xs text-gray-500">
                        <Link to="/help" className="hover:underline">ヘルプ</Link>
                        <span className="mx-1">/</span>
                        <Link to={`/help/${category.slug}`} className="hover:underline">
                            {category.label}
                        </Link>
                    </nav>

                    <header className="space-y-2">
                        <h1 className="text-2xl font-bold text-gray-900">{article.title}</h1>
                        <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                            <span>{category.icon} {category.label}</span>
                            {article.tags.map((t) => (
                                <span
                                    key={t}
                                    className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600"
                                >
                                    #{t}
                                </span>
                            ))}
                        </div>
                    </header>

                    {article.updatedAt && (
                        <div className="text-xs text-gray-500">
                            最終更新: {article.updatedAt}
                        </div>
                    )}

                    <MarkdownRenderer source={article.body} />

                    {/* 関連記事 (Phase 9b-10) */}
                    {related.length > 0 && (
                        <section className="space-y-2 pt-2">
                            <h2 className="text-sm font-semibold text-gray-700">関連記事</h2>
                            <ul className="space-y-2">
                                {related.map((r) => (
                                    <li key={`${r.category.slug}/${r.article.slug}`}>
                                        <Link
                                            to={`/help/${r.category.slug}/${r.article.slug}`}
                                            className="block rounded border border-gray-200 p-3 hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="text-xs text-gray-500">
                                                {r.category.icon} {r.category.label}
                                            </div>
                                            <div className="text-sm font-medium text-gray-900">
                                                {r.article.title}
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {/* 記事末尾フィードバック */}
                    <section className="rounded border border-gray-200 p-4 bg-gray-50 space-y-3">
                        <div className="text-sm font-semibold text-gray-700">
                            この記事は役に立ちましたか？
                        </div>
                        {feedbackSent ? (
                            <div className="text-xs text-gray-600">
                                フィードバックを記録しました。ありがとうございます。
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => feedbackMutation.mutate(true)}
                                    disabled={feedbackMutation.isPending}
                                    className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-white"
                                >
                                    👍 役に立った
                                </button>
                                <button
                                    type="button"
                                    onClick={() => feedbackMutation.mutate(false)}
                                    disabled={feedbackMutation.isPending}
                                    className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-white"
                                >
                                    👎 立たなかった
                                </button>
                            </div>
                        )}
                        <div>
                            <Link
                                to={`/contact?category=${category.slug}&articleSlug=${article.slug}&articleTitle=${encodeURIComponent(article.title)}`}
                                className="text-xs text-blue-600 hover:underline"
                            >
                                この記事について問い合わせる →
                            </Link>
                        </div>
                    </section>

                    {/* prev / next ナビ */}
                    {(prev || next) && (
                        <nav className="grid grid-cols-2 gap-3 pt-2">
                            {prev ? (
                                <Link
                                    to={`/help/${category.slug}/${prev.slug}`}
                                    className="flex items-center gap-2 rounded border border-gray-200 p-3 text-sm hover:bg-gray-50"
                                >
                                    <ChevronLeft className="h-4 w-4 text-gray-400" />
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-[10px] text-gray-500">前の記事</span>
                                        <span className="block truncate">{prev.title}</span>
                                    </span>
                                </Link>
                            ) : (
                                <div />
                            )}
                            {next ? (
                                <Link
                                    to={`/help/${category.slug}/${next.slug}`}
                                    className="flex items-center gap-2 rounded border border-gray-200 p-3 text-sm hover:bg-gray-50 text-right"
                                >
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-[10px] text-gray-500">次の記事</span>
                                        <span className="block truncate">{next.title}</span>
                                    </span>
                                    <ChevronRight className="h-4 w-4 text-gray-400" />
                                </Link>
                            ) : (
                                <div />
                            )}
                        </nav>
                    )}
                </article>

                {/* TOC sidebar (Phase 9b-09): デスクトップでは sticky 右カラム */}
                {toc.length > 0 && (
                    <aside className="hidden lg:block lg:w-56 lg:shrink-0">
                        <nav className="sticky top-20 text-sm">
                            <div className="text-xs font-semibold text-gray-500 mb-2">
                                このページの目次
                            </div>
                            <ul className="space-y-1 border-l border-gray-200">
                                {toc.map((entry, i) => (
                                    <li
                                        key={`${entry.slug}-${i}`}
                                        className={entry.level === 3 ? 'pl-4' : 'pl-2'}
                                    >
                                        <a
                                            href={`#${entry.slug}`}
                                            className="block py-1 text-gray-600 hover:text-blue-600 hover:underline truncate"
                                        >
                                            {entry.text}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    </aside>
                )}
            </div>
        </div>
    )
}
