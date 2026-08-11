import { Router, Request, Response, NextFunction } from 'express';
import logger from '../logger';
import * as artistService from '../services/artist-service';
import { authenticateToken } from '../middleware/jwt';
import { createAppError } from '../middleware/error';

const router = Router();

/**
 * GET /artists - 歌手列表（公开，分页+搜索）
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const keyword = req.query.keyword as string | undefined;
    const firstLetter = req.query.firstLetter as string | undefined;
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const pageSize = req.query.pageSize
      ? parseInt(req.query.pageSize as string)
      : 20;

    if (Number.isNaN(page) || page < 1) {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid page' });
    }
    if (Number.isNaN(pageSize) || pageSize < 1) {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid pageSize' });
    }

    const result = await artistService.getArtists({
      keyword,
      firstLetter,
      page,
      pageSize,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return res
        .status((error as any).statusCode)
        .json({ success: false, error: error.message });
    }
    logger.error('Error listing artists:', error);
    res.status(500).json({ success: false, error: 'Failed to list artists' });
  }
});

/**
 * POST /artists - 创建歌手（管理员）
 */
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name, bio, avatar } = req.body;
    if (!name || typeof name !== 'string') {
      return res
        .status(400)
        .json({ success: false, error: 'name 不能为空' });
    }

    const artist = await artistService.createArtist({ name, bio, avatar });
    res.json({ success: true, data: artist });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return res
        .status((error as any).statusCode)
        .json({ success: false, error: error.message });
    }
    logger.error('Error creating artist:', error);
    res.status(500).json({ success: false, error: 'Failed to create artist' });
  }
});

/**
 * POST /artists/merge - 合并歌手（管理员）
 * 注意：必须在 /:id 路由之前定义，避免路径冲突
 */
router.post('/merge', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { sourceId, targetId } = req.body;
    if (!sourceId || !targetId) {
      return res
        .status(400)
        .json({ success: false, error: 'sourceId 和 targetId 不能为空' });
    }

    const merged = await artistService.mergeArtists(
      Number(sourceId),
      Number(targetId)
    );
    res.json({ success: true, data: merged });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return res
        .status((error as any).statusCode)
        .json({ success: false, error: error.message });
    }
    // mergeArtists 抛出业务错误（源/目标不存在、相同等），统一返回 400
    if (error instanceof Error) {
      return res.status(400).json({ success: false, error: error.message });
    }
    logger.error('Error merging artists:', error);
    res.status(500).json({ success: false, error: 'Failed to merge artists' });
  }
});

/**
 * GET /artists/:id - 歌手详情（公开）
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      next(createAppError('Invalid artist id', 400));
      return;
    }

    const artist = await artistService.getArtistById(id);
    if (!artist) {
      next(createAppError('歌手不存在', 404));
      return;
    }

    res.json({ success: true, data: artist });
  } catch (error) {
    next(error instanceof Error && 'statusCode' in error
      ? error
      : createAppError('Failed to get artist', 500));
  }
});

/**
 * PUT /artists/:id - 更新歌手（管理员）
 */
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid artist id' });
    }

    const { name, bio, avatar } = req.body;
    const artist = await artistService.updateArtist(id, { name, bio, avatar });
    if (!artist) {
      throw createAppError('歌手不存在', 404);
    }

    res.json({ success: true, data: artist });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return res
        .status((error as any).statusCode)
        .json({ success: false, error: error.message });
    }
    logger.error('Error updating artist:', error);
    res.status(500).json({ success: false, error: 'Failed to update artist' });
  }
});

/**
 * DELETE /artists/:id - 删除歌手（管理员）
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid artist id' });
    }

    await artistService.deleteArtist(id);
    res.json({ success: true, message: 'Artist deleted' });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return res
        .status((error as any).statusCode)
        .json({ success: false, error: error.message });
    }
    // deleteArtist 抛出业务错误（仍有关联歌曲），统一返回 400
    if (error instanceof Error) {
      return res.status(400).json({ success: false, error: error.message });
    }
    logger.error('Error deleting artist:', error);
    res.status(500).json({ success: false, error: 'Failed to delete artist' });
  }
});

export default router;
