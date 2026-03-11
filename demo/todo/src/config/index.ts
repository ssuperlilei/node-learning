/**
 * 多环境统一配置：从环境变量读取，按 NODE_ENV 区分默认值
 */
import { getDatabaseConfig } from './database';

function envStr(name: string, defaultValue: string): string {
  const v = process.env[name];
  return v !== undefined && v !== '' ? v : defaultValue;
}

function envInt(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return defaultValue;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? defaultValue : n;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (v === undefined || v === '') {
    throw new Error(`缺少环境变量: ${name}`);
  }
  return v;
}

export const nodeEnv = envStr('NODE_ENV', 'development');
export const isProd = nodeEnv === 'production';
export const isTest = nodeEnv === 'test';

/** 服务端口 */
export const port = envInt('PORT', 3000);

/** JWT 密钥，生产必须通过环境变量注入 */
export const jwtSecret = isProd ? requireEnv('JWT_SECRET') : envStr('JWT_SECRET', 'dev-jwt-secret-change-in-production');
/** JWT 过期时间，如 7d、24h */
export const jwtExpiresIn = envStr('JWT_EXPIRES_IN', '7d');

/** 日志级别：fatal|error|warn|info|debug|trace */
export const logLevel = envStr('LOG_LEVEL', isProd ? 'info' : 'debug');

/** 是否启用 Swagger UI（生产可关闭） */
export const swaggerEnabled = envStr('SWAGGER_ENABLED', isProd ? 'false' : 'true') === 'true';

/** Redis URL，空则禁用缓存 */
export const redisUrl = envStr('REDIS_URL', '');
/** 分页结果缓存 TTL（秒） */
export const cachePagedTtl = envInt('CACHE_PAGED_TTL', 60);

/** 数据库配置（复用原有） */
export { getDatabaseConfig };

export const appConfig = {
  nodeEnv,
  isProd,
  isTest,
  port,
  jwt: { secret: jwtSecret, expiresIn: jwtExpiresIn },
  logLevel,
  swaggerEnabled,
};
