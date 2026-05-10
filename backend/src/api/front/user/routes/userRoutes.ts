import { Router } from 'express'

import { authMiddleware } from '@/api/middleware/authMiddleware.js'
import { validateBody } from '@/api/middleware/validateBody.js'
import { deleteUserSchema, signUpSchema, updateUserProfileSchema } from '@/api/schemas/index.js'
import { userController } from '../controllers/userController.js'

const router = Router()

/**
 * ユーザ登録 API
 * POST /v1/users
 */
router.post('/v1/users', validateBody(signUpSchema), userController.signUp)

// ---- UBL-32: マイページ ----
router.get('/v1/users/me/profile', authMiddleware, userController.getProfile)
router.patch('/v1/users/me', authMiddleware, validateBody(updateUserProfileSchema), userController.updateProfile)

// ---- 退会 ----
router.delete('/v1/users/me', authMiddleware, validateBody(deleteUserSchema), userController.deleteAccount)

// ---- Wave6 Phase 9b-05: ロケール ----
router.get('/v1/users/me/locale', authMiddleware, userController.getLocale)
router.patch('/v1/users/me/locale', authMiddleware, userController.updateLocale)

export default router
