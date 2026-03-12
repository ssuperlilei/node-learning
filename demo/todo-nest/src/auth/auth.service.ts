import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const SALT_ROUNDS = 10;

export interface JwtPayload {
  userId: number;
  username: string;
  iat?: number;
  exp?: number;
}

export interface LoginResult {
  token: string;
  user: { id: number; username: string; email?: string | null };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    const payload: JwtPayload = { userId: Number(user.id), username: user.username };
    const token = this.jwtService.sign(payload);
    return {
      token,
      user: {
        id: Number(user.id),
        username: user.username,
        email: user.email,
      },
    };
  }

  async register(
    dto: RegisterDto,
  ): Promise<{ id: number; username: string; email?: string | null } | { error: string }> {
    const existing = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existing) {
      return { error: '用户名已存在' };
    }
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        password: passwordHash,
        email: dto.email ?? null,
      },
    });
    return {
      id: Number(user.id),
      username: user.username,
      email: user.email,
    };
  }

  async validatePayload(payload: JwtPayload): Promise<JwtPayload | null> {
    return payload;
  }
}
