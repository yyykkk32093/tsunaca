import { usecaseFactory } from '@/api/_usecaseFactory.js'
import type { NextFunction, Request, Response } from 'express'

export const activityController = {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const { communityId } = req.params
            const { title, description, defaultPlaceId, defaultLocationCustom, defaultStartTime, defaultEndTime, recurrenceRule, date, participationFee, visitorFee, organizerUserId, isOnline, meetingUrl, capacity, shouldPostAnnouncement, allowVisitorWaitlist, visibility, recurrenceGenerationMonths } = req.body
            const userId = req.user!.userId

            const useCase = usecaseFactory.createCreateActivityUseCase()
            const result = await useCase.execute({
                communityId,
                title,
                description,
                defaultPlaceId: defaultPlaceId ?? null,
                defaultLocationCustom: defaultLocationCustom ?? null,
                defaultStartTime,
                defaultEndTime,
                recurrenceRule,
                date,
                participationFee: participationFee != null ? Number(participationFee) : null,
                visitorFee: visitorFee != null ? Number(visitorFee) : null,
                organizerUserId: organizerUserId || null,
                isOnline: isOnline ?? false,
                meetingUrl: meetingUrl || null,
                capacity: capacity != null ? Number(capacity) : null,
                userId,
                allowVisitorWaitlist: allowVisitorWaitlist ?? false,
                visibility: visibility as 'PUBLIC' | 'PRIVATE' | undefined,
                shouldPostAnnouncement: shouldPostAnnouncement ?? false,
                recurrenceGenerationMonths: recurrenceGenerationMonths != null ? Number(recurrenceGenerationMonths) : undefined,
            })

            res.status(201).json(result)
        } catch (err) {
            next(err)
        }
    },

    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const { communityId } = req.params

            const useCase = usecaseFactory.createListActivitiesUseCase()
            const result = await useCase.execute({ communityId })

            res.status(200).json(result)
        } catch (err) {
            next(err)
        }
    },

    async findById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params
            const viewerUserId = req.user?.userId ?? null

            const useCase = usecaseFactory.createFindActivityUseCase()
            const result = await useCase.execute({ activityId: id, viewerUserId })

            res.status(200).json(result)
        } catch (err) {
            next(err)
        }
    },

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params
            const { title, description, defaultPlaceId, defaultLocationCustom, isOnline, defaultStartTime, defaultEndTime, recurrenceRule, organizerUserId, defaultParticipationFee, defaultVisitorFee, defaultCapacity, allowVisitorWaitlist, visibility, recurrenceGenerationMonths } = req.body
            const userId = req.user!.userId

            const useCase = usecaseFactory.createUpdateActivityUseCase()
            await useCase.execute({
                activityId: id,
                userId,
                title,
                description,
                defaultPlaceId,
                defaultLocationCustom,
                isOnline,
                defaultStartTime,
                defaultEndTime,
                defaultParticipationFee: defaultParticipationFee !== undefined
                    ? (defaultParticipationFee != null ? Number(defaultParticipationFee) : null)
                    : undefined,
                defaultVisitorFee: defaultVisitorFee !== undefined
                    ? (defaultVisitorFee != null ? Number(defaultVisitorFee) : null)
                    : undefined,
                defaultCapacity: defaultCapacity !== undefined
                    ? (defaultCapacity != null ? Number(defaultCapacity) : null)
                    : undefined,
                allowVisitorWaitlist: allowVisitorWaitlist !== undefined ? allowVisitorWaitlist : undefined,
                visibility: visibility as 'PUBLIC' | 'PRIVATE' | undefined,
                recurrenceRule,
                organizerUserId: organizerUserId !== undefined ? (organizerUserId || null) : undefined,
                recurrenceGenerationMonths: recurrenceGenerationMonths != null ? Number(recurrenceGenerationMonths) : undefined,
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
            const notifyOption = req.body?.notifyOption ?? 'none'

            const useCase = usecaseFactory.createSoftDeleteActivityUseCase()
            await useCase.execute({ activityId: id, userId, notifyOption })

            res.status(204).send()
        } catch (err) {
            next(err)
        }
    },

    async changeOrganizer(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params
            const { organizerUserId } = req.body
            const userId = req.user!.userId

            const useCase = usecaseFactory.createUpdateActivityUseCase()
            await useCase.execute({
                activityId: id,
                userId,
                organizerUserId: organizerUserId || null,
            })

            res.status(204).send()
        } catch (err) {
            next(err)
        }
    },
}
