/**
 * 学习点：错误处理中间件（四参数：err, req, res, next）
 * Express 通过参数个数识别：4 个参数即为错误处理中间件，只有发生错误时才会进入
 * 统一将错误转换为 { code, message } 返回，避免向客户端泄露堆栈
 */
import { Request, Response, NextFunction } from 'express';
import { errorPayload } from '../types/api';

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
  console.error('[Error]', err.message, err.stack);
}
