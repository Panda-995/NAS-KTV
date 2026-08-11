import { Router, Request, Response } from 'express';
import logger from '../logger';
import * as categoryService from '../services/category-service';
import { authenticateToken } from '../middleware/jwt';
import { createAppError } from '../middleware/error';

const router = Router();

/**
 * GET /categories - 查询所有分类组（含分类项，公开）
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const groups = await categoryService.getCategories();
    res.json({ success: true, data: groups });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return res
        .status((error as any).statusCode)
        .json({ success: false, error: error.message });
    }
    logger.error('Error getting categories:', error);
    res
      .status(500)
      .json({ success: false, error: 'Failed to get categories' });
  }
});

/**
 * POST /categories - 创建分类组（管理员）
 */
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      return res
        .status(400)
        .json({ success: false, error: 'name 不能为空' });
    }

    const category = await categoryService.createCategory({ name });
    res.json({ success: true, data: category });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return res
        .status((error as any).statusCode)
        .json({ success: false, error: error.message });
    }
    logger.error('Error creating category:', error);
    res
      .status(500)
      .json({ success: false, error: 'Failed to create category' });
  }
});

/**
 * PUT /categories/:id - 更新分类组（管理员）
 */
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid category id' });
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

    const category = await categoryService.updateCategory(id, {
      name,
      sortOrder,
    });
    if (!category) {
      throw createAppError('分类组不存在', 404);
    }

    res.json({ success: true, data: category });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return res
        .status((error as any).statusCode)
        .json({ success: false, error: error.message });
    }
    logger.error('Error updating category:', error);
    res
      .status(500)
      .json({ success: false, error: 'Failed to update category' });
  }
});

/**
 * DELETE /categories/:id - 删除分类组（管理员）
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid category id' });
    }

    await categoryService.deleteCategory(id);
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return res
        .status((error as any).statusCode)
        .json({ success: false, error: error.message });
    }
    logger.error('Error deleting category:', error);
    res
      .status(500)
      .json({ success: false, error: 'Failed to delete category' });
  }
});

export default router;
