import { Router, Request, Response, NextFunction } from 'express';
import * as songService from '../services/song-service';
import { authenticateToken } from '../middleware/jwt';
import { createAppError } from '../middleware/error';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import logger from '../logger';
import { config } from '../config';
import { isMediaFile } from '../services/id3';
import { processMediaFile, getSeparationModel } from '../services/scanner';
import { removeUnknownCategory, deleteCategoryItemIfOrphan } from '../services/song-info-parser';
import { separationQueue } from '../services/separation-queue';
import { aiParseQueue } from '../services/ai-queue';
import {
  getAutoSeparateEnabled,
  getAutoAiParseEnabled,
} from '../services/settings-service';

const router = Router();

// 确保上传目录与歌曲目录存在
fs.mkdirSync(config.uploadPath, { recursive: true });
fs.mkdirSync(config.scanPath, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadPath,
    filename: (_req, file, cb) => {
      cb(null, `${Date.now()}_${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 },
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const keyword = req.query.keyword as string | undefined;
    const artistId = req.query.artistId ? parseInt(req.query.artistId as string) : undefined;
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
    const categoryItemIdsParam =
      req.query.categoryItemIds ??
      req.query['categoryItemIds[]'] ??
      req.query.categoryItemId;
    let categoryItemIds: number[] | undefined;
    if (Array.isArray(categoryItemIdsParam)) {
      categoryItemIds = categoryItemIdsParam
        .map((v) => Number(v))
        .filter((n) => !isNaN(n));
    } else if (typeof categoryItemIdsParam === 'string' && categoryItemIdsParam.length > 0) {
      categoryItemIds = categoryItemIdsParam
        .split(',')
        .map(Number)
        .filter((n) => !isNaN(n));
    }

    const result = await songService.getSongs({ page, pageSize, keyword, artistId, categoryItemIds, categoryId });
    res.json({ success: true, data: result });
  } catch (error) {
    throw createAppError('Failed to fetch songs', 500);
  }
});

/**
 * GET /songs/hot - 热门歌曲（按播放次数排序，公开）
 * 注意：必须在 GET /songs/:id 之前注册
 */
router.get('/hot', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const items = await songService.getHotSongs(Math.min(limit, 100));
    res.json({ success: true, data: items });
  } catch (error) {
    throw createAppError('Failed to fetch hot songs', 500);
  }
});

/**
 * POST /songs/upload - 上传媒体文件并入库（管理端）
 * 上传到 uploads 临时目录后移动至歌曲目录，复用扫描入库流程，并按设置自动入队分离/AI 解析
 */
router.post(
  '/upload',
  authenticateToken,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      next(createAppError('No file uploaded', 400));
      return;
    }
    const tmpPath = req.file.path;
    try {
      if (!isMediaFile(tmpPath)) {
        await fs.promises.unlink(tmpPath).catch(() => {});
        throw createAppError('Unsupported media type', 400);
      }

      const destPath = path.join(config.scanPath, path.basename(tmpPath));
      await fs.promises.copyFile(tmpPath, destPath);
      await fs.promises.unlink(tmpPath).catch(() => {});

      const result = await processMediaFile(destPath);
      if (result.status !== 'new' || typeof result.songId !== 'number') {
        await fs.promises.unlink(destPath).catch(() => {});
        throw createAppError('Failed to add song to library', 500);
      }

      const songId = result.songId;
      try {
        if (await getAutoSeparateEnabled()) {
          separationQueue.enqueue(songId, getSeparationModel());
        }
        if (await getAutoAiParseEnabled()) {
          aiParseQueue.enqueue(songId);
        }
      } catch (error) {
        logger.error('Auto enqueue after upload failed:', error);
      }

      res.status(201).json({ success: true, data: { songId, filePath: destPath } });
    } catch (error) {
      next(error instanceof Error && 'statusCode' in error
        ? error
        : createAppError('Failed to upload song', 500));
    }
  }
);

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const song = await songService.getSongById(id);

    if (!song) {
      throw createAppError('Song not found', 404);
    }

    res.json({ success: true, data: song });
  } catch (error) {
    next(error instanceof Error && 'statusCode' in error
      ? error
      : createAppError('Failed to fetch song', 500));
  }
});

router.put('/:id', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { title, artistId, artistIds, lyricsPath, filePath, fileType, duration, pitchDefault } = req.body;

    const existingSong = await songService.getSongById(id);
    if (!existingSong) {
      throw createAppError('Song not found', 404);
    }

    const updatedSong = await songService.updateSong(id, {
      title,
      artistId,
      artistIds: Array.isArray(artistIds) ? artistIds.map(Number).filter(Number.isFinite) : undefined,
      lyricsPath,
      filePath,
      fileType,
      duration,
      pitchDefault,
    });

    // 已指定歌手（识别到信息）：移除扫描时挂的「未知」分类兜底
    if (artistId != null || (Array.isArray(artistIds) && artistIds.length > 0)) {
      await removeUnknownCategory(id);
    }

    res.json({ success: true, data: updatedSong });
  } catch (error) {
    next(error instanceof Error && 'statusCode' in error
      ? error
      : createAppError('Failed to update song', 500));
  }
});

router.put('/:id/categories', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { categoryItemIds } = req.body as { categoryItemIds?: number[] };

    if (!Array.isArray(categoryItemIds)) {
      throw createAppError('categoryItemIds must be an array', 400);
    }

    const existingSong = await songService.getSongById(id);
    if (!existingSong) {
      throw createAppError('Song not found', 404);
    }

    const oldCategoryLinks = db
      .select({ categoryItemId: schema.songCategories.categoryItemId })
      .from(schema.songCategories)
      .where(eq(schema.songCategories.songId, id))
      .all();

    await db
      .delete(schema.songCategories)
      .where(eq(schema.songCategories.songId, id));

    if (categoryItemIds.length > 0) {
      await db.insert(schema.songCategories).values(
        categoryItemIds.map(itemId => ({
          songId: id,
          categoryItemId: itemId,
          source: 'manual' as const,
        })),
      );
    }

    // 被移除的旧分类项若无其他歌曲关联则直接删除
    for (const link of oldCategoryLinks) {
      if (link.categoryItemId != null && !categoryItemIds.includes(link.categoryItemId)) {
        await deleteCategoryItemIfOrphan(link.categoryItemId);
      }
    }

    res.json({ success: true });
  } catch (error) {
    next(error instanceof Error && 'statusCode' in error
      ? error
      : createAppError('Failed to update song categories', 500));
  }
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);

    const existingSong = await songService.getSongById(id);
    if (!existingSong) {
      throw createAppError('Song not found', 404);
    }

    await songService.deleteSong(id);
    res.json({ success: true, message: 'Song deleted' });
  } catch (error) {
    next(error instanceof Error && 'statusCode' in error
      ? error
      : createAppError('Failed to delete song', 500));
  }
});

export default router;