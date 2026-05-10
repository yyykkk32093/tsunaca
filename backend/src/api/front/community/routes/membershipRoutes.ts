import { authMiddleware } from '@/api/middleware/authMiddleware.js'
import { validateBody } from '@/api/middleware/validateBody.js'
import { addMemberSchema, changeMemberRoleSchema, updateMembershipLevelSchema } from '@/api/schemas/index.js'
import { Router } from 'express'
import { membershipController } from '../controllers/membershipController.js'

const router = Router()

router.post('/v1/communities/:id/members', authMiddleware, validateBody(addMemberSchema), membershipController.addMember)
router.get('/v1/communities/:id/members', authMiddleware, membershipController.listMembers)
router.patch('/v1/communities/:id/members/:userId', authMiddleware, validateBody(changeMemberRoleSchema), membershipController.changeRole)
router.patch('/v1/communities/:id/members/:userId/level', authMiddleware, validateBody(updateMembershipLevelSchema), membershipController.changeLevel)
router.delete('/v1/communities/:id/members/me', authMiddleware, membershipController.leave)
router.delete('/v1/communities/:id/members/:userId', authMiddleware, membershipController.removeMember)

export default router
