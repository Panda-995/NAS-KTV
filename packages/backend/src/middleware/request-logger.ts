import { Request, Response, NextFunction } from 'express';
import logger from '../logger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const responseTime = Date.now() - start;
    const meta = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime,
    };

    if (responseTime >= 3000) {
      logger.warn({ ...meta, slow: true }, `Slow request: ${req.method} ${req.originalUrl} ${res.statusCode} ${responseTime}ms`);
    } else {
      logger.info(meta, `${req.method} ${req.originalUrl} ${res.statusCode} ${responseTime}ms`);
    }
  });

  next();
}
