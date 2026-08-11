import { Router, Request, Response } from 'express';
import logger from '../logger';
import * as categoryService from '../services/category-service';
import { authenticateToken } from '../middleware/jwt';
import { createAppError } from '../middleware/error';

const router = Router();

/**
 * GET /category-items - 查询分类项列表（公开，可按 categoryId 过滤）
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const categoryId = req.query.categoryId
      ? parseInt(req.query.categoryId as string)
      : undefined;

    if (categoryId !== undefined && Number.isNaN(categoryId)) {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid categoryId' });
    }

    const items = await categoryService.getCategoryItems(categoryId);
    res.json({ success: true, data: items });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return res
        .status((error as any).statusCode)
        .json({ success: false, error: error.message });
    }
    logger.error('Error getting category items:', error);
    res
      .status(500)
      .json({ success: false, error: 'Failed to get category items' });
  }
});

/**
 * POST /category-items - 创建分类项（管理员）
 */
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { categoryId, name } = req.body;
    if (!categoryId || typeof categoryId !== 'number') {
      return res
        .status(400)
        .json({ success: false, error: 'categoryId 不能为空' });
    }
    if (!name || typeof name !== 'string') {
      return res
        .status(400)
        .json({ success: false, error: 'name 不能为空' });
    }

    const item = await categoryService.createCategoryItem({
      categoryId,
      name,
    });
    res.json({ success: true, data: item });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return res
        .status((error as any).statusCode)
        .json({ success: false, error: error.message });
    }
    logger.error('Error creating category item:', error);
    res
      .status(500)
      .json({ success: false, error: 'Failed to create category item' });
  }
});

/**
 * POST /category-items/assign - 分配歌曲到分类项（管理员）
 * 注意：必须在 /:id 路由之前定义，避免路径冲突
 */
router.post('/assign', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { songId, categoryItemId } = req.body;
    if (!songId || typeof songId !== 'number') {
      return res
        .status(400)
        .json({ success: false, error: 'songId 不能为空' });
    }
    if (!categoryItemId || typeof categoryItemId !== 'number') {
      return res
        .status(400)
        .json({ success: false, error: 'categoryItemId 不能为空' });
    }

    await categoryService.assignSongToCategory(songId, categoryItemId);
    res.json({ success: true, message: 'Song assigned to category item' });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return res
        .status((error as any).statusCode)
        .json({ success: false, error: error.message });
    }
    logger.error('Error assigning song to category:', error);
    res
      .status(500)
      .json({ success: false, error: 'Failed to assign song to category' });
  }
});

/**
 * PUT /category-items/:id - 更新分类项（管理员）
 */
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid category item id' });
    }

    const { name, sortOrder } = req.body;
    if (name !== undefined && typeof name !== 'string') {
      return res
        .status(400)
        .json({ success: false, error: 'name 必须为字符串' });
    }
    if (
      sortOrder !== undefined &&
      (typeof sortOrder !== 'number' || Number.isNaN(sortOrder))
    ) {
      return res
        .status(400)
        .json({ success: false, error: 'sortOrder 必须为数字' });
    }

    const item = await categoryService.updateCategoryItem(id, {
      name,
      sortOrder,
    });
    if (!item) {
      throw createAppError('分类项不存在', 404);
    }

    res.json({ success: true, data: item });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return res
        .status((error as any).statusCode)
        .json({ success: false, error: error.message });
    }
    logger.error('Error updating category item:', error);
    res
      .status(500)
      .json({ success: false, error: 'Failed to update category item' });
  }
});

/**
 * DELETE /category-items/:id - 删除分类项（管理员）
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid category item id' });
    }

    await categoryService.deleteCategoryItem(id);
    res.json({ success: true, message: 'Category item deleted' });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return res
        .status((error as any).statusCode)
        .json({ success: false, error: error.message });
    }
    logger.error('Error deleting category item:', error);
    res
      .status(500)
      .json({ success: false, error: 'Failed to delete category item' });
  }
});

export default router;
