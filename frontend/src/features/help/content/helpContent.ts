/**
 * @deprecated Wave6 Phase 7-2 で Markdown 同梱方式に移行済み。
 *             新規実装は `helpLoader.ts` を直接 import すること。
 */
export {
    canAccess,
    findArticle,
    findCategory,
    getAdjacentArticles, HELP_CATEGORIES, type HelpArticle,
    type HelpAudience,
    type HelpCategory
} from '@/features/help/content/helpLoader'
export { searchHelpArticles as searchArticles } from '@/features/help/lib/searchClient'

