import { prisma } from '@/_sharedTech/db/client.js'
import { usecaseFactory } from '@/api/_usecaseFactory.js'
import type { NextFunction, Request, Response } from 'express'

export const chatController = {
    // ================================================================
    // Channel
    // ================================================================

    async getCommunityChannel(req: Request, res: Response, next: NextFunction) {
        try {
            const { communityId } = req.params
            const userId = req.user!.userId

            // メンバーシップ確認（API 層の責務）
            const membership = await prisma.communityMembership.findUnique({
                where: { communityId_userId: { communityId, userId } },
            })
            if (!membership || membership.leftAt) {
                res.status(403).json({ code: 'FORBIDDEN', message: 'コミュニティメンバーではありません' })
                return
            }

            const useCase = usecaseFactory.createGetOrCreateCommunityChannelUseCase()
            const result = await useCase.execute({ communityId, userId })
            res.json(result)
        } catch (err) {
            next(err)
        }
    },

    async getActivityChannel(req: Request, res: Response, next: NextFunction) {
        try {
            const { activityId } = req.params
            const userId = req.user!.userId

            // アクティビティ存在確認
            const activity = await prisma.activity.findUnique({ where: { id: activityId } })
            if (!activity || activity.deletedAt) {
                res.status(404).json({ code: 'NOT_FOUND', message: 'アクティビティが見つかりません' })
                return
            }

            // メンバーシップ確認
            const membership = await prisma.communityMembership.findUnique({
                where: { communityId_userId: { communityId: activity.communityId, userId } },
            })
            if (!membership || membership.leftAt) {
                res.status(403).json({ code: 'FORBIDDEN', message: 'コミュニティメンバーではありません' })
                return
            }

            const useCase = usecaseFactory.createGetOrCreateActivityChannelUseCase()
            const result = await useCase.execute({ activityId, userId })
            res.json(result)
        } catch (err) {
            next(err)
        }
    },

    // ================================================================
    // Messages
    // ================================================================

    async listMessages(req: Request, res: Response, next: NextFunction) {
        try {
            const { channelId } = req.params
            const userId = req.user!.userId
            const cursor = req.query.cursor as string | undefined
            const limit = req.query.limit ? Number(req.query.limit) : undefined

            const useCase = usecaseFactory.createListChannelMessagesUseCase()
            const result = await useCase.execute({ channelId, currentUserId: userId, cursor, limit })
            res.json(result)
        } catch (err) {
            next(err)
        }
    },

    async searchMessages(req: Request, res: Response, next: NextFunction) {
        try {
            const { channelId } = req.params
            const userId = req.user!.userId
            const q = req.query.q as string | undefined
            const cursor = req.query.cursor as string | undefined
            const limit = req.query.limit ? Number(req.query.limit) : undefined

            const useCase = usecaseFactory.createSearchChannelMessagesUseCase()
            const result = await useCase.execute({
                channelId,
                currentUserId: userId,
                query: q ?? '',
                cursor,
                limit,
            })
            res.json(result)
        } catch (err) {
            next(err)
        }
    },

    async getReplies(req: Request, res: Response, next: NextFunction) {
        try {
            const { messageId } = req.params
            const userId = req.user!.userId
            const cursor = req.query.cursor as string | undefined
            const limit = req.query.limit ? Number(req.query.limit) : undefined

            const useCase = usecaseFactory.createGetThreadRepliesUseCase()
            const result = await useCase.execute({
                parentMessageId: messageId,
                currentUserId: userId,
                cursor,
                limit,
            })
            res.json(result)
        } catch (err) {
            next(err)
        }
    },

    async sendMessage(req: Request, res: Response, next: NextFunction) {
        try {
            const { channelId } = req.params
            const userId = req.user!.userId
            const { content, parentMessageId, mentions } = req.body

            // ユーザー情報取得（WS broadcast ペイロード用）
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { displayName: true, avatarUrl: true },
            })

            const useCase = usecaseFactory.createSendMessageUseCase()
            const result = await useCase.execute({
                channelId,
                senderId: userId,
                senderDisplayName: user?.displayName ?? null,
                senderAvatarUrl: user?.avatarUrl ?? null,
                content,
                parentMessageId,
                mentions,
            })

            // WS broadcast
            const io = req.app.get('io')
            if (io) {
                if (result.type === 'thread_reply') {
                    io.to(`channel:${channelId}`).emit('thread:new', {
                        reply: {
                            id: result.message.id,
                            channelId: result.message.channelId,
                            senderId: result.message.senderId,
                            senderDisplayName: result.senderDisplayName,
                            senderAvatarUrl: result.senderAvatarUrl,
                            parentMessageId: result.parentMessageId,
                            content: result.message.content,
                            mentions: result.message.mentions,
                            isPinned: result.message.isPinned,
                            attachments: [],
                            reactions: [],
                            createdAt: result.message.createdAt.toISOString(),
                        },
                        parentMessageId: result.parentMessageId,
                        replyCount: result.replyCount,
                    })
                } else {
                    io.to(`channel:${channelId}`).emit('message:new', {
                        id: result.message.id,
                        channelId: result.message.channelId,
                        senderId: result.message.senderId,
                        senderDisplayName: result.senderDisplayName,
                        senderAvatarUrl: result.senderAvatarUrl,
                        parentMessageId: result.message.parentMessageId,
                        content: result.message.content,
                        mentions: result.message.mentions,
                        isPinned: result.message.isPinned,
                        attachments: [],
                        reactions: [],
                        replyCount: 0,
                        createdAt: result.message.createdAt.toISOString(),
                    })
                }
            }

            res.status(201).json({ messageId: result.message.id })
        } catch (err) {
            next(err)
        }
    },

    async deleteMessage(req: Request, res: Response, next: NextFunction) {
        try {
            const { messageId } = req.params
            const userId = req.user!.userId

            const useCase = usecaseFactory.createDeleteMessageUseCase()
            const result = await useCase.execute({ messageId, userId })

            if (result.alreadyDeleted) {
                res.status(204).send()
                return
            }

            // WS broadcast
            const io = req.app.get('io')
            if (io) {
                io.to(`channel:${result.channelId}`).emit('message:deleted', {
                    messageId,
                    channelId: result.channelId,
                })
            }

            res.status(204).send()
        } catch (err) {
            next(err)
        }
    },

    // ================================================================
    // W5-25: Community channel tree + unread
    // ================================================================

    async getCommunityChannelTree(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId
            const useCase = usecaseFactory.createGetCommunityChannelTreeUseCase()
            const result = await useCase.execute(userId)
            res.json(result)
        } catch (err) {
            next(err)
        }
    },

    async markChannelRead(req: Request, res: Response, next: NextFunction) {
        try {
            const { channelId } = req.params
            const userId = req.user!.userId
            const useCase = usecaseFactory.createMarkChannelReadUseCase()
            await useCase.execute({ channelId, userId })
            res.status(204).send()
        } catch (err) {
            next(err)
        }
    },
}
