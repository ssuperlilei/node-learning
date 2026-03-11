/**
 * 学习点：全局中间件 — 请求日志（接入 Pino）
 */
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export function requestLogger(req: Request, _res: Response, next: NextFunction): void {
  const start = Date.now();
  next();
  const ms = Date.now() - start;
  logger.info({ method: req.method, url: req.originalUrl, ms }, 'request');
}
