import { prisma } from '@/_sharedTech/db/client.js'
import { AppendMatchingRoundsUseCase } from '@/application/matching/usecase/AppendMatchingRoundsUseCase.js'
import { DeleteMatchingResultUseCase } from '@/application/matching/usecase/DeleteMatchingResultUseCase.js'
import { GenerateMatchingUseCase } from '@/application/matching/usecase/GenerateMatchingUseCase.js'
import { GetMatchingResultUseCase } from '@/application/matching/usecase/GetMatchingResultUseCase.js'
import { ListCategoryMatchFormatsUseCase } from '@/application/matching/usecase/ListCategoryMatchFormatsUseCase.js'
import { ListParticipantLevelsUseCase } from '@/application/matching/usecase/ListParticipantLevelsUseCase.js'
import { UpdateFixedPairsUseCase } from '@/application/matching/usecase/UpdateFixedPairsUseCase.js'
import { UpdateMemberLevelUseCase, UpdateVisitorLevelUseCase } from '@/application/matching/usecase/UpdateLevelsUseCase.js'
import { UpdateMatchingRoundUseCase } from '@/application/matching/usecase/UpdateMatchingRoundUseCase.js'
import type { NextFunction, Request, Response } from 'express'

const generateUseCase = new GenerateMatchingUseCase(prisma)
const getUseCase = new GetMatchingResultUseCase(prisma)
const appendUseCase = new AppendMatchingRoundsUseCase(prisma)
const deleteUseCase = new DeleteMatchingResultUseCase(prisma)
const listFormatsUseCase = new ListCategoryMatchFormatsUseCase(prisma)
const listParticipantLevelsUseCase = new ListParticipantLevelsUseCase(prisma)
const updateMemberLevelUseCase = new UpdateMemberLevelUseCase(prisma)
const updateVisitorLevelUseCase = new UpdateVisitorLevelUseCase(prisma)
const updateFixedPairsUseCase = new UpdateFixedPairsUseCase(prisma)
const updateMatchingRoundUseCase = new UpdateMatchingRoundUseCase(prisma)

export const matchingController = {
    async generate(req: Request, res: Response, next: NextFunction) {
        try {
            const { id: scheduleId } = req.params
            const userId = req.user!.userId
            const result = await generateUseCase.execute({
                scheduleId,
                userId,
                mode: req.body.mode,
                rounds: req.body.rounds,
                courtCount: req.body.courtCount,
                groupsPerCourt: req.body.groupsPerCourt,
                playersPerGroup: req.body.playersPerGroup,
                categoryId: req.body.categoryId,
                categoryName: req.body.categoryName,
                formatName: req.body.formatName,
                fixedPairs: req.body.fixedPairs,
            })

            res.status(201).json(result)
        } catch (err) {
            next(err)
        }
    },

    async get(req: Request, res: Response, next: NextFunction) {
        try {
            const { id: scheduleId } = req.params
            const userId = req.user!.userId
            const result = await getUseCase.execute({ scheduleId, userId })
            res.status(200).json(result)
        } catch (err) {
            next(err)
        }
    },

    async appendRounds(req: Request, res: Response, next: NextFunction) {
        try {
            const { id: scheduleId } = req.params
            const userId = req.user!.userId
            const result = await appendUseCase.execute({
                scheduleId,
                userId,
                addRounds: req.body.addRounds,
            })
            res.status(200).json(result)
        } catch (err) {
            next(err)
        }
    },

    async remove(req: Request, res: Response, next: NextFunction) {
        try {
            const { id: scheduleId } = req.params
            const userId = req.user!.userId
            await deleteUseCase.execute({ scheduleId, userId })
            res.status(204).send()
        } catch (err) {
            next(err)
        }
    },

    async listCategoryMatchFormats(req: Request, res: Response, next: NextFunction) {
        try {
            const { communityId } = req.params
            const result = await listFormatsUseCase.execute({ communityId })
            res.status(200).json(result)
        } catch (err) {
            next(err)
        }
    },

    async listParticipantLevels(req: Request, res: Response, next: NextFunction) {
        try {
            const { id: scheduleId } = req.params
            const userId = req.user!.userId
            const result = await listParticipantLevelsUseCase.execute({ scheduleId, userId })
            res.status(200).json(result)
        } catch (err) {
            next(err)
        }
    },

    async updateMemberLevel(req: Request, res: Response, next: NextFunction) {
        try {
            const { communityId, userId: targetUserId } = req.params
            const actorUserId = req.user!.userId
            await updateMemberLevelUseCase.execute({
                communityId,
                targetUserId,
                actorUserId,
                level: req.body.level,
            })
            res.status(204).send()
        } catch (err) {
            next(err)
        }
    },

    async updateVisitorLevel(req: Request, res: Response, next: NextFunction) {
        try {
            const { participationId } = req.params
            const actorUserId = req.user!.userId
            await updateVisitorLevelUseCase.execute({
                participationId,
                actorUserId,
                level: req.body.level,
            })
            res.status(204).send()
        } catch (err) {
            next(err)
        }
    },

    async updateFixedPairs(req: Request, res: Response, next: NextFunction) {
        try {
            const { id: scheduleId } = req.params
            const userId = req.user!.userId
            await updateFixedPairsUseCase.execute({
                scheduleId,
                userId,
                fixedPairs: req.body.fixedPairs,
            })
            res.status(204).send()
        } catch (err) {
            next(err)
        }
    },

    async updateRound(req: Request, res: Response, next: NextFunction) {
        try {
            const { id: scheduleId, roundNo } = req.params
            const userId = req.user!.userId
            await updateMatchingRoundUseCase.execute({
                scheduleId,
                userId,
                roundNo: Number(roundNo),
                round: { courts: req.body.courts },
            })
            res.status(204).send()
        } catch (err) {
            next(err)
        }
    },
}
