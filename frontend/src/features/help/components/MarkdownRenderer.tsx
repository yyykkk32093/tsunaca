/**
 * Wave6 Phase 7-2: react-markdown ベースのレンダラ。
 * - GFM テーブル / タスクリスト
 * - 見出しに自動 ID 付与（rehype-slug）+ アンカー（rehype-autolink-headings）
 */
import ReactMarkdown from 'react-markdown'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'

export function MarkdownRenderer({ source }: { source: string }) {
    return (
        <div className="prose prose-sm max-w-none text-gray-900 leading-relaxed
            prose-headings:font-semibold prose-headings:text-gray-900
            prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-2
            prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2
            prose-p:my-3
            prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
            prose-ul:my-3 prose-ol:my-3 prose-li:my-1
            prose-table:text-sm prose-table:border prose-table:border-gray-300 prose-table:border-collapse prose-th:bg-gray-50 prose-th:border prose-th:border-gray-300 prose-th:px-3 prose-th:py-1.5 prose-th:text-left prose-td:border prose-td:border-gray-300 prose-td:px-3 prose-td:py-1.5
            prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
            prose-blockquote:border-l-blue-300 prose-blockquote:bg-blue-50 prose-blockquote:py-1 prose-blockquote:not-italic
        ">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[
                    rehypeSlug,
                    [
                        rehypeAutolinkHeadings,
                        {
                            behavior: 'append',
                            properties: { className: ['anchor-link'], ariaHidden: 'true' },
                        },
                    ],
                ]}
            >
                {source}
            </ReactMarkdown>
        </div>
    )
}
