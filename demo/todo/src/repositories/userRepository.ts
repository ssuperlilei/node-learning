/**
 * 用户数据访问层：按用户名查询、创建用户（密码由 service 层哈希后传入）
 */
import type { User as UserEntity } from '../generated/client';
import { getPrisma } from '../db/prismaClient';

export interface UserRecord {
  id: number;
  username: string;
  password: string;
  email: string | null;
  createdAt: Date;
}

export interface CreateUserDto {
  username: string;
  passwordHash: string;
  email?: string | null;
}

export async function findByUsername(username: string): Promise<UserRecord | null> {
  const prisma = getPrisma();
  const row: UserEntity | null = await prisma.user.findUnique({
    where: { username },
  });
  if (!row) return null;
  return {
    id: Number(row.id),
    username: row.username,
    password: row.password,
    email: row.email,
    createdAt: row.createdAt,
  };
}

export async function create(dto: CreateUserDto): Promise<UserRecord> {
  const prisma = getPrisma();
  const row: UserEntity = await prisma.user.create({
    data: {
      username: dto.username,
      password: dto.passwordHash,
      email: dto.email ?? null,
    },
  });
  return {
    id: Number(row.id),
    username: row.username,
    password: row.password,
    email: row.email,
    createdAt: row.createdAt,
  };
}
