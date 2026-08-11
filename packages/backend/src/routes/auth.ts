import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/jwt';
import * as authService from '../services/auth-service';

const router = Router();

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: '用户名和密码不能为空',
      });
    }

    const result = await authService.login(username, password);

    res.json({
      success: true,
      data: {
        token: result.token,
        user: result.user,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Logged out',
  });
});

router.get('/me', authenticateToken, (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '未授权',
      });
    }

    const user = authService.getUserById(Number(userId));

    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在',
      });
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

export default router;