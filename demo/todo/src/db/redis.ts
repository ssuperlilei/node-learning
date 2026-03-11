/**
 * Redis 客户端：用于分页查询等读多写少场景的缓存
 * - 未配置 REDIS_URL 时所有缓存操作 no-op，不报错
 */
import Redis from 'ioredis';
import { redisUrl, cachePagedTtl } from '../config';
import logger from '../utils/logger';

const PAGED_GEN_KEY = 'todo:paged:gen';

let client: Redis | null = null;

/** 获取 Redis 客户端，未配置时返回 null */
export function getRedis(): Redis | null {
  if (!redisUrl) return null;
  if (!client) {
    try {
      client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          if (times > 3) return null;
          return Math.min(times * 200, 2000);
        },
      });
      client.on('error', (err) => logger.warn({ err }, 'Redis 连接异常'));
      client.on('connect', () => logger.debug('Redis 已连接'));
    } catch (err) {
      logger.warn({ err }, 'Redis 初始化失败，将跳过缓存');
      return null;
    }
  }
  return client;
}

/** 是否已启用 Redis 缓存 */
export function isRedisEnabled(): boolean {
  return Boolean(redisUrl && getRedis());
}

/**
 * 获取当前分页缓存「版本」：写入时版本递增，使旧 key 自然失效，无需 SCAN 删键
 */
export async function getPagedGen(): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;
  try {
    const v = await redis.get(PAGED_GEN_KEY);
    return v ? parseInt(v, 10) : 0;
  } catch {
    return 0;
  }
}

/** 递增分页缓存版本，使所有已缓存的分页结果失效（在增删改 Todo 后调用） */
export async function incrPagedGen(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.incr(PAGED_GEN_KEY);
  } catch (err) {
    logger.warn({ err }, 'Redis incr paged gen 失败');
  }
}

function pagedCacheKey(gen: number, page: number, pageSize: number, completed: 'all' | 'true' | 'false'): string {
  return `todo:paged:${gen}:${page}:${pageSize}:${completed}`;
}

/**
 * 从 Redis 读取分页缓存，未命中或未启用时返回 null
 */
export async function getPagedCache<T>(page: number, pageSize: number, completed: boolean | undefined): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;
  const gen = await getPagedGen();
  const completedStr: 'all' | 'true' | 'false' =
    completed === undefined ? 'all' : completed ? 'true' : 'false';
  const key = pagedCacheKey(gen, page, pageSize, completedStr);
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    const data = JSON.parse(raw) as T;
    // 还原 Date 字段
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

/**
 * 写入分页结果到 Redis，带 TTL
 */
export async function setPagedCache(
  page: number,
  pageSize: number,
  completed: boolean | undefined,
  value: unknown,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const gen = await getPagedGen();
  const completedStr: 'all' | 'true' | 'false' =
    completed === undefined ? 'all' : completed ? 'true' : 'false';
  const key = pagedCacheKey(gen, page, pageSize, completedStr);
  try {
    const json = JSON.stringify(value);
    await redis.setex(key, cachePagedTtl, json);
  } catch (err) {
    logger.warn({ err, key }, 'Redis set paged cache 失败');
  }
}

export async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
    logger.info('Redis 已断开');
  }
}
