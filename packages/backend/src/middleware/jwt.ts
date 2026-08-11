import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface JwtPayload {
  userId: string;
  username: string;
  role?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required',
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }

  req.user = decoded;
  next();
}

/**
 * 校验 JWT，失败返回 null（供 WebSocket 握手等场景使用）
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, config.jwtSecret) as JwtPayload;
  } catch {
    return null;
  }
}