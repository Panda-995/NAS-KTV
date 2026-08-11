import { Router, Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import logger from '../logger';
import { authenticateToken } from '../middleware/jwt';
import { scanDirectory, getScanStatus } from '../services/scanner';
import { db, schema } from '../db';
import { eq, and, desc, sql } from 'drizzle-orm';

const router = Router();

type ScanJob = typeof schema.scanJobs.$inferSelect;

function toScanTask(job: ScanJob) {
  let errors: string[] = [];
  if (job.errors) {
    try {
      const parsed = JSON.parse(job.errors);
      if (Array.isArray(parsed)) errors = parsed;
    } catch {
      // 忽略损坏的 JSON
    }
  }
  return {
    id: job.scanId,
    scanPath: job.scanPath,
    startTime: new Date(job.startTime).getTime(),
    endTime: job.endTime ? new Date(job.endTime).getTime() : undefined,
    status: job.status,
    result: {
      newSongs: job.newSongs ?? 0,
      updatedSongs: job.updatedSongs ?? 0,
      skippedSongs: job.skippedSongs ?? 0,
      errorCount: job.errorCount ?? 0,
      totalSongs: (job.newSongs ?? 0) + (job.updatedSongs ?? 0) + (job.skippedSongs ?? 0),
      errors,
    },
    error: job.error || undefined,
  };
}

/**
 * 服务重启后残留的 running 记录标记为 failed（扫描中断）
 */
function cleanupStaleJobs(): void {
  if (getScanStatus().isScanning) return;
  db.update(schema.scanJobs)
    .set({ status: 'failed', endTime: new Date(), error: '服务重启，扫描中断' })
    .where(eq(schema.scanJobs.status, 'running'))
    .run();
}

/**
 * POST /api/scan/trigger - 触发扫描
 */
router.post('/trigger', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { scanPath } = req.body;
    
    if (!scanPath) {
      return res.status(400).json({
        success: false,
        error: 'Scan path is required'
      });
    }
    
    const status = getScanStatus();
    if (status.isScanning) {
      return res.status(409).json({
        success: false,
        error: 'Scan already in progress',
        data: status
      });
    }
    
    const scanId = `scan_${Date.now()}`;
    
    db.insert(schema.scanJobs)
      .values({
        scanId,
        scanPath,
        status: 'running',
        startTime: new Date()
      })
      .run();
    
    scanDirectory(scanPath, { scanId })
      .then(() => {
        const s = getScanStatus();
        db.update(schema.scanJobs)
          .set({
            status: 'completed',
            endTime: new Date(),
            newSongs: s.newSongs,
            updatedSongs: s.updatedSongs,
            skippedSongs: s.skippedSongs,
            errorCount: s.errors.length,
            errors: JSON.stringify(s.errors.slice(0, 200)),
          })
          .where(eq(schema.scanJobs.scanId, scanId))
          .run();
      })
      .catch((error) => {
        db.update(schema.scanJobs)
          .set({ status: 'failed', endTime: new Date(), error: error.message })
          .where(eq(schema.scanJobs.scanId, scanId))
          .run();
      });
    
    res.json({
      success: true,
      data: {
        scanId,
        message: 'Scan started'
      }
    });
  } catch (error) {
    logger.error('Error triggering scan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger scan'
    });
  }
});

/**
 * GET /api/scan/status - 获取扫描状态
 */
router.get('/status', authenticateToken, (req: Request, res: Response) => {
  try {
    const status = getScanStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Error getting scan status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scan status'
    });
  }
});

/**
 * GET /api/scan/folders - 浏览系统文件夹（选择扫描目录）
 * 不传 path 返回平台根入口（Windows 盘符 / POSIX /）；
 * 传 path 返回该目录下的子目录列表与上级目录。
 */
router.get('/folders', authenticateToken, async (req: Request, res: Response) => {
  const target = (req.query.path as string | undefined)?.trim();

  try {
    // 未指定路径：返回根入口
    if (!target) {
      if (process.platform === 'win32') {
        const drives: { name: string; path: string }[] = [];
        for (let i = 65; i <= 90; i++) {
          const letter = String.fromCharCode(i);
          try {
            await fs.access(`${letter}:\\`);
            drives.push({ name: `${letter}:\\`, path: `${letter}:\\` });
          } catch {
            // 盘符不存在跳过
          }
        }
        return res.json({ success: true, data: { current: null, parent: null, folders: drives } });
      }
      return res.json({ success: true, data: { current: '/', parent: null, folders: [{ name: '/', path: '/' }] } });
    }

    const resolved = path.resolve(target);

    let entries;
    try {
      entries = await fs.readdir(resolved, { withFileTypes: true });
    } catch (error) {
      logger.warn('Browse folder failed:', resolved, error);
      return res.status(500).json({
        success: false,
        message: `无法读取文件夹：${error instanceof Error ? error.message : String(error)}`,
      });
    }

    const folders = entries
      .filter((e) => e.isDirectory())
      .map((e) => ({ name: e.name, path: path.join(resolved, e.name) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

    // 上级目录：非根目录时返回
    const parent = resolved === path.dirname(resolved) ? null : path.dirname(resolved);

    res.json({ success: true, data: { current: resolved, parent, folders } });
  } catch (error) {
    logger.error('Error browsing folders:', error);
    res.status(500).json({ success: false, message: '获取文件夹列表失败' });
  }
});

/**
 * GET /api/scan/jobs/:scanId/results - 扫描文件级处理结果明细（分页 + 状态筛选）
 */
router.get('/jobs/:scanId/results', authenticateToken, (req: Request, res: Response) => {
  try {
    const { scanId } = req.params;
    const status = (req.query.status as string | undefined)?.trim() || undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const where = and(
      eq(schema.scanResults.scanId, scanId),
      status ? eq(schema.scanResults.status, status) : undefined,
    );

    const total =
      db
        .select({ count: sql<number>`count(*)` })
        .from(schema.scanResults)
        .where(where)
        .get()?.count ?? 0;

    const items = db
      .select()
      .from(schema.scanResults)
      .where(where)
      .orderBy(desc(schema.scanResults.id))
      .limit(limit)
      .offset(offset)
      .all();

    const countRows = db
      .select({
        status: schema.scanResults.status,
        count: sql<number>`count(*)`,
      })
      .from(schema.scanResults)
      .where(eq(schema.scanResults.scanId, scanId))
      .groupBy(schema.scanResults.status)
      .all();

    const counts = { new: 0, updated: 0, skipped: 0, error: 0 };
    for (const row of countRows) {
      const key = row.status as keyof typeof counts;
      if (key in counts) counts[key] = row.count;
    }

    res.json({
      success: true,
      data: {
        items: items.map((r) => ({
          id: r.id,
          filePath: r.filePath,
          status: r.status,
          songId: r.songId,
          reason: r.reason,
          error: r.error,
        })),
        counts,
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    logger.error('Error getting scan results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scan results',
    });
  }
});

/**
 * GET /api/scan/history - 获取扫描历史（持久化自 DB）
 */
router.get('/history', authenticateToken, (req: Request, res: Response) => {
  try {
    cleanupStaleJobs();

    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const total =
      db
        .select({ count: sql<number>`count(*)` })
        .from(schema.scanJobs)
        .get()?.count ?? 0;

    const jobs = db
      .select()
      .from(schema.scanJobs)
      .orderBy(desc(schema.scanJobs.id))
      .limit(limit)
      .offset(offset)
      .all();

    res.json({
      success: true,
      data: {
        items: jobs.map(toScanTask),
        total,
        limit,
        offset
      }
    });
  } catch (error) {
    logger.error('Error getting scan history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scan history'
    });
  }
});

export default router;
