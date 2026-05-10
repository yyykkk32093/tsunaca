import { authMiddleware } from '@/api/middleware/authMiddleware.js'
import { validateBody } from '@/api/middleware/validateBody.js'
import { sendMessageSchema } from '@/api/schemas/index.js'
import { Router } from 'express'
import { chatController } from '../controllers/chatController.js'

const router = Router()

// ---- Channel ----
router.get('/v1/communities/:communityId/channel', authMiddleware, chatController.getCommunityChannel)
router.get('/v1/activities/:activityId/channel', authMiddleware, chatController.getActivityChannel)

// ---- Messages ----
router.get('/v1/channels/:channelId/messages/search', authMiddleware, chatController.searchMessages)
router.get('/v1/channels/:channelId/messages', authMiddleware, chatController.listMessages)
router.post('/v1/channels/:channelId/messages', authMiddleware, validateBody(sendMessageSchema), chatController.sendMessage)

// ---- Thread replies ----
router.get('/v1/messages/:messageId/replies', authMiddleware, chatController.getReplies)

// ---- Message actions ----
router.delete('/v1/messages/:messageId', authMiddleware, chatController.deleteMessage)

// ---- W5-25: Community channel tree + unread ----
router.get('/v1/channels/community-tree', authMiddleware, chatController.getCommunityChannelTree)
router.put('/v1/channels/:channelId/read', authMiddleware, chatController.markChannelRead)

export default router
