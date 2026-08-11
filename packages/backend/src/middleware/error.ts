import { Request, Response, NextFunction } from 'express';
import logger from '../logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational || false;
  
  const errorResponse = {
    success: false,
    error: err.message || 'Internal Server Error',
  };

  if (isOperational) {
    logger.warn({
      err,
      req: {
        method: req.method,
        url: req.url,
        params: req.params,
        query: req.query,
      },
      statusCode,
    }, `Operational error: ${err.message}`);
  } else {
    logger.error({
      err,
      req: {
        method: req.method,
        url: req.url,
        params: req.params,
        query: req.query,
      },
      statusCode,
    }, `Programmer error: ${err.message}`);
  }

  res.status(statusCode).json(errorResponse);
}

export function createAppError(message: string, statusCode: number): AppError {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
}