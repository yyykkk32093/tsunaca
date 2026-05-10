import type { NextFunction, Request, Response } from 'express'

import { prisma } from '@/_sharedTech/db/client.js'
import { usecaseFactory } from '@/api/_usecaseFactory.js'
import { z } from 'zod/v4'

export const userController = {
    async signUp(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, password, displayName } = (req.body ?? {}) as {
                email?: unknown
                password?: unknown
                displayName?: unknown
            }

            if (typeof email !== 'string' || typeof password !== 'string') {
                return res.status(400).json({ message: 'email and password are required' })
            }

            const result = await usecaseFactory.createSignUpUserUseCase().execute({
                email,
                password,
                displayName:
                    typeof displayName === 'string' || displayName == null
                        ? displayName
                        : undefined,
            })

            return res.status(201).json(result)
        } catch (err) {
            next(err)
        }
    },

    // ---- UBL-32: マイページ ----

    async getProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId
            const useCase = usecaseFactory.createGetUserProfileUseCase()
            const result = await useCase.execute({ userId })
            res.status(200).json(result)
        } catch (err) {
            next(err)
        }
    },

    async updateProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId
            const { displayName, avatarUrl, biography } = req.body

            const useCase = usecaseFactory.createUpdateUserProfileUseCase()
            await useCase.execute({ userId, displayName, avatarUrl, biography })

            res.status(204).send()
        } catch (err) {
            next(err)
        }
    },

    // ---- 退会 ----

    async deleteAccount(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId
            const { reason, freeText } = req.body ?? {}
            const useCase = usecaseFactory.createDeleteUserUseCase()
            await useCase.execute({ userId, reason, freeText })

            // Cookie クリア（Web 向け）
            res.clearCookie('token', { httpOnly: true, sameSite: 'lax', path: '/' })
            res.status(204).send()
        } catch (err) {
            next(err)
        }
    },

    // ---- Wave6 Phase 9b-05: ロケール設定 ----

    async getLocale(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId
            const u = await prisma.user.findUnique({ where: { id: userId }, select: { locale: true } })
            res.status(200).json({ locale: u?.locale ?? null })
        } catch (err) {
            next(err)
        }
    },

    async updateLocale(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId
            const schema = z.object({ locale: z.enum(['ja', 'en']).nullable() })
            const { locale } = schema.parse(req.body)
            await prisma.user.update({ where: { id: userId }, data: { locale } })
            res.status(200).json({ locale })
        } catch (err) {
            next(err)
        }
    },
}
