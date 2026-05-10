/**
 * Wave6 Phase 9b-09: Markdown 本文から見出し（h2/h3）を抽出して目次を生成
 *
 * MarkdownRenderer は rehype-slug で見出しに id を付与している前提。
 * 本ユーティリティは記事本文（fenced code block を除いた）を解析して同じ slug を生成する。
 */

export interface TocEntry {
    level: 2 | 3
    text: string
    slug: string
}

/**
 * GitHub 風 slugify（rehype-slug デフォルトに概ね一致）。
 * - lower-case
 * - 英数字・ハイフン・アンダースコア・CJK 残し、それ以外は削除
 * - 連続スペース/区切り文字を `-` に
 */
function slugify(text: string): string {
    return text
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\p{L}\p{N}\-_]/gu, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
}

/** Markdown 本文から h2 / h3 のみを TOC として抽出 */
export function extractToc(markdown: string): TocEntry[] {
    const lines = markdown.split(/\r?\n/)
    const out: TocEntry[] = []
    let inFence = false
    let fenceMarker: string | null = null

    for (const raw of lines) {
        const line = raw.trimEnd()
        // fenced code block の判定
        const fenceMatch = line.match(/^(```|~~~)/)
        if (fenceMatch) {
            if (!inFence) {
                inFence = true
                fenceMarker = fenceMatch[1]
            } else if (line.startsWith(fenceMarker ?? '')) {
                inFence = false
                fenceMarker = null
            }
            continue
        }
        if (inFence) continue

        const m = line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/)
        if (!m) continue
        const level = (m[1].length === 2 ? 2 : 3) as 2 | 3
        const text = m[2].trim()
        if (!text) continue
        out.push({ level, text, slug: slugify(text) })
    }
    return out
}
