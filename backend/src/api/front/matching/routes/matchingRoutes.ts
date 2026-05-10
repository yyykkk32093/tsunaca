import { authMiddleware } from '@/api/middleware/authMiddleware.js'
import {
    requireCommunityFeature,
    requireScheduleCommunityFeature,
} from '@/api/middleware/featureGateMiddleware.js'
import { validateBody } from '@/api/middleware/validateBody.js'
import {
    appendMatchingRoundsSchema,
    generateMatchingSchema,
    updateFixedPairsSchema,
    updateMatchingRoundSchema,
    updateMemberLevelSchema,
    updateVisitorLevelSchema,
} from '@/api/schemas/index.js'
import { Router } from 'express'
import { matchingController } from '../controllers/matchingController.js'

const router = Router()

const scheduleIdFromParams = (req: { params: Record<string, string> }) => req.params.id
const communityIdFromParams = (req: { params: Record<string, string> }) => req.params.communityId
const matchingGate = requireScheduleCommunityFeature('MATCHING', scheduleIdFromParams)
const matchingCommunityGate = requireCommunityFeature('MATCHING', communityIdFromParams)

router.get('/v1/schedules/:id/matching', authMiddleware, matchingGate, matchingController.get)
router.get('/v1/schedules/:id/matching/participant-levels', authMiddleware, matchingGate, matchingController.listParticipantLevels)
router.post('/v1/schedules/:id/matching', authMiddleware, matchingGate, validateBody(generateMatchingSchema), matchingController.generate)
router.post('/v1/schedules/:id/matching/append-rounds', authMiddleware, matchingGate, validateBody(appendMatchingRoundsSchema), matchingController.appendRounds)
router.patch('/v1/schedules/:id/matching/fixed-pairs', authMiddleware, matchingGate, validateBody(updateFixedPairsSchema), matchingController.updateFixedPairs)
router.patch('/v1/schedules/:id/matching/rounds/:roundNo', authMiddleware, matchingGate, validateBody(updateMatchingRoundSchema), matchingController.updateRound)
router.delete('/v1/schedules/:id/matching', authMiddleware, matchingGate, matchingController.remove)

router.get('/v1/communities/:communityId/category-match-formats', authMiddleware, matchingCommunityGate, matchingController.listCategoryMatchFormats)
router.patch('/v1/communities/:communityId/members/:userId/level', authMiddleware, validateBody(updateMemberLevelSchema), matchingController.updateMemberLevel)
router.patch('/v1/participations/:participationId/visitor-level', authMiddleware, validateBody(updateVisitorLevelSchema), matchingController.updateVisitorLevel)

export default router
