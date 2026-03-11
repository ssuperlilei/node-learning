/**
 * 鉴权服务：登录校验、签发 JWT、注册（密码哈希）
 */
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import * as userRepo from '../repositories/userRepository'
import { jwtSecret, jwtExpiresIn } from '../config'
import type { LoginDto, RegisterDto, JwtPayload, LoginResult } from '../types/auth'

const SALT_ROUNDS = 10

export async function login(dto: LoginDto): Promise<LoginResult | null> {
  const user = await userRepo.findByUsername(dto.username)
  if (!user) return null
  const ok = await bcrypt.compare(dto.password, user.password)
  if (!ok) return null
  const payload: JwtPayload = { userId: user.id, username: user.username }
  const token = jwt.sign(payload, jwtSecret as jwt.Secret, { expiresIn: jwtExpiresIn } as jwt.SignOptions)
  return {
    token,
    user: { id: user.id, username: user.username, email: user.email },
  }
}

export async function register(
  dto: RegisterDto,
): Promise<{ id: number; username: string; email?: string | null } | { error: string }> {
  const existing = await userRepo.findByUsername(dto.username)
  if (existing) return { error: '用户名已存在' }
  const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS)
  const user = await userRepo.create({
    username: dto.username,
    passwordHash,
    email: dto.email ?? null,
  })
  return { id: user.id, username: user.username, email: user.email }
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload
    return decoded
  } catch {
    return null
  }
}
