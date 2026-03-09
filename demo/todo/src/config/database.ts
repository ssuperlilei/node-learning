/**
 * 数据库配置：从环境变量读取，生产环境必须通过 env 注入，不硬编码敏感信息
 */
function requireEnv(name: string): string {
  const value = process.env[name]
  if (value === undefined || value === '') {
    throw new Error(`缺少环境变量: ${name}`)
  }
  return value
}

function envInt(name: string, defaultValue: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return defaultValue
  const n = parseInt(raw, 10)
  if (Number.isNaN(n)) return defaultValue
  return n
}

export interface DatabaseConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
  /** 连接池大小，生产可调大 */
  connectionLimit: number
  /** 连接超时（毫秒） */
  connectTimeout: number
  /** 队列超时（毫秒） */
  queueLimit: number
}

const isProd = process.env.NODE_ENV === 'production'

export function getDatabaseConfig(): DatabaseConfig {
  return {
    host: process.env.MYSQL_HOST ?? 'localhost',
    port: envInt('MYSQL_PORT', 3306),
    user: process.env.MYSQL_USER ?? 'root',
    password: isProd ? requireEnv('MYSQL_PASSWORD') : (process.env.MYSQL_PASSWORD ?? '666666'),
    database: process.env.MYSQL_DATABASE ?? 'todo',
    connectionLimit: envInt('MYSQL_POOL_SIZE', 10),
    connectTimeout: 10000,
    queueLimit: 0,
  }
}
