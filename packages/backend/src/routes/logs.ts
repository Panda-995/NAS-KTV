import { Router } from 'express';
import { authenticateToken } from '../middleware/jwt';
import { logService } from '../services/log-service';

const router = Router();

router.get('/system/logs/stats', authenticateToken, async (_req, res) => {
  try {
    const stats = logService.getLogStats();
    return res.json({ success: true, data: stats });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch log stats' });
  }
});

router.get('/system/logs', authenticateToken, async (req, res) => {
  const { level, service, keyword, startTime, endTime, limit, offset } = req.query;

  const filters = {
    level: level as string | undefined,
    service: service as string | undefined,
    keyword: keyword as string | undefined,
    startTime: startTime as string | undefined,
    endTime: endTime as string | undefined,
    limit: limit ? parseInt(limit as string, 10) : undefined,
    offset: offset ? parseInt(offset as string, 10) : undefined,
  };

  try {
    const logs = logService.queryLogs(filters);
    return res.json({ success: true, data: { logs, total: logs.length } });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch logs' });
  }
});

export default router;
