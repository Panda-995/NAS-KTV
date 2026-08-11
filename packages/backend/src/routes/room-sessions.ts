import { Router, Request, Response } from 'express';
import logger from '../logger';
import * as roomService from '../services/room-service';
import { createAppError } from '../middleware/error';

const router = Router();

/**
 * POST /room-sessions - 加入房间（公开）
 * body: RoomSessionJoinParams { authorizationCode, nickname, avatar? }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { authorizationCode, joinToken, nickname, avatar } = req.body;

    if (!authorizationCode || typeof authorizationCode !== 'string') {
      return res
        .status(400)
        .json({ success: false, error: 'authorizationCode 不能为空' });
    }
    if (!nickname || typeof nickname !== 'string') {
      return res
        .status(400)
        .json({ success: false, error: 'nickname 不能为空' });
    }

    const session = await roomService.joinRoom({ authorizationCode, joinToken, nickname, avatar });

    res.json({
      success: true,
      data: {
        ...session,
        roomId: session.roomId,
        sessionId: session.id,
      },
    });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return res
        .status((error as any).statusCode)
        .json({ success: false, error: error.message });
    }
    // joinRoom 抛出的是业务错误（房间不存在/未激活），统一返回 400
    if (error instanceof Error) {
      return res.status(400).json({ success: false, error: error.message });
    }
    logger.error('Error joining room:', error);
    res.status(500).json({ success: false, error: 'Failed to join room' });
  }
});

/**
 * DELETE /room-sessions/:id - 离开房间（公开）
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid session id' });
    }

    const session = await roomService.leaveRoom(id);
    if (!session) {
      throw createAppError('会话不存在', 404);
    }

    res.json({ success: true, data: session });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return res
        .status((error as any).statusCode)
        .json({ success: false, error: error.message });
    }
    logger.error('Error leaving room:', error);
    res.status(500).json({ success: false, error: 'Failed to leave room' });
  }
});

export default router;
