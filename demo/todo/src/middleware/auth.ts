/**
 * JWT 鉴权中间件：从 Authorization: Bearer <token> 解析并挂载 req.user
 */
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/authService';
import type { JwtPayload } from '../types/auth';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ code: 401, message: '未提供或无效的 Authorization 头' });
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ code: 401, message: 'Token 无效或已过期' });
    return;
  }
  req.user = payload;
  next();
}
