import { usecaseFactory } from '@/api/_usecaseFactory.js'
import type { NextFunction, Request, Response } from 'express'

export const planController = {
    async listAvailablePlans(_req: Request, res: Response, next: NextFunction) {
        try {
            const useCase = usecaseFactory.createListAvailablePlansUseCase()
            const result = await useCase.execute()
            res.status(200).json(result)
        } catch (err) {
            next(err)
        }
    },

    async cancelSubscription(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user?.sub
            if (!userId) {
                res.status(401).json({ code: 'UNAUTHORIZED', message: '認証が必要です' })
                return
            }
            const useCase = usecaseFactory.createCancelSubscriptionUseCase()
            await useCase.execute({ userId })
            res.status(200).json({ message: 'サブスクリプションを解約しました' })
        } catch (err) {
            next(err)
        }
    },
}
