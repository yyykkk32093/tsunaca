/**
 * Wave6 Phase 9b-10: 関連記事リコメンド
 *
 * スコア = タグ一致数 × 2 + 同カテゴリ × 1
 * 自身を除外し、上位 N 件を返す。
 */
import type { HelpArticle, HelpAudience, HelpCategory, HelpLocale } from '@/features/help/content/helpLoader'
import { canAccess, getHelpCategories } from '@/features/help/content/helpLoader'

export interface RelatedArticleHit {
    category: HelpCategory
    article: HelpArticle
    score: number
}

export function getRelatedArticles(
    currentCategorySlug: string,
    currentArticleSlug: string,
    audience: HelpAudience,
    limit = 3,
    locale: HelpLocale = 'ja',
): RelatedArticleHit[] {
    const all = getHelpCategories(locale)
    const currentTags = (() => {
        const cat = all.find((c) => c.slug === currentCategorySlug)
        const a = cat?.articles.find((x) => x.slug === currentArticleSlug)
        return new Set(a?.tags ?? [])
    })()

    const hits: RelatedArticleHit[] = []
    for (const category of all) {
        for (const article of category.articles) {
            if (
                category.slug === currentCategorySlug &&
                article.slug === currentArticleSlug
            ) {
                continue
            }
            if (!canAccess(article, audience)) continue
            const tagOverlap = article.tags.filter((t) => currentTags.has(t)).length
            const sameCategory = category.slug === currentCategorySlug ? 1 : 0
            const score = tagOverlap * 2 + sameCategory
            if (score <= 0) continue
            hits.push({ category, article, score })
        }
    }
    hits.sort((a, b) => b.score - a.score)
    return hits.slice(0, limit)
}
