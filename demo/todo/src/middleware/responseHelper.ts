/**
 * 学习点：请求/响应对象封装 — 为每个请求的 res 挂载 .success() / .error()
 * 使用方式：在路由中写 res.success(data) 或 res.error('错误信息', 400)
 */
import { Request, Response, NextFunction } from 'express';
import { attachResponseHelpers } from '../types/api';

export function responseHelper(_req: Request, res: Response, next: NextFunction): void {
  attachResponseHelpers(res);
  next();
}
