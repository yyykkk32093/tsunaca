/**
 * Wave6 Phase 7-2: Fuse.js を用いたファジー検索クライアント
 */
import {
    canAccess,
    getHelpCategories,
    type HelpArticle,
    type HelpAudience,
    type HelpCategory,
    type HelpLocale,
} from '@/features/help/content/helpLoader'
import Fuse from 'fuse.js'

export interface HelpSearchHit {
    category: HelpCategory
    article: HelpArticle
    score?: number
    matches?: HelpSearchMatch[]
}

interface IndexEntry {
    category: HelpCategory
    article: HelpArticle
    title: string
    summary: string
    body: string
    tags: string
}

let cachedIndexByLocale: Partial<Record<HelpLocale, { entries: IndexEntry[]; fuse: Fuse<IndexEntry> }>> = {}

function buildIndex(locale: HelpLocale) {
    const entries: IndexEntry[] = []
    for (const category of getHelpCategories(locale)) {
        for (const article of category.articles) {
            entries.push({
                category,
                article,
                title: article.title,
                summary: article.summary,
                body: article.body,
                tags: article.tags.join(' '),
            })
        }
    }
    const fuse = new Fuse(entries, {
        includeScore: true,
        includeMatches: true,
        threshold: 0.4,
        ignoreLocation: true,
        keys: [
            { name: 'title', weight: 3 },
            { name: 'tags', weight: 2 },
            { name: 'summary', weight: 1 },
            { name: 'body', weight: 0.5 },
        ],
    })
    return { entries, fuse }
}

/** 検索ヒット範囲（Phase 9b-08 で title/summary のハイライトに使用） */
export interface HelpSearchMatch {
    key: string
    indices: ReadonlyArray<readonly [number, number]>
    value?: string
}

export function searchHelpArticles(
    query: string,
    userAudience: HelpAudience,
    limit = 20,
    locale: HelpLocale = 'ja',
): HelpSearchHit[] {
    const q = query.trim()
    if (!q) return []
    let cached = cachedIndexByLocale[locale]
    if (!cached) {
        cached = buildIndex(locale)
        cachedIndexByLocale[locale] = cached
    }
    return cached.fuse
        .search(q, { limit })
        .filter(({ item }) => canAccess(item.article, userAudience))
        .map(({ item, score, matches }) => ({
            category: item.category,
            article: item.article,
            score,
            matches: (matches ?? []).map((m) => ({
                key: m.key ?? '',
                indices: m.indices,
                value: m.value,
            })) as HelpSearchMatch[],
        }))
}
