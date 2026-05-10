import { prisma } from '@/_sharedTech/db/client.js'
import { usecaseFactory } from '@/api/_usecaseFactory.js'
import type { NextFunction, Request, Response } from 'express'

export const communityController = {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const {
                name, description,
                joinMethod, isPublic, maxMembers,
                activityFrequency,
                targetGender,
                ageMin, ageMax,
                categoryIds, recommendedLevelMin, recommendedLevelMax,
                activityDays, tags, locations,
            } = req.body
            const userId = req.user!.userId

            const useCase = usecaseFactory.createCreateCommunityUseCase()
            const result = await useCase.execute({
                name, description, userId,
                joinMethod, isPublic, maxMembers,
                activityFrequency,
                targetGender,
                ageMin, ageMax,
                categoryIds, recommendedLevelMin, recommendedLevelMax,
                activityDays, tags, locations,
            })

            res.status(201).json(result)
        } catch (err) {
            next(err)
        }
    },

    async createChild(req: Request, res: Response, next: NextFunction) {
        try {
            const { parentId } = req.params
            const {
                name, description, inheritSettings, memberInheritance, selectedMemberIds,
                joinMethod, isPublic, maxMembers, targetGender, ageMin, ageMax,
                activityFrequency, activityDays, categoryIds,
                recommendedLevelMin, recommendedLevelMax, tags,
            } = req.body
            const userId = req.user!.userId

            const useCase = usecaseFactory.createCreateSubCommunityUseCase()
            const result = await useCase.execute({
                parentId, name, description, userId,
                inheritSettings, memberInheritance, selectedMemberIds,
                joinMethod, isPublic, maxMembers, targetGender, ageMin, ageMax,
                activityFrequency, activityDays, categoryIds,
                recommendedLevelMin, recommendedLevelMax, tags,
            })

            res.status(201).json(result)
        } catch (err) {
            next(err)
        }
    },

    async findById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params
            const viewerUserId = req.user?.userId ?? null

            const useCase = usecaseFactory.createFindCommunityUseCase()
            const result = await useCase.execute({ communityId: id, viewerUserId })

            res.status(200).json(result)
        } catch (err) {
            next(err)
        }
    },

    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId

            const useCase = usecaseFactory.createListCommunitiesUseCase()
            const result = await useCase.execute({ userId })

            // Phase 3 #53: ブックマーク状態を付与
            const bookmarks = await prisma.communityBookmark.findMany({
                where: { userId },
                select: { communityId: true },
            })
            const bookmarkedIds = new Set(bookmarks.map(b => b.communityId))

            const communities = result.communities.map(c => ({
                ...c,
                bookmarked: bookmarkedIds.has(c.id),
            }))

            res.status(200).json({ communities })
        } catch (err) {
            next(err)
        }
    },

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params
            const {
                name, description, logoUrl, coverUrl,
                payPayId, enabledPaymentMethods,
                reminderEnabled, cancellationAlertEnabled,
                joinMethod, isPublic, activityFrequency,
                targetGender,
                ageMin, ageMax, categoryIds,
                recommendedLevelMin, recommendedLevelMax,
                tags, locations,
            } = req.body
            const userId = req.user!.userId

            const useCase = usecaseFactory.createUpdateCommunityUseCase()
            await useCase.execute({
                communityId: id, userId,
                name, description, logoUrl, coverUrl,
                payPayId, enabledPaymentMethods,
                reminderEnabled, cancellationAlertEnabled,
                joinMethod, isPublic, activityFrequency,
                targetGender,
                ageMin, ageMax, categoryIds,
                recommendedLevelMin, recommendedLevelMax,
                tags, locations,
            })

            res.status(204).send()
        } catch (err) {
            next(err)
        }
    },

    async softDelete(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params
            const userId = req.user!.userId

            const useCase = usecaseFactory.createSoftDeleteCommunityUseCase()
            await useCase.execute({ communityId: id, userId })

            res.status(204).send()
        } catch (err) {
            next(err)
        }
    },

    // ---- Phase 2.5: 検索・公開詳細・参加 ----

    async search(req: Request, res: Response, next: NextFunction) {
        try {
            const { keyword, categoryIds, levelIds, area, days, targetGender, joinMethod, limit, offset } = req.query
            const useCase = usecaseFactory.createSearchCommunitiesUseCase()
            const result = await useCase.execute({
                keyword: keyword as string | undefined,
                categoryIds: categoryIds ? (Array.isArray(categoryIds) ? categoryIds as string[] : [categoryIds as string]) : undefined,
                levelIds: levelIds ? (Array.isArray(levelIds) ? levelIds as string[] : [levelIds as string]) : undefined,
                area: area as string | undefined,
                days: days ? (Array.isArray(days) ? days as string[] : [days as string]) : undefined,
                targetGender: targetGender ? (Array.isArray(targetGender) ? targetGender as string[] : [targetGender as string]) : undefined,
                joinMethod: joinMethod as string | undefined,
                limit: limit ? Number(limit) : undefined,
                offset: offset ? Number(offset) : undefined,
            })
            res.status(200).json(result)
        } catch (err) {
            next(err)
        }
    },

    async findPublicById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params
            const useCase = usecaseFactory.createFindPublicCommunityUseCase()
            const result = await useCase.execute({ communityId: id })
            res.status(200).json(result)
        } catch (err) {
            next(err)
        }
    },

    async join(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params
            const userId = req.user!.userId
            const useCase = usecaseFactory.createJoinCommunityUseCase()
            const result = await useCase.execute({ communityId: id, userId })
            res.status(201).json(result)
        } catch (err) {
            next(err)
        }
    },

    async requestJoin(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params
            const userId = req.user!.userId
            const { message } = req.body
            const useCase = usecaseFactory.createRequestJoinCommunityUseCase()
            const result = await useCase.execute({ communityId: id, userId, message })
            res.status(201).json(result)
        } catch (err) {
            next(err)
        }
    },

    async listChildren(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params
            const useCase = usecaseFactory.createListSubCommunitiesUseCase()
            const result = await useCase.execute({ parentId: id, viewerUserId: req.user?.userId ?? null })
            res.status(200).json(result)
        } catch (err) {
            next(err)
        }
    },

    async listAuditLogs(req: Request, res: Response, next: NextFunction) {
        try {
            const { id: communityId } = req.params
            const limit = req.query.limit ? Number(req.query.limit) : undefined

            const useCase = usecaseFactory.createListCommunityAuditLogsUseCase()
            const result = await useCase.execute({ communityId, limit })

            res.status(200).json(result)
        } catch (err) {
            next(err)
        }
    },
}
