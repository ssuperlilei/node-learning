/**
 * 鉴权控制器：登录、注册
 */
import { Request, Response } from 'express';
import * as authService from '../services/authService';
import type { LoginDto, RegisterDto } from '../types/auth';

export async function login(req: Request, res: Response): Promise<void> {
  const dto = req.body as LoginDto;
  const result = await authService.login(dto);
  if (!result) {
    res.status(401).json({ code: 401, message: '用户名或密码错误' });
    return;
  }
  res.success(result, '登录成功');
}

export async function register(req: Request, res: Response): Promise<void> {
  const dto = req.body as RegisterDto;
  const result = await authService.register(dto);
  if ('error' in result) {
    res.status(400).json({ code: 400, message: result.error });
    return;
  }
  res.status(201).success(result, '注册成功');
}
