import { authMiddleware } from '@/api/middleware/authMiddleware.js'
import { validateBody } from '@/api/middleware/validateBody.js'
import { cancelOrDeleteScheduleSchema, createScheduleSchema, updateScheduleSchema } from '@/api/schemas/index.js'
import { Router } from 'express'
import { scheduleController } from '../controllers/scheduleController.js'

const router = Router()

// Activity 配下の Schedule 作成/一覧
router.post('/v1/activities/:activityId/schedules', authMiddleware, validateBody(createScheduleSchema), scheduleController.create)
router.get('/v1/activities/:activityId/schedules', authMiddleware, scheduleController.list)

// Schedule 単体操作
router.get('/v1/schedules/:id', authMiddleware, scheduleController.findById)
router.patch('/v1/schedules/:id', authMiddleware, validateBody(updateScheduleSchema), scheduleController.update)
router.patch('/v1/schedules/:id/cancel', authMiddleware, scheduleController.cancel)
router.post('/v1/schedules/:id/restore', authMiddleware, scheduleController.restore)
router.patch('/v1/schedules/:id/cancel-or-delete', authMiddleware, validateBody(cancelOrDeleteScheduleSchema), scheduleController.cancelOrDelete)

export default router
