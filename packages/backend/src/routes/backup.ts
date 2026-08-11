import { Router, Request, Response } from 'express';
import path from 'path';
import logger from '../logger';
import { authenticateToken } from '../middleware/jwt';
import {
  createBackup,
  listBackups,
  getBackupPath,
  deleteBackup,
  restoreBackup,
} from '../services/backup-service';

const router = Router();

/**
 * POST /api/backup/create - 创建备份
 */
router.post('/backup/create', authenticateToken, async (req: Request, res: Response) => {
  try {
    const backup = await createBackup();
    res.json({ success: true, data: backup });
  } catch (error) {
    logger.error('Error creating backup:', error);
    res.status(500).json({ success: false, error: 'Failed to create backup' });
  }
});

/**
 * GET /api/backup/list - 获取备份列表
 */
router.get('/backup/list', authenticateToken, (req: Request, res: Response) => {
  try {
    const backups = listBackups();
    res.json({ success: true, data: backups });
  } catch (error) {
    logger.error('Error listing backups:', error);
    res.status(500).json({ success: false, error: 'Failed to list backups' });
  }
});

/**
 * GET /api/backup/download/:filename - 下载备份文件
 */
router.get('/backup/download/:filename', authenticateToken, (req: Request, res: Response) => {
  try {
    const filePath = getBackupPath(req.params.filename);
    if (!filePath) {
      return res.status(404).json({ success: false, error: 'Backup not found' });
    }
    res.download(filePath);
  } catch (error) {
    logger.error('Error downloading backup:', error);
    res.status(500).json({ success: false, error: 'Failed to download backup' });
  }
});

/**
 * DELETE /api/backup/:filename - 删除备份
 */
router.delete('/backup/:filename', authenticateToken, (req: Request, res: Response) => {
  try {
    const deleted = deleteBackup(req.params.filename);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Backup not found' });
    }
    res.json({ success: true, message: 'Backup deleted' });
  } catch (error) {
    logger.error('Error deleting backup:', error);
    res.status(500).json({ success: false, error: 'Failed to delete backup' });
  }
});

/**
 * POST /api/backup/restore/:filename - 恢复备份（需要重启服务）
 */
router.post('/backup/restore/:filename', authenticateToken, async (req: Request, res: Response) => {
  try {
    await restoreBackup(req.params.filename);
    res.json({ success: true, message: 'Database restored. Please restart the service.' });
  } catch (error) {
    logger.error('Error restoring backup:', error);
    res.status(500).json({ success: false, error: 'Failed to restore backup' });
  }
});

export default router;
