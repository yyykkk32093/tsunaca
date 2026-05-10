/**
 * Wave6 Phase 7-2 / Phase 9b-01 / 9b-04: Help Feedback コントローラ
 *
 * - `POST /v1/help/feedback`                : 記事の役立ち評価（👍/👎）— HelpFeedback 永続化
 * - `GET  /v1/admin/help/feedback/summary`  : 記事ごとの helpful 率集計（要 SystemAdmin）
 * - `GET  /v1/admin/help/feedback/export`   : CSV エクスポート（要 SystemAdmin）
 *
 * 認証ユーザーは [userId, articleSlug] で upsert（再投票上書き）。匿名は insert のみ（rate-limit で抑制）。
 * Phase 9b-17 で `/v1/help/subscribe` および HelpSubscription は撤去済み。
 */
import { prisma } from '@/_sharedTech/db/client.js'
import type { Request, Response } from 'express'
import { z } from 'zod'

const feedbackSchema = z.object({
    categorySlug: z.string().min(1).max(80),
    articleSlug: z.string().min(1).max(80),
    helpful: z.boolean(),
    comment: z.string().max(500).optional(),
})

export const helpController = {
    async submitFeedback(req: Request, res: Response) {
        const parsed = feedbackSchema.safeParse(req.body)
        if (!parsed.success) {
            res.status(400).json({ code: 'INVALID_BODY', message: parsed.error.message })
            return
        }
        const { categorySlug, articleSlug, helpful, comment } = parsed.data
        const userId = req.user?.userId ?? null

        try {
            if (userId) {
                await prisma.helpFeedback.upsert({
                    where: { userId_articleSlug: { userId, articleSlug } },
                    create: {
                        userId,
                        articleSlug,
                        categorySlug,
                        helpful,
                        comment: comment ?? null,
                    },
                    update: {
                        helpful,
                        comment: comment ?? null,
                        categorySlug,
                    },
                })
            } else {
                await prisma.helpFeedback.create({
                    data: {
                        userId: null,
                        articleSlug,
                        categorySlug,
                        helpful,
                        comment: comment ?? null,
                    },
                })
            }
            res.status(200).json({ ok: true })
        } catch (err) {
            console.error('[help][feedback][persist-failed]', err)
            res.status(500).json({ code: 'INTERNAL_ERROR', message: '保存に失敗しました' })
        }
    },
}

interface AdminFeedbackSummaryRow {
    categorySlug: string
    articleSlug: string
    total: number
    helpfulCount: number
    notHelpfulCount: number
    helpfulRate: number // 0.0–1.0
    lastFeedbackAt: string | null
}

export const adminHelpFeedbackController = {
    /**
     * GET /v1/admin/help/feedback/summary
     * 記事ごとの集計を返す（helpful 率の昇順 = 低評価優先）。
     */
    async summary(_req: Request, res: Response) {
        try {
            const grouped = await prisma.helpFeedback.groupBy({
                by: ['categorySlug', 'articleSlug', 'helpful'],
                _count: { _all: true },
                _max: { createdAt: true },
            })

            const map = new Map<string, AdminFeedbackSummaryRow>()
            for (const g of grouped) {
                const key = `${g.categorySlug}::${g.articleSlug}`
                const cur =
                    map.get(key) ??
                    ({
                        categorySlug: g.categorySlug,
                        articleSlug: g.articleSlug,
                        total: 0,
                        helpfulCount: 0,
                        notHelpfulCount: 0,
                        helpfulRate: 0,
                        lastFeedbackAt: null,
                    } satisfies AdminFeedbackSummaryRow)
                const count = g._count._all
                cur.total += count
                if (g.helpful) cur.helpfulCount += count
                else cur.notHelpfulCount += count
                const t = g._max.createdAt
                if (t && (!cur.lastFeedbackAt || t.toISOString() > cur.lastFeedbackAt)) {
                    cur.lastFeedbackAt = t.toISOString()
                }
                map.set(key, cur)
            }

            const rows = Array.from(map.values()).map((r) => ({
                ...r,
                helpfulRate: r.total > 0 ? r.helpfulCount / r.total : 0,
            }))
            // helpfulRate 昇順（同率は total 降順）
            rows.sort((a, b) => {
                if (a.helpfulRate !== b.helpfulRate) return a.helpfulRate - b.helpfulRate
                return b.total - a.total
            })
            res.status(200).json({ rows })
        } catch (err) {
            console.error('[admin][help][feedback][summary-failed]', err)
            res.status(500).json({ code: 'INTERNAL_ERROR', message: '集計に失敗しました' })
        }
    },

    /**
     * GET /v1/admin/help/feedback/export
     * 全行を CSV で返す（articleSlug, categorySlug, helpful, comment, userId, createdAt, updatedAt）。
     */
    async exportCsv(_req: Request, res: Response) {
        try {
            const rows = await prisma.helpFeedback.findMany({
                orderBy: { createdAt: 'desc' },
                select: {
                    articleSlug: true,
                    categorySlug: true,
                    helpful: true,
                    comment: true,
                    userId: true,
                    createdAt: true,
                    updatedAt: true,
                },
            })

            const header = [
                'articleSlug',
                'categorySlug',
                'helpful',
                'comment',
                'userId',
                'createdAt',
                'updatedAt',
            ].join(',')
            const escape = (v: unknown): string => {
                if (v === null || v === undefined) return ''
                const s = v instanceof Date ? v.toISOString() : String(v)
                if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
                return s
            }
            const lines = rows.map((r) =>
                [
                    r.articleSlug,
                    r.categorySlug,
                    r.helpful,
                    r.comment,
                    r.userId,
                    r.createdAt,
                    r.updatedAt,
                ]
                    .map(escape)
                    .join(','),
            )
            const csv = [header, ...lines].join('\n')
            // BOM 付与（Excel 文字化け対策）
            res.setHeader('Content-Type', 'text/csv; charset=utf-8')
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="help-feedback-${new Date().toISOString().slice(0, 10)}.csv"`,
            )
            res.status(200).send('\uFEFF' + csv)
        } catch (err) {
            console.error('[admin][help][feedback][export-failed]', err)
            res.status(500).json({ code: 'INTERNAL_ERROR', message: 'CSV 生成に失敗しました' })
        }
    },
}
