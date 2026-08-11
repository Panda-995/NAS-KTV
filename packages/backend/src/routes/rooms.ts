import { Router, Request, Response } from 'express';
import QRCode from 'qrcode';
import logger from '../logger';
import * as roomService from '../services/room-service';
import * as settingsService from '../services/settings-service';
import { authenticateToken } from '../middleware/jwt';
import { createAppError } from '../middleware/error';

const router = Router();

router.get('/h5-url', async (req: Request, res: Response) => {
  try {
    const row = await settingsService.getSetting('h5_base_url');
    const h5BaseUrl = row?.value || '';
    res.json({ success: true, data: { h5BaseUrl } });
  } catch (error) {
    logger.error('Error getting h5 url:', error);
    res.status(500).json({ success: false, error: 'Failed to get h5 url' });
  }
});

router.get('/qrcode', async (req: Request, res: Response) => {
  try {
    const data = req.query.data as string;
    if (!data) {
      return res.status(400).json({ success: false, error: 'data parameter is required' });
    }
    // 本地生成二维码 PNG（不依赖外部服务，NAS 无外网也可用）
    const buffer = await QRCode.toBuffer(data, { type: 'png', width: 300, margin: 1 });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(buffer);
  } catch (error) {
    logger.error('Error generating QR code:', error);
    res.status(500).json({ success: false, error: 'Failed to generate QR code' });
  }
});

/**
 * POST /rooms/register - TV 端注册设备并生成房间码（公开）
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { deviceId, name, deviceInfo } = req.body;

    if (!deviceId || typeof deviceId !== 'string') {
      return res
        .status(400)
        .json({ success: false, error: 'deviceId 不能为空' });
    }

    const room = await roomService.registerDevice(deviceId, name, deviceInfo);

    res.json({ success: true, data: room });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return res
        .status((error as any).statusCode)
        .json({ success: false, error: error.message });
    }
    logger.error('Error registering device:', error);
    res.status(500).json({ success: false, error: 'Failed to register device' });
  }
});

/**
 * POST /rooms/:id/join-ticket - TV 获取短期动态加入票据。
 * 同一房间签发新票据后，旧二维码立即失效。
 */
router.post('/:id/join-ticket', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { deviceId, forceRotate } = req.body ?? {};
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid room id' });
    }
    if (!deviceId || typeof deviceId !== 'string') {
      return res.status(400).json({ success: false, error: 'deviceId 不能为空' });
    }
    const ticket = await roomService.issueRoomJoinTicket(id, deviceId, forceRotate === true);
    res.json({ success: true, data: ticket });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return res
        .status((error as any).statusCode)
        .json({ success: false, error: error.message });
    }
    logger.error('Error issuing room join ticket:', error);
    res.status(500).json({ success: false, error: 'Failed to issue join ticket' });
  }
});

/**
 * POST /rooms/:id/rotate-code - TV 轮换房间授权码（公开，TV 设备身份校验）
 * TV 每次启动调用一次：生成新 6 位授权码，旧码作废，
 * 在线 H5 收到提示并回到加入页，离线 H5 用旧码重连将被拒绝。
 */
router.post('/:id/rotate-code', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { deviceId } = req.body ?? {};
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid room id' });
    }
    if (!deviceId || typeof deviceId !== 'string') {
      return res.status(400).json({ success: false, error: 'deviceId 不能为空' });
    }
    const room = await roomService.rotateRoomCode(id, String(deviceId));
    if (!room) {
      throw createAppError('房间不存在', 404);
    }
    res.json({ success: true, data: room });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return res
        .status((error as any).statusCode)
        .json({ success: false, error: error.message });
    }
    logger.error('Error rotating room code:', error);
    res.status(500).json({ success: false, error: 'Failed to rotate room code' });
  }
});

/**
 * GET /rooms/:code - 根据房间码查询房间状态（公开）
 */
router.get('/:code', async (req: Request, res: Response) => {
  try {
    const code = req.params.code;
    const room = await roomService.getRoomByCode(code);

    if (!room) {
      throw createAppError('房间不存在', 404);
    }

    const { deviceId: _deviceId, ...publicRoom } = room;
    res.json({ success: true, data: publicRoom });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return res
        .status((error as any).statusCode)
        .json({ success: false, error: error.message });
    }
    logger.error('Error getting room by code:', error);
    res.status(500).json({ success: false, error: 'Failed to get room' });
  }
});

/**
 * GET /rooms/:code/snapshot - 房间状态快照（重连恢复用，需 H5 会话或 TV 设备身份）
 *
 * 返回房间基础信息 + 当前队列 + 缓存的播放器状态。
 * 注意：播放器状态来自服务端内存缓存，重启后为 null；
 *       客户端主要应通过 WebSocket 连接建立时主动推送的 ROOM_STATE_SNAPSHOT 消息恢复，
 *       此 HTTP 接口作为备用方案。
 */
router.get('/:code/snapshot', async (req: Request, res: Response) => {
  try {
    const code = req.params.code;
    const room = await roomService.getRoomByCode(code);
    if (!room) {
      throw createAppError('房间不存在', 404);
    }
    const sessionToken = req.query.sessionToken;
    const deviceId = req.query.deviceId;
    if (typeof deviceId === 'string' && deviceId) {
      await roomService.assertTvRoomIdentity(room.id, deviceId);
    } else if (typeof sessionToken === 'string' && sessionToken) {
      await roomService.assertMobileRoomControl(room.id, sessionToken);
    } else {
      return res
        .status(400)
        .json({ success: false, error: 'sessionToken 或 deviceId 不能为空' });
    }
    const snapshot = await roomService.getRoomStateSnapshot(code, null);

    res.json({ success: true, data: snapshot });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return res
        .status((error as any).statusCode)
        .json({ success: false, error: error.message });
    }
    logger.error('Error getting room snapshot:', error);
    res.status(500).json({ success: false, error: 'Failed to get room snapshot' });
  }
});

/**
 * POST /rooms/:id/close - 管理员关闭房间
 */
router.post('/:id/close', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid room id' });
    }

    const room = await roomService.closeRoom(id);
    if (!room) {
      throw createAppError('房间不存在', 404);
    }

    // 触发 WebSocket 广播 ROOM_CLOSED（Task 4 集成时接入）

    res.json({ success: true, data: room });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return res
        .status((error as any).statusCode)
        .json({ success: false, error: error.message });
    }
    logger.error('Error closing room:', error);
    res.status(500).json({ success: false, error: 'Failed to close room' });
  }
});

/**
 * GET /rooms/:id/queue - 查询房间队列（需有效 H5 房间会话）
 */
router.get('/:id/queue', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid room id' });
    }

    const sessionToken = req.query.sessionToken;
    if (!sessionToken || typeof sessionToken !== 'string') {
      return res.status(400).json({ success: false, error: 'sessionToken 不能为空' });
    }
    await roomService.assertMobileRoomControl(id, sessionToken);
    const queue = await roomService.getQueue(id);
    res.json({ success: true, data: queue });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return res
        .status((error as any).statusCode)
        .json({ success: false, error: error.message });
    }
    logger.error('Error getting queue:', error);
    res.status(500).json({ success: false, error: 'Failed to get queue' });
  }
});

/**
 * POST /rooms/:id/queue - 加入队列（需有效 H5 房间会话）
 */
router.post('/:id/queue', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid room id' });
    }

    const { songId, sessionToken, nickname } = req.body;
    if (!songId || !sessionToken) {
      return res
        .status(400)
        .json({ success: false, error: 'songId 和 sessionToken 不能为空' });
    }

    const item = await roomService.addToQueue(id, {
      songId,
      sessionToken,
      nickname,
    });

    // 触发 WebSocket 广播 QUEUE_UPDATED（Task 4 集成时接入）

    res.json({ success: true, data: item });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return res
        .status((error as any).statusCode)
        .json({ success: false, error: error.message });
    }
    logger.error('Error adding to queue:', error);
    res.status(500).json({ success: false, error: 'Failed to add to queue' });
  }
});

/**
 * DELETE /rooms/:id/queue/played - 一键清除已播记录（需有效 H5 房间会话）
 */
router.delete('/:id/queue/played', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid room id' });
    }

    const { sessionToken } = req.body ?? {};
    if (!sessionToken) {
      return res.status(400).json({ success: false, error: 'sessionToken 不能为空' });
    }

    const removed = await roomService.clearPlayedQueue(id, String(sessionToken));
    res.json({ success: true, data: { removed } });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return res
        .status((error as any).statusCode)
        .json({ success: false, error: error.message });
    }
    logger.error('Error clearing played queue:', error);
    res.status(500).json({ success: false, error: 'Failed to clear played queue' });
  }
});

/**
 * DELETE /rooms/:id/queue/:queueItemId - 取消点歌（公开）
 * body: { sessionToken } 校验签名会话与队列项归属
 */
router.delete('/:id/queue/:queueItemId', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const queueItemId = parseInt(req.params.queueItemId);
    if (Number.isNaN(id) || Number.isNaN(queueItemId)) {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid room or queue item id' });
    }

    const sessionToken = req.body?.sessionToken;
    if (!sessionToken) {
      return res.status(400).json({ success: false, error: 'sessionToken 不能为空' });
    }
    const removed = await roomService.removeFromQueue(id, queueItemId, String(sessionToken));

    if (!removed) {
      return res
        .status(404)
        .json({ success: false, error: '队列项不存在' });
    }

    res.json({ success: true, data: removed });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return res
        .status((error as any).statusCode)
        .json({ success: false, error: error.message });
    }
    if (error instanceof Error) {
      return res
        .status(400)
        .json({ success: false, error: error.message });
    }
    logger.error('Error removing from queue:', error);
    res.status(500).json({ success: false, error: 'Failed to remove from queue' });
  }
});

/**
 * POST /rooms/:id/queue/insert-next - 置顶下一首（需有效 H5 房间会话）
 */
router.post(
  '/:id/queue/insert-next',
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) {
        return res
          .status(400)
          .json({ success: false, error: 'Invalid room id' });
      }

      const { songId, sessionToken } = req.body;
      if (!songId || !sessionToken) {
        return res
          .status(400)
          .json({ success: false, error: 'songId 和 sessionToken 不能为空' });
      }

      const item = await roomService.insertNext(id, {
        songId,
        sessionToken,
      });

      // 触发 WebSocket 广播 QUEUE_UPDATED（Task 4 集成时接入）

      res.json({ success: true, data: item });
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        return res
          .status((error as any).statusCode)
          .json({ success: false, error: error.message });
      }
      logger.error('Error inserting next:', error);
      res
        .status(500)
        .json({ success: false, error: 'Failed to insert next' });
    }
  }
);

/**
 * POST /rooms/:id/queue/:itemId/top - 顶歌（需有效 H5 房间会话）
 */
router.post(
  '/:id/queue/:itemId/top',
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const itemId = parseInt(req.params.itemId);
      if (Number.isNaN(id) || Number.isNaN(itemId)) {
        return res
          .status(400)
          .json({ success: false, error: 'Invalid id or itemId' });
      }

      const { sessionToken } = req.body;
      if (!sessionToken) {
        return res.status(400).json({ success: false, error: 'sessionToken 不能为空' });
      }

      const item = await roomService.topQueueItem(id, itemId, String(sessionToken));

      if (!item) {
        throw createAppError('队列项不存在', 404);
      }

      res.json({ success: true, data: item });
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        return res
          .status((error as any).statusCode)
          .json({ success: false, error: error.message });
      }
      if (error instanceof Error) {
        return res
          .status(400)
          .json({ success: false, error: error.message });
      }
      logger.error('Error topping queue item:', error);
      res
        .status(500)
        .json({ success: false, error: 'Failed to top queue item' });
    }
  }
);

/**
 * POST /rooms/:id/queue/:itemId/skip - 跳过队列项（H5 会话或 TV 设备身份）
 */
router.post(
  '/:id/queue/:itemId/skip',
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const itemId = parseInt(req.params.itemId);
      if (Number.isNaN(id) || Number.isNaN(itemId)) {
        return res
          .status(400)
          .json({ success: false, error: 'Invalid id or itemId' });
      }

      const { sessionToken, deviceId } = req.body ?? {};
      if (!sessionToken && !deviceId) {
        return res
          .status(400)
          .json({ success: false, error: 'sessionToken 或 deviceId 不能为空' });
      }

      const item = deviceId
        ? await roomService.skipQueueByDevice(id, itemId, String(deviceId))
        : await roomService.skipQueue(id, {
            queueItemId: itemId,
            sessionToken: String(sessionToken),
          });

      // item 为 null 表示该项已被其他客户端跳过（并发按「下一首」），
      // 视为幂等成功，避免前端报错并重复重试。
      res.json({ success: true, data: item });
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        return res
          .status((error as any).statusCode)
          .json({ success: false, error: error.message });
      }
      logger.error('Error skipping queue item:', error);
      res
        .status(500)
        .json({ success: false, error: 'Failed to skip queue item' });
    }
  }
);

/**
 * POST /rooms/:id/queue/:itemId/complete - 正常播完队列项（公开）
 *
 * 由 TV 端在歌曲自然结束时调用，落库 status='played'，
 * 与用户主动切歌的 'skipped' 区分开。
 */
router.post(
  '/:id/queue/:itemId/complete',
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const itemId = parseInt(req.params.itemId);
      if (Number.isNaN(id) || Number.isNaN(itemId)) {
        return res
          .status(400)
          .json({ success: false, error: 'Invalid id or itemId' });
      }

      const { deviceId } = req.body ?? {};
      if (!deviceId) {
        return res.status(400).json({ success: false, error: 'deviceId 不能为空' });
      }

      const item = await roomService.completeQueueItem(id, itemId, String(deviceId));

      // item 为 null 表示该项已不在播放中（重复上报），幂等返回
      res.json({ success: true, data: item });
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        return res
          .status((error as any).statusCode)
          .json({ success: false, error: error.message });
      }
      logger.error('Error completing queue item:', error);
      res
        .status(500)
        .json({ success: false, error: 'Failed to complete queue item' });
    }
  }
);

export default router;
