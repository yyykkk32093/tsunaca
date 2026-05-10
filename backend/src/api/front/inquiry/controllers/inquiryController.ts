import { prisma } from '@/_sharedTech/db/client.js'
import { z } from 'zod'

/**
 * Wave6 Phase 8-B 暫定実装メモ:
 * 既存 DDD レイヤ（UseCase / Repository / Domain）に従わず、Controller から Prisma を直接呼ぶ簡潔実装。
 * 理由: スレッドモデルが独立しており、ドメインロジックがほぼ CRUD+状態遷移のみのため。
 * 後続 Wave で UseCase / Repository に分離する（バックログ I-11 を参照）。
 */

// ============================================================
// 入力スキーマ
// ============================================================

export const createInquirySchema = z.object({
    categorySlug: z.string().min(1).max(100),
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(10_000),
    /** 既にアップロード済みの添付ファイルキー（uploadClient で取得済の S3 key） */
    attachmentKeys: z
        .array(
            z.object({
                storageKey: z.string().min(1).max(500),
                fileName: z.string().min(1).max(255),
                mimeType: z.string().min(1).max(100),
                sizeBytes: z.number().int().positive().max(20 * 1024 * 1024),
            }),
        )
        .max(5)
        .optional()
        .default([]),
})

export const addMessageSchema = z.object({
    body: z.string().min(1).max(10_000),
    attachmentKeys: z
        .array(
            z.object({
                storageKey: z.string().min(1).max(500),
                fileName: z.string().min(1).max(255),
                mimeType: z.string().min(1).max(100),
                sizeBytes: z.number().int().positive().max(20 * 1024 * 1024),
            }),
        )
        .max(5)
        .optional()
        .default([]),
})

export const createAnonymousInquirySchema = createInquirySchema.extend({
    contactEmail: z.string().email().max(255),
    /** Google reCAPTCHA v3 トークン */
    recaptchaToken: z.string().min(1),
})

// ============================================================
// 共通ヘルパー
// ============================================================

async function findCategoryBySlug(slug: string) {
    return prisma.inquiryCategory.findUnique({ where: { slug } })
}

function serializeInquiry(inq: {
    id: string
    title: string
    status: string
    lastActivityAt: Date
    createdAt: Date
    category: { slug: string; labelI18n: unknown }
    messages?: Array<{
        id: string
        authorType: string
        body: string
        createdAt: Date
        attachments: Array<{
            id: string
            fileName: string
            mimeType: string
            sizeBytes: number
            scanStatus: string
        }>
    }>
}) {
    return {
        id: inq.id,
        title: inq.title,
        status: inq.status,
        lastActivityAt: inq.lastActivityAt.toISOString(),
        createdAt: inq.createdAt.toISOString(),
        category: { slug: inq.category.slug, labelI18n: inq.category.labelI18n },
        messages:
            inq.messages?.map((m) => ({
                id: m.id,
                authorType: m.authorType,
                body: m.body,
                createdAt: m.createdAt.toISOString(),
                attachments: m.attachments.map((a) => ({
                    id: a.id,
                    fileName: a.fileName,
                    mimeType: a.mimeType,
                    sizeBytes: a.sizeBytes,
                    scanStatus: a.scanStatus,
                })),
            })) ?? [],
    }
}

// ============================================================
// 認証ユーザー向け Controller
// ============================================================

import type { NextFunction, Request, Response } from 'express'
import { notifyOperatorsOfNewInquiry, notifyUserOfOperatorReply } from '../service/inquiryNotificationService.js'

export const inquiryController = {
    /** GET /v1/inquiries/categories — カテゴリ一覧（フォーム表示用） */
    async listCategories(req: Request, res: Response, next: NextFunction) {
        try {
            const includeAnonymous = req.query.includeAnonymous === 'true'
            const cats = await prisma.inquiryCategory.findMany({
                where: {
                    isActive: true,
                    ...(includeAnonymous ? {} : { isAnonymousOnly: false }),
                },
                orderBy: { sortOrder: 'asc' },
                select: {
                    id: true,
                    slug: true,
                    labelI18n: true,
                    relatedHelpCategorySlug: true,
                    isAnonymousOnly: true,
                },
            })
            res.status(200).json({ categories: cats })
        } catch (err) {
            next(err)
        }
    },

    /** POST /v1/inquiries — 認証ユーザーが問い合わせを作成 */
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId
            const input = createInquirySchema.parse(req.body)

            const category = await findCategoryBySlug(input.categorySlug)
            if (!category || !category.isActive || category.isAnonymousOnly) {
                res.status(400).json({ code: 'INVALID_CATEGORY', message: 'カテゴリが不正です' })
                return
            }

            const created = await prisma.inquiry.create({
                data: {
                    userId,
                    categoryId: category.id,
                    title: input.title,
                    status: 'OPEN',
                    messages: {
                        create: {
                            authorType: 'USER',
                            authorUserId: userId,
                            body: input.body,
                            attachments: {
                                create: input.attachmentKeys.map((a) => ({
                                    storageKey: a.storageKey,
                                    fileName: a.fileName,
                                    mimeType: a.mimeType,
                                    sizeBytes: a.sizeBytes,
                                    // ClamAV スキャンは非同期ジョブで CLEAN/INFECTED を更新する想定
                                    scanStatus: 'PENDING',
                                })),
                            },
                        },
                    },
                },
                include: {
                    category: true,
                    messages: {
                        include: { attachments: true },
                        orderBy: { createdAt: 'asc' },
                    },
                },
            })

            // 副作用: 運営への Slack 通知（失敗しても問い合わせ作成は成功させる）
            notifyOperatorsOfNewInquiry({
                inquiryId: created.id,
                title: created.title,
                categoryLabel: category.labelI18n as Record<string, string>,
                isAnonymous: false,
            }).catch((err) =>
                console.warn('[inquiry] Slack 通知失敗（無視して継続）:', err),
            )

            res.status(201).json(serializeInquiry(created))
        } catch (err) {
            next(err)
        }
    },

    /** GET /v1/inquiries — 自分の問い合わせ一覧 */
    async listMine(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId
            const items = await prisma.inquiry.findMany({
                where: { userId },
                orderBy: { lastActivityAt: 'desc' },
                take: 50,
                include: {
                    category: { select: { slug: true, labelI18n: true } },
                },
            })
            res.status(200).json({
                inquiries: items.map((it) => ({
                    id: it.id,
                    title: it.title,
                    status: it.status,
                    lastActivityAt: it.lastActivityAt.toISOString(),
                    createdAt: it.createdAt.toISOString(),
                    category: { slug: it.category.slug, labelI18n: it.category.labelI18n },
                })),
            })
        } catch (err) {
            next(err)
        }
    },

    /** GET /v1/inquiries/:id — 自分の問い合わせ詳細（スレッド全体） */
    async findMineById(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId
            const { id } = req.params
            const inq = await prisma.inquiry.findFirst({
                where: { id, userId }, // 他人の Inquiry は触れない
                include: {
                    category: true,
                    messages: {
                        include: { attachments: true },
                        orderBy: { createdAt: 'asc' },
                    },
                },
            })
            if (!inq) {
                res.status(404).json({ code: 'NOT_FOUND', message: 'Not Found' })
                return
            }
            res.status(200).json(serializeInquiry(inq))
        } catch (err) {
            next(err)
        }
    },

    /** POST /v1/inquiries/:id/messages — 自分の問い合わせに追記 */
    async addMyMessage(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId
            const { id } = req.params
            const input = addMessageSchema.parse(req.body)

            const inq = await prisma.inquiry.findFirst({
                where: { id, userId },
                select: { id: true, status: true },
            })
            if (!inq) {
                res.status(404).json({ code: 'NOT_FOUND', message: 'Not Found' })
                return
            }
            if (inq.status === 'CLOSED') {
                res.status(400).json({
                    code: 'INQUIRY_CLOSED',
                    message: 'この問い合わせは終了しています',
                })
                return
            }

            const message = await prisma.inquiryMessage.create({
                data: {
                    inquiryId: id,
                    authorType: 'USER',
                    authorUserId: userId,
                    body: input.body,
                    attachments: {
                        create: input.attachmentKeys.map((a) => ({
                            storageKey: a.storageKey,
                            fileName: a.fileName,
                            mimeType: a.mimeType,
                            sizeBytes: a.sizeBytes,
                            scanStatus: 'PENDING',
                        })),
                    },
                },
                include: { attachments: true },
            })

            // RESOLVED でユーザー追記が来た場合は OPEN に戻す（運営側で再対応が必要）
            const newStatus = inq.status === 'RESOLVED' ? 'OPEN' : inq.status
            await prisma.inquiry.update({
                where: { id },
                data: {
                    lastActivityAt: new Date(),
                    status: newStatus,
                },
            })

            res.status(201).json({
                id: message.id,
                authorType: message.authorType,
                body: message.body,
                createdAt: message.createdAt.toISOString(),
                attachments: message.attachments.map((a) => ({
                    id: a.id,
                    fileName: a.fileName,
                    mimeType: a.mimeType,
                    sizeBytes: a.sizeBytes,
                    scanStatus: a.scanStatus,
                })),
            })
        } catch (err) {
            next(err)
        }
    },

    /** POST /v1/inquiries/anonymous — 匿名（未認証）問い合わせ作成 */
    async createAnonymous(req: Request, res: Response, next: NextFunction) {
        try {
            const input = createAnonymousInquirySchema.parse(req.body)

            const category = await findCategoryBySlug(input.categorySlug)
            if (!category || !category.isActive || !category.isAnonymousOnly) {
                // 匿名ルートでは isAnonymousOnly カテゴリのみ受け付ける
                res.status(400).json({
                    code: 'INVALID_CATEGORY',
                    message: 'このカテゴリは匿名ルートでは使用できません',
                })
                return
            }

            // reCAPTCHA 検証（環境変数で有効化されているときのみ）
            const { verifyRecaptchaToken } = await import('../service/recaptchaVerifier.js')
            const captchaOk = await verifyRecaptchaToken(input.recaptchaToken, req.ip ?? undefined)
            if (!captchaOk) {
                res.status(400).json({ code: 'RECAPTCHA_FAILED', message: 'reCAPTCHA 検証に失敗しました' })
                return
            }

            const created = await prisma.inquiry.create({
                data: {
                    userId: null,
                    contactEmail: input.contactEmail,
                    categoryId: category.id,
                    title: input.title,
                    status: 'OPEN',
                    messages: {
                        create: {
                            authorType: 'USER',
                            body: input.body,
                            attachments: {
                                create: input.attachmentKeys.map((a) => ({
                                    storageKey: a.storageKey,
                                    fileName: a.fileName,
                                    mimeType: a.mimeType,
                                    sizeBytes: a.sizeBytes,
                                    scanStatus: 'PENDING',
                                })),
                            },
                        },
                    },
                },
                include: {
                    category: true,
                    messages: {
                        include: { attachments: true },
                        orderBy: { createdAt: 'asc' },
                    },
                },
            })

            notifyOperatorsOfNewInquiry({
                inquiryId: created.id,
                title: created.title,
                categoryLabel: category.labelI18n as Record<string, string>,
                isAnonymous: true,
            }).catch((err) =>
                console.warn('[inquiry] Slack 通知失敗（無視して継続）:', err),
            )

            // 匿名問い合わせは ID のみ返す（スレッド閲覧不可、運営返信はメール送信のみ）
            res.status(201).json({ id: created.id })
        } catch (err) {
            next(err)
        }
    },
}

// ============================================================
// 運営側 Controller（Phase 8-C）
// ============================================================

export const adminInquiryController = {
    /** GET /v1/admin/inquiries — 一覧（status / categorySlug / assignee でフィルタ） */
    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const status = req.query.status as string | undefined
            const categorySlug = req.query.category as string | undefined
            // Wave6 Phase 9b-16: assignee フィルタ
            //   - 'me'      ：ログイン中オペレーターの担当
            //   - 'unassigned': 未割当
            //   - undefined : 全件
            const assigneeFilter = req.query.assignee as string | undefined
            const operatorUserId = req.user?.userId

            const assigneeWhere =
                assigneeFilter === 'me' && operatorUserId
                    ? { assigneeUserId: operatorUserId }
                    : assigneeFilter === 'unassigned'
                        ? { assigneeUserId: null }
                        : {}

            const items = await prisma.inquiry.findMany({
                where: {
                    ...(status ? { status } : {}),
                    ...(categorySlug ? { category: { slug: categorySlug } } : {}),
                    ...assigneeWhere,
                },
                orderBy: { lastActivityAt: 'desc' },
                take: 100,
                include: {
                    category: { select: { slug: true, labelI18n: true } },
                    user: { select: { id: true, displayName: true, email: true } },
                    assignee: { select: { id: true, displayName: true, email: true } },
                },
            })

            res.status(200).json({
                inquiries: items.map((it) => ({
                    id: it.id,
                    title: it.title,
                    status: it.status,
                    lastActivityAt: it.lastActivityAt.toISOString(),
                    createdAt: it.createdAt.toISOString(),
                    category: { slug: it.category.slug, labelI18n: it.category.labelI18n },
                    user: it.user
                        ? {
                            id: it.user.id,
                            displayName: it.user.displayName,
                            email: it.user.email,
                        }
                        : null,
                    contactEmail: it.contactEmail,
                    assignee: it.assignee
                        ? {
                            id: it.assignee.id,
                            displayName: it.assignee.displayName,
                            email: it.assignee.email,
                        }
                        : null,
                })),
            })
        } catch (err) {
            next(err)
        }
    },

    /** GET /v1/admin/inquiries/:id — 詳細（任意の Inquiry にアクセス可） */
    async findById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params
            const inq = await prisma.inquiry.findUnique({
                where: { id },
                include: {
                    category: true,
                    user: { select: { id: true, displayName: true, email: true } },
                    assignee: { select: { id: true, displayName: true, email: true } },
                    messages: {
                        include: { attachments: true },
                        orderBy: { createdAt: 'asc' },
                    },
                },
            })
            if (!inq) {
                res.status(404).json({ code: 'NOT_FOUND', message: 'Not Found' })
                return
            }
            res.status(200).json({
                ...serializeInquiry(inq),
                user: inq.user,
                contactEmail: inq.contactEmail,
                assignee: inq.assignee
                    ? {
                        id: inq.assignee.id,
                        displayName: inq.assignee.displayName,
                        email: inq.assignee.email,
                    }
                    : null,
            })
        } catch (err) {
            next(err)
        }
    },

    /** PATCH /v1/admin/inquiries/:id/status — ステータス変更 */
    async updateStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params
            const schema = z.object({
                status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
            })
            const { status } = schema.parse(req.body)

            const updated = await prisma.inquiry.update({
                where: { id },
                data: {
                    status,
                    resolvedAt: status === 'RESOLVED' ? new Date() : undefined,
                    lastActivityAt: new Date(),
                },
                select: { id: true, status: true, resolvedAt: true },
            })
            res.status(200).json(updated)
        } catch (err) {
            next(err)
        }
    },

    /** POST /v1/admin/inquiries/:id/messages — 運営返信 */
    async addOperatorMessage(req: Request, res: Response, next: NextFunction) {
        try {
            const operatorUserId = req.user!.userId
            const { id } = req.params
            const input = addMessageSchema.parse(req.body)

            const inq = await prisma.inquiry.findUnique({
                where: { id },
                select: { id: true, userId: true, status: true, title: true },
            })
            if (!inq) {
                res.status(404).json({ code: 'NOT_FOUND', message: 'Not Found' })
                return
            }

            const message = await prisma.inquiryMessage.create({
                data: {
                    inquiryId: id,
                    authorType: 'OPERATOR',
                    authorUserId: operatorUserId,
                    body: input.body,
                    attachments: {
                        create: input.attachmentKeys.map((a) => ({
                            storageKey: a.storageKey,
                            fileName: a.fileName,
                            mimeType: a.mimeType,
                            sizeBytes: a.sizeBytes,
                            scanStatus: 'PENDING',
                        })),
                    },
                },
                include: { attachments: true },
            })

            // OPEN → IN_PROGRESS に自動遷移
            const newStatus = inq.status === 'OPEN' ? 'IN_PROGRESS' : inq.status
            await prisma.inquiry.update({
                where: { id },
                data: {
                    lastActivityAt: new Date(),
                    status: newStatus,
                },
            })

            // 副作用: ユーザーへのアプリ内通知
            if (inq.userId) {
                notifyUserOfOperatorReply({
                    userId: inq.userId,
                    inquiryId: id,
                    inquiryTitle: inq.title,
                }).catch((err) =>
                    console.warn('[inquiry] アプリ内通知失敗（無視して継続）:', err),
                )
            }

            res.status(201).json({
                id: message.id,
                authorType: message.authorType,
                body: message.body,
                createdAt: message.createdAt.toISOString(),
                attachments: message.attachments.map((a) => ({
                    id: a.id,
                    fileName: a.fileName,
                    mimeType: a.mimeType,
                    sizeBytes: a.sizeBytes,
                    scanStatus: a.scanStatus,
                })),
            })
        } catch (err) {
            next(err)
        }
    },

    /** PATCH /v1/admin/inquiries/:id/assignee — 担当オペレーターを設定/解除 (Wave6 Phase 9b-16) */
    async updateAssignee(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params
            const schema = z.object({
                assigneeUserId: z.string().uuid().nullable(),
            })
            const { assigneeUserId } = schema.parse(req.body)

            // 設定する場合は SystemAdmin (OPERATOR / SUPER_ADMIN) であることを検証
            if (assigneeUserId !== null) {
                const target = await prisma.user.findUnique({
                    where: { id: assigneeUserId },
                    select: { id: true, systemRole: true, deletedAt: true },
                })
                if (!target || target.deletedAt || (target.systemRole !== 'OPERATOR' && target.systemRole !== 'SUPER_ADMIN')) {
                    res.status(400).json({
                        code: 'INVALID_ASSIGNEE',
                        message: '担当者は SystemAdmin (OPERATOR / SUPER_ADMIN) である必要があります',
                    })
                    return
                }
            }

            const updated = await prisma.inquiry.update({
                where: { id },
                data: { assigneeUserId, lastActivityAt: new Date() },
                include: {
                    assignee: { select: { id: true, displayName: true, email: true } },
                },
            })
            res.status(200).json({
                id: updated.id,
                assignee: updated.assignee
                    ? {
                        id: updated.assignee.id,
                        displayName: updated.assignee.displayName,
                        email: updated.assignee.email,
                    }
                    : null,
            })
        } catch (err) {
            next(err)
        }
    },

    /** GET /v1/admin/system-admins — SystemAdmin ユーザー一覧（担当プルダウン用） */
    async listSystemAdmins(_req: Request, res: Response, next: NextFunction) {
        try {
            const users = await prisma.user.findMany({
                where: {
                    systemRole: { in: ['OPERATOR', 'SUPER_ADMIN'] },
                    deletedAt: null,
                },
                select: { id: true, displayName: true, email: true, systemRole: true },
                orderBy: [{ systemRole: 'asc' }, { displayName: 'asc' }],
            })
            res.status(200).json({ users })
        } catch (err) {
            next(err)
        }
    },
}
