import { usecaseFactory } from '@/api/_usecaseFactory.js'
import type { NextFunction, Request, Response } from 'express'

export const membershipController = {
    async addMember(req: Request, res: Response, next: NextFunction) {
        try {
            const { id: communityId } = req.params
            const { userId: targetUserId } = req.body
            const requesterId = req.user!.userId

            const useCase = usecaseFactory.createAddMemberUseCase()
            const result = await useCase.execute({
                communityId,
                targetUserId,
                requesterId,
            })

            res.status(201).json(result)
        } catch (err) {
            next(err)
        }
    },

    async listMembers(req: Request, res: Response, next: NextFunction) {
        try {
            const { id: communityId } = req.params

            const useCase = usecaseFactory.createListMembersUseCase()
            const result = await useCase.execute({ communityId })

            res.status(200).json(result)
        } catch (err) {
            next(err)
        }
    },

    async changeRole(req: Request, res: Response, next: NextFunction) {
        try {
            const { id: communityId, userId: targetUserId } = req.params
            const { role: newRole, propagateToChildren } = req.body
            const requesterId = req.user!.userId

            const useCase = usecaseFactory.createChangeMemberRoleUseCase()
            await useCase.execute({
                communityId,
                targetUserId,
                requesterId,
                newRole,
                propagateToChildren,
            })

            res.status(204).send()
        } catch (err) {
            next(err)
        }
    },

    async changeLevel(req: Request, res: Response, next: NextFunction) {
        try {
            const { id: communityId, userId: targetUserId } = req.params
            const { level: newLevel } = req.body
            const requesterId = req.user!.userId

            const useCase = usecaseFactory.createUpdateMemberLevelUseCase()
            await useCase.execute({
                communityId,
                targetUserId,
                requesterId,
                newLevel,
            })

            res.status(204).send()
        } catch (err) {
            next(err)
        }
    },

    async leave(req: Request, res: Response, next: NextFunction) {
        try {
            const { id: communityId } = req.params
            const userId = req.user!.userId
            const { cascadeToChildren } = req.body ?? {}

            const useCase = usecaseFactory.createLeaveCommunityUseCase()
            await useCase.execute({ communityId, userId, cascadeToChildren })

            res.status(204).send()
        } catch (err) {
            next(err)
        }
    },

    async removeMember(req: Request, res: Response, next: NextFunction) {
        try {
            const { id: communityId, userId: targetUserId } = req.params
            const requesterId = req.user!.userId

            const useCase = usecaseFactory.createRemoveMemberUseCase()
            await useCase.execute({ communityId, targetUserId, requesterId })

            res.status(204).send()
        } catch (err) {
            next(err)
        }
    },
}
