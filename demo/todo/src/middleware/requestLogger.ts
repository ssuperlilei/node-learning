/**
 * 学习点：全局中间件 — 请求日志
 * 每个请求都会经过，记录 method、url、耗时，便于调试与监控
 */
import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, _res: Response, next: NextFunction): void {
  const start = Date.now();
  next();
  const ms = Date.now() - start;
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${ms}ms`);
}
