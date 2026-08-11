import { Router, Request, Response } from 'express';
import logger from '../logger';
import * as deviceService from '../services/device-service';
import { authenticateToken } from '../middleware/jwt';
import { createAppError } from '../middleware/error';

const router = Router();

/**
 * GET /devices - 设备列表（管理员，分页+过滤）
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit
      ? parseInt(req.query.limit as string)
      : 20;

    if (Number.isNaN(page) || page < 1) {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid page' });
    }
    if (Number.isNaN(limit) || limit < 1) {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid limit' });
    }

    const result = await deviceService.listDevices({ status, page, limit });
    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return res
        .status((error as any).statusCode)
        .json({ success: false, error: error.message });
    }
    logger.error('Error listing devices:', error);
    res.status(500).json({ success: false, error: 'Failed to list devices' });
  }
});

/**
 * POST /devices/:id/authorize - 授权设备（管理员）
 */
router.post(
  '/:id/authorize',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) {
        return res
          .status(400)
          .json({ success: false, error: 'Invalid device id' });
      }

      const { authorizeType, expiresAt } = req.body;
      if (!authorizeType || !['permanent', 'temporary'].includes(authorizeType)) {
        return res.status(400).json({
          success: false,
          error: 'authorizeType 必须为 permanent 或 temporary',
        });
      }

      const device = await deviceService.authorizeDevice(id, {
        authorizeType,
        expiresAt,
      });
      if (!device) {
        throw createAppError('设备不存在', 404);
      }

      // 触发 WebSocket 广播 ROOM_AUTHORIZED（Task 4 集成时接入）

      res.json({ success: true, data: device });
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        return res
          .status((error as any).statusCode)
          .json({ success: false, error: error.message });
      }
      logger.error('Error authorizing device:', error);
      res
        .status(500)
        .json({ success: false, error: 'Failed to authorize device' });
    }
  }
);

/**
 * POST /devices/:id/revoke - 撤销设备授权（管理员）
 */
router.post(
  '/:id/revoke',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) {
        return res
          .status(400)
          .json({ success: false, error: 'Invalid device id' });
      }

      const device = await deviceService.revokeDevice(id);
      if (!device) {
        throw createAppError('设备不存在', 404);
      }

      // 触发 WebSocket 广播 ROOM_UNAUTHORIZED（Task 4 集成时接入）

      res.json({ success: true, data: device });
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        return res
          .status((error as any).statusCode)
          .json({ success: false, error: error.message });
      }
      logger.error('Error revoking device:', error);
      res
        .status(500)
        .json({ success: false, error: 'Failed to revoke device' });
    }
  }
);

/**
 * POST /devices/:id/renew - 续期设备授权（管理员）
 */
router.post(
  '/:id/renew',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) {
        return res
          .status(400)
          .json({ success: false, error: 'Invalid device id' });
      }

      const { expiresAt } = req.body;

      const device = await deviceService.renewDevice(id, { expiresAt });
      if (!device) {
        throw createAppError('设备不存在', 404);
      }

      res.json({ success: true, data: device });
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        return res
          .status((error as any).statusCode)
          .json({ success: false, error: error.message });
      }
      logger.error('Error renewing device:', error);
      res
        .status(500)
        .json({ success: false, error: 'Failed to renew device' });
    }
  }
);

/**
 * PUT /devices/:id/name - 重命名设备（管理员）
 */
router.put(
  '/:id/name',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) {
        return res
          .status(400)
          .json({ success: false, error: 'Invalid device id' });
      }

      const { name } = req.body;
      if (!name || typeof name !== 'string') {
        return res
          .status(400)
          .json({ success: false, error: 'name 不能为空' });
      }

      const device = await deviceService.renameDevice(id, { name });
      if (!device) {
        throw createAppError('设备不存在', 404);
      }

      res.json({ success: true, data: device });
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        return res
          .status((error as any).statusCode)
          .json({ success: false, error: error.message });
      }
      logger.error('Error renaming device:', error);
      res
        .status(500)
        .json({ success: false, error: 'Failed to rename device' });
    }
  }
);

/**
 * DELETE /devices/:id - 删除设备（管理员）
 * 硬删除 rooms 记录及关联队列、会话，并广播 ROOM_CLOSED 通知 TV 端重新生成设备信息。
 */
router.delete(
  '/:id',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) {
        return res
          .status(400)
          .json({ success: false, error: 'Invalid device id' });
      }

      const device = await deviceService.deleteDevice(id);
      if (!device) {
        throw createAppError('设备不存在', 404);
      }

      res.json({ success: true, data: device });
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        return res
          .status((error as any).statusCode)
          .json({ success: false, error: error.message });
      }
      logger.error('Error deleting device:', error);
      res
        .status(500)
        .json({ success: false, error: 'Failed to delete device' });
    }
  }
);

export default router;
