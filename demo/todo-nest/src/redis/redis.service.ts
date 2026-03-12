import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

const PAGED_GEN_KEY = 'todo:paged:gen';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private readonly redisUrl: string;
  private readonly cachePagedTtl: number;

  constructor() {
    this.redisUrl = process.env.REDIS_URL ?? '';
    this.cachePagedTtl = parseInt(process.env.CACHE_PAGED_TTL ?? '60', 10) || 60;
  }

  getClient(): Redis | null {
    if (!this.redisUrl) return null;
    if (!this.client) {
      try {
        this.client = new Redis(this.redisUrl, {
          maxRetriesPerRequest: 3,
          retryStrategy(times) {
            if (times > 3) return null;
            return Math.min(times * 200, 2000);
          },
        });
        this.client.on('error', (err) => this.logger.warn(`Redis 连接异常: ${err?.message}`));
        this.client.on('connect', () => this.logger.debug('Redis 已连接'));
      } catch (err) {
        this.logger.warn('Redis 初始化失败，将跳过缓存');
        return null;
      }
    }
    return this.client;
  }

  isEnabled(): boolean {
    return Boolean(this.redisUrl && this.getClient());
  }

  async getPagedGen(): Promise<number> {
    const redis = this.getClient();
    if (!redis) return 0;
    try {
      const v = await redis.get(PAGED_GEN_KEY);
      return v ? parseInt(v, 10) : 0;
    } catch {
      return 0;
    }
  }

  async incrPagedGen(): Promise<void> {
    const redis = this.getClient();
    if (!redis) return;
    try {
      await redis.incr(PAGED_GEN_KEY);
    } catch (err) {
      this.logger.warn('Redis incr paged gen 失败');
    }
  }

  private pagedCacheKey(gen: number, page: number, pageSize: number, completed: 'all' | 'true' | 'false'): string {
    return `todo:paged:${gen}:${page}:${pageSize}:${completed}`;
  }

  async getPagedCache<T>(page: number, pageSize: number, completed: boolean | undefined): Promise<T | null> {
    const redis = this.getClient();
    if (!redis) return null;
    const gen = await this.getPagedGen();
    const completedStr: 'all' | 'true' | 'false' = completed === undefined ? 'all' : completed ? 'true' : 'false';
    const key = this.pagedCacheKey(gen, page, pageSize, completedStr);
    try {
      const raw = await redis.get(key);
      if (!raw) return null;
      const data = JSON.parse(raw) as T;
      if (data && typeof data === 'object' && 'list' in data && Array.isArray((data as { list: unknown[] }).list)) {
        const list = (data as { list: Record<string, unknown>[] }).list;
        list.forEach((item) => {
          if (item.createdAt) item.createdAt = new Date(item.createdAt as string);
          if (item.updatedAt) item.updatedAt = new Date(item.updatedAt as string);
        });
      }
      return data;
    } catch {
      return null;
    }
  }

  async setPagedCache(page: number, pageSize: number, completed: boolean | undefined, value: unknown): Promise<void> {
    const redis = this.getClient();
    if (!redis) return;
    const gen = await this.getPagedGen();
    const completedStr: 'all' | 'true' | 'false' = completed === undefined ? 'all' : completed ? 'true' : 'false';
    const key = this.pagedCacheKey(gen, page, pageSize, completedStr);
    try {
      await redis.setex(key, this.cachePagedTtl, JSON.stringify(value));
    } catch (err) {
      this.logger.warn('Redis set paged cache 失败');
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.logger.log('Redis 已断开');
    }
  }
}
