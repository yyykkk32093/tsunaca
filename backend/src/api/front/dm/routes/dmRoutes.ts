import { usecaseFactory } from '@/api/_usecaseFactory.js';
import { authMiddleware } from '@/api/middleware/authMiddleware.js';
import { requireFeature } from '@/api/middleware/featureGateMiddleware.js';
import { validateBody } from '@/api/middleware/validateBody.js';
import { createDMSchema } from '@/api/schemas/index.js';
import { UserFeature } from '@/domains/_sharedDomains/featureGate/UserFeature.js';
import { DMParticipantNotFoundError } from '@/domains/chat/infrastructure/repository/DMChannelRepositoryImpl.js';
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';

const router = Router();

/**
 * POST /v1/dm/channels
 * DM チャンネル作成（PRO/LIFETIME のみ新規開始可能）
 */
router.post('/v1/dm/channels', authMiddleware, requireFeature(UserFeature.DM_CREATE), validateBody(createDMSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.userId;
        const { participantIds } = req.body as { participantIds: string[] };

        if (!participantIds || participantIds.length === 0) {
            res.status(400).json({ code: 'INVALID_REQUEST', message: '参加者が必要です' });
            return;
        }

        const useCase = usecaseFactory.createCreateDMChannelUseCase();
        const result = await useCase.execute({ userId, participantIds });

        res.status(result.alreadyExisted ? 200 : 201).json({
            channelId: result.channelId,
            type: 'DM',
            participants: result.participants,
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /v1/dm/channels
 * 自分のDMチャンネル一覧
 */
router.get('/v1/dm/channels', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.userId;
        const useCase = usecaseFactory.createListDMChannelsUseCase();
        const items = await useCase.execute(userId);

        const channels = items.map((d) => ({
            channelId: d.channelId,
            participants: d.participants,
            lastMessage: d.lastMessage
                ? {
                    id: d.lastMessage.id,
                    senderId: d.lastMessage.senderId,
                    content: d.lastMessage.content,
                    createdAt: d.lastMessage.createdAt.toISOString(),
                }
                : null,
        }));

        res.json({ channels });
    } catch (err) {
        next(err);
    }
});

/**
 * DELETE /v1/dm/channels/:channelId/leave
 * DM チャンネルから退出（DMParticipant を物理削除）
 */
router.delete('/v1/dm/channels/:channelId/leave', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.userId;
        const { channelId } = req.params;

        const useCase = usecaseFactory.createLeaveDMChannelUseCase();
        await useCase.execute({ userId, channelId });

        res.status(204).send();
    } catch (err) {
        if (err instanceof DMParticipantNotFoundError) {
            res.status(404).json({ code: 'NOT_FOUND', message: 'このDMチャンネルに参加していません' });
            return;
        }
        next(err);
    }
});

export default router;
