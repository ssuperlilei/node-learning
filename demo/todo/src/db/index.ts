/**
 * MySQL 连接池：生产环境单例，支持优雅关闭
 */
import mysql from 'mysql2/promise';
import { getDatabaseConfig } from '../config/database';

let pool: mysql.Pool | null = null;

/** 获取连接池；首次调用时创建，之后复用 */
export function getPool(): mysql.Pool {
  if (!pool) {
    const config = getDatabaseConfig();
    pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: config.connectionLimit,
      queueLimit: config.queueLimit,
      connectTimeout: config.connectTimeout,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      /** 日期按 Date 返回，便于与业务类型一致 */
      dateStrings: false,
    });
  }
  return pool;
}

/** 关闭连接池（优雅关闭时调用） */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/** 执行简单查询以检测数据库是否可用（用于健康检查或启动校验） */
export async function ping(): Promise<boolean> {
  const p = getPool();
  try {
    const [rows] = await p.execute('SELECT 1');
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}
