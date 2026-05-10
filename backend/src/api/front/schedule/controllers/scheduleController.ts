import { usecaseFactory } from '@/api/_usecaseFactory.js'
import type { NextFunction, Request, Response } from 'express'

export const scheduleController = {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const { activityId } = req.params
            const { date, startTime, endTime, location, note, capacity, participationFee, visitorFee, isOnline, meetingUrl } = req.body
            const userId = req.user!.userId

            const useCase = usecaseFactory.createCreateScheduleUseCase()
            const result = await useCase.execute({
                activityId,
                date,
                startTime,
                endTime,
                location,
                note,
                capacity,
                participationFee: participationFee ?? 0,
                visitorFee: visitorFee ?? null,
                isOnline,
                meetingUrl,
                userId,
            })

            res.status(201).json(result)
        } catch (err) {
            next(err)
        }
    },

    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const { activityId } = req.params
            const viewerUserId = req.user?.userId ?? null

            const useCase = usecaseFactory.createListSchedulesUseCase()
            const result = await useCase.execute({ activityId, viewerUserId })

            res.status(200).json(result)
        } catch (err) {
            next(err)
        }
    },

    async findById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params
            const userId = req.user?.userId

            const useCase = usecaseFactory.createFindScheduleUseCase()
            const result = await useCase.execute({ scheduleId: id, userId })

            res.status(200).json(result)
        } catch (err) {
            next(err)
        }
    },

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params
            const { date, startTime, endTime, location, note, capacity, participationFee, visitorFee, isOnline, meetingUrl } = req.body
            const userId = req.user!.userId

            const useCase = usecaseFactory.createUpdateScheduleUseCase()
            await useCase.execute({
                scheduleId: id,
                userId,
                date,
                startTime,
                endTime,
                location,
                note,
                capacity,
                participationFee: participationFee !== undefined ? (participationFee ?? 0) : undefined,
                visitorFee: visitorFee !== undefined ? (visitorFee ?? null) : undefined,
                isOnline,
                meetingUrl,
            })

            res.status(204).send()
        } catch (err) {
            next(err)
        }
    },

    async cancel(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params
            const userId = req.user!.userId

            const useCase = usecaseFactory.createCancelScheduleUseCase()
            await useCase.execute({ scheduleId: id, userId })

            res.status(204).send()
        } catch (err) {
            next(err)
        }
    },

    async restore(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params
            const userId = req.user!.userId

            const useCase = usecaseFactory.createRestoreScheduleUseCase()
            await useCase.execute({ scheduleId: id, userId })

            res.status(204).send()
        } catch (err) {
            next(err)
        }
    },

    async cancelOrDelete(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params
            const userId = req.user!.userId
            const { operation, scope, notifyOption } = req.body

            const useCase = usecaseFactory.createCancelOrDeleteScheduleUseCase()
            const result = await useCase.execute({
                scheduleId: id,
                userId,
                operation,
                scope,
                notifyOption: notifyOption ?? 'push_only',
            })

            res.status(200).json({ activityDeleted: result.activityDeleted })
        } catch (err) {
            next(err)
        }
    },
}
