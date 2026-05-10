import { usecaseFactory } from '@/api/_usecaseFactory.js'
import { searchPlaceQuerySchema } from '@/api/schemas/placeSchemas.js'
import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod/v4'

export const placeController = {
    async search(req: Request, res: Response, next: NextFunction) {
        try {
            const parsed = searchPlaceQuerySchema.parse(req.query)

            const useCase = usecaseFactory.createSearchPlaceUseCase()
            const result = await useCase.execute({
                query: parsed.q,
                limit: parsed.limit,
            })

            res.status(200).json(result)
        } catch (err) {
            if (err instanceof ZodError) {
                const fieldErrors = err.issues.map((issue) => ({
                    path: issue.path.length > 0 ? issue.path.join('.') : '(root)',
                    message: issue.message,
                }))
                return res.status(400).json({
                    code: 'VALIDATION_ERROR',
                    message: `バリデーションエラー: ${fieldErrors.map((e) => `[${e.path}] ${e.message}`).join('; ')}`,
                    errors: fieldErrors,
                })
            }
            next(err)
        }
    },
}
