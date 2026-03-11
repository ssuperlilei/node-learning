/**
 * 学习点：错误处理中间件（四参数：err, req, res, next）
 * 统一将错误转换为 { code, message } 返回，并写入日志
 */
import { Request, Response, NextFunction } from 'express';
import { errorPayload } from '../types/api';
import logger from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  code?: number;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? err.code ?? 500;
  const message = err.message || '服务器内部错误';
  res.status(statusCode >= 400 ? statusCode : 500).json(errorPayload(message, statusCode));
  logger.error({ err, statusCode, message }, 'request error');
}
