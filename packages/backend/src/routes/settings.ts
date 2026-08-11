import { Router, Request, Response } from 'express';
import logger from '../logger';
import * as settingsService from '../services/settings-service';
import { authenticateToken } from '../middleware/jwt';
import { separationQueue } from '../services/separation-queue';
import { aiParseQueue } from '../services/ai-queue';

const router = Router();

/**
 * GET /settings - 查询所有设置项（管理员）
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const settings = await settingsService.getAllSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return res
        .status((error as any).statusCode)
        .json({ success: false, error: error.message });
    }
    logger.error('Error getting settings:', error);
    res
      .status(500)
      .json({ success: false, error: 'Failed to get settings' });
  }
});

/**
 * PUT /settings - 批量更新设置项（管理员）
 * body: { settings: [{ key, value }] }
 */
router.put('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { settings } = req.body;
    if (!Array.isArray(settings)) {
      return res
        .status(400)
        .json({ success: false, error: 'settings 必须为数组' });
    }

    // 校验每一项
    for (const item of settings) {
      if (
        !item ||
        typeof item.key !== 'string' ||
        typeof item.value !== 'string'
      ) {
        return res.status(400).json({
          success: false,
          error: '每一项必须包含 key(string) 和 value(string)',
        });
      }
    }

    await settingsService.updateSettings(settings);

    // 并发数变更后触发热更新
    const keys = settings.map((s: { key: string }) => s.key);
    if (keys.includes('separation_concurrency')) {
      await separationQueue.updateConcurrency();
    }
    if (keys.includes('ai_parse_concurrency')) {
      await aiParseQueue.updateConcurrency();
    }

    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return res
        .status((error as any).statusCode)
        .json({ success: false, error: error.message });
    }
    logger.error('Error updating settings:', error);
    res
      .status(500)
      .json({ success: false, error: 'Failed to update settings' });
  }
});

export default router;
