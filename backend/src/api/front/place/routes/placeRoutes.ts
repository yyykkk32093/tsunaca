import { authMiddleware } from '@/api/middleware/authMiddleware.js'
import { Router } from 'express'
import { placeController } from '../controllers/placeController.js'

const router = Router()

// 開催場所候補検索（Activity作成・編集フォームのCombobox用）
router.get('/v1/places/search', authMiddleware, placeController.search)

export default router
