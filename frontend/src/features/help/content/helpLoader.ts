/**
 * Wave6 Phase 7-2: ヘルプコンテンツローダ
 *
 * `frontend/src/features/help/contents/{locale}/{categorySlug}/...md` を
 * Vite の `import.meta.glob` で一括ロードし、frontmatter を gray-matter で分離、
 * zod で検証して型付きレジストリを生成する。
 *
 * - `_category.md`: カテゴリメタ（label / description / icon / sortOrder）
 * - それ以外: 記事（title / summary / audience / domain / tags / order / updatedAt）
 *
 * i18n: 現状 `ja` のみ実装。`en` 追加時はディレクトリを増やすだけ。
 */
import { z } from 'zod';

/**
 * 軽量 frontmatter パーサ（ブラウザ動作・Node API 非依存）。
 *
 * gray-matter は内部で `Buffer` / `js-yaml` を参照するためブラウザバンドルが破綻し
 * `http://localhost:5173/` が真っ白になっていた（2026-05 修正）。
 * 本ヘルプの frontmatter は単純な key: value / 配列 / 文字列のみのため自前で十分。
 */
function parseFrontmatter(raw: string): { data: Record<string, unknown>; content: string } {
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
    if (!match) return { data: {}, content: raw }
    const [, fmBlock, body] = match
    const data: Record<string, unknown> = {}
    for (const line of fmBlock.split(/\r?\n/)) {
        if (!line.trim() || line.trim().startsWith('#')) continue
        const m = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/)
        if (!m) continue
        const [, key, rawVal] = m
        data[key] = parseScalar(rawVal.trim())
    }
    return { data, content: body }
}

function parseScalar(raw: string): unknown {
    if (raw === '' || raw === '~' || raw === 'null') return null
    if (raw === 'true') return true
    if (raw === 'false') return false
    if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw)
    // 配列: [a, b, "c d"]
    if (raw.startsWith('[') && raw.endsWith(']')) {
        const inner = raw.slice(1, -1).trim()
        if (!inner) return []
        return inner
            .split(',')
            .map((item) => item.trim())
            .map((item) => unquote(item))
    }
    return unquote(raw)
}

function unquote(raw: string): string {
    if (
        (raw.startsWith('"') && raw.endsWith('"')) ||
        (raw.startsWith("'") && raw.endsWith("'"))
    ) {
        return raw.slice(1, -1)
    }
    return raw
}

// ──────────── Types ────────────
export type HelpAudience = 'public' | 'authenticated' | 'admin'
export type HelpDomain =
    | 'community'
    | 'activity'
    | 'payment'
    | 'account'
    | 'others'

export interface HelpArticle {
    slug: string
    title: string
    summary: string
    body: string
    audience: HelpAudience
    domain: HelpDomain
    tags: string[]
    order: number
    /** YYYY-MM-DD 形式の最終更新日（frontmatter より） */
    updatedAt?: string
}

export interface HelpCategory {
    slug: string
    label: string
    description: string
    icon: string
    sortOrder: number
    articles: HelpArticle[]
}

// ──────────── Schemas ────────────
const audienceSchema = z.enum(['public', 'authenticated', 'admin'])
const domainSchema = z.enum(['community', 'activity', 'payment', 'account', 'others'])

const categoryFrontmatterSchema = z.object({
    slug: z.string().min(1),
    label: z.string().min(1),
    description: z.string(),
    icon: z.string().default('📄'),
    sortOrder: z.number().int().default(999),
})

const articleFrontmatterSchema = z.object({
    slug: z.string().min(1),
    title: z.string().min(1),
    summary: z.string().default(''),
    audience: audienceSchema.default('public'),
    domain: domainSchema.default('others'),
    tags: z.array(z.string()).default([]),
    order: z.number().int().default(999),
    updatedAt: z.string().optional(),
})

// ──────────── Loader ────────────
type RawModules = Record<string, string>

export type HelpLocale = 'ja' | 'en'

// `?raw` クエリで生 Markdown 文字列をロード（eager）
const ja = import.meta.glob('/src/features/help/contents/ja/**/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
}) as RawModules

// Wave6 Phase 9b-05: 英語コンテンツ（最低 1 カテゴリ × 2 記事）
const en = import.meta.glob('/src/features/help/contents/en/**/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
}) as RawModules

function buildRegistry(modules: RawModules): HelpCategory[] {
    const categoryMap = new Map<string, HelpCategory>()

    // 1) まずカテゴリメタを処理（_category.md）
    for (const [path, raw] of Object.entries(modules)) {
        const m = path.match(/\/contents\/[^/]+\/([^/]+)\/_category\.md$/)
        if (!m) continue
        const dirSlug = m[1]
        const parsed = parseFrontmatter(raw)
        const data = categoryFrontmatterSchema.parse({
            slug: dirSlug,
            ...parsed.data,
        })
        categoryMap.set(dirSlug, {
            slug: data.slug,
            label: data.label,
            description: data.description,
            icon: data.icon,
            sortOrder: data.sortOrder,
            articles: [],
        })
    }

    // 2) 記事ファイルを処理
    for (const [path, raw] of Object.entries(modules)) {
        const m = path.match(/\/contents\/[^/]+\/([^/]+)\/([^/]+)\.md$/)
        if (!m) continue
        const [, dirSlug, fileSlug] = m
        if (fileSlug === '_category') continue
        const cat = categoryMap.get(dirSlug)
        if (!cat) {
            // 親カテゴリ未定義の記事はスキップ（ビルド時に警告は出さない＝MVP）
            continue
        }
        const parsed = parseFrontmatter(raw)
        const fm = articleFrontmatterSchema.parse({
            slug: fileSlug,
            ...parsed.data,
        })
        cat.articles.push({
            slug: fm.slug,
            title: fm.title,
            summary: fm.summary,
            body: parsed.content.trim(),
            audience: fm.audience,
            domain: fm.domain,
            tags: fm.tags,
            order: fm.order,
            updatedAt: fm.updatedAt,
        })
    }

    // 3) ソート
    for (const cat of categoryMap.values()) {
        cat.articles.sort((a, b) => a.order - b.order)
    }
    return Array.from(categoryMap.values()).sort((a, b) => a.sortOrder - b.sortOrder)
}

export const HELP_CATEGORIES_BY_LOCALE: Record<HelpLocale, HelpCategory[]> = {
    ja: buildRegistry(ja),
    en: buildRegistry(en),
}

/**
 * 既存コードとの互換: デフォルトは ja。
 * 新規コードは getHelpCategories(locale) を使用すること。
 */
export const HELP_CATEGORIES: HelpCategory[] = HELP_CATEGORIES_BY_LOCALE.ja

export function getHelpCategories(locale: HelpLocale = 'ja'): HelpCategory[] {
    return HELP_CATEGORIES_BY_LOCALE[locale] ?? HELP_CATEGORIES_BY_LOCALE.ja
}

// ──────────── Helpers ────────────
export function findCategory(slug: string, locale: HelpLocale = 'ja'): HelpCategory | undefined {
    return getHelpCategories(locale).find((c) => c.slug === slug)
}

export function findArticle(
    categorySlug: string,
    articleSlug: string,
    locale: HelpLocale = 'ja',
): { category: HelpCategory; article: HelpArticle } | undefined {
    const category = findCategory(categorySlug, locale)
    if (!category) return undefined
    const article = category.articles.find((a) => a.slug === articleSlug)
    if (!article) return undefined
    return { category, article }
}

export function canAccess(article: HelpArticle, userAudience: HelpAudience): boolean {
    if (article.audience === 'public') return true
    if (article.audience === 'authenticated') {
        return userAudience === 'authenticated' || userAudience === 'admin'
    }
    return userAudience === 'admin'
}

/**
 * 記事のソート済み一覧（同カテゴリ内）から prev/next を取得。
 */
export function getAdjacentArticles(
    categorySlug: string,
    articleSlug: string,
    audience: HelpAudience,
    locale: HelpLocale = 'ja',
): { prev?: HelpArticle; next?: HelpArticle } {
    const cat = findCategory(categorySlug, locale)
    if (!cat) return {}
    const visible = cat.articles.filter((a) => canAccess(a, audience))
    const idx = visible.findIndex((a) => a.slug === articleSlug)
    if (idx < 0) return {}
    return {
        prev: idx > 0 ? visible[idx - 1] : undefined,
        next: idx < visible.length - 1 ? visible[idx + 1] : undefined,
    }
}
