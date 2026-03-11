/**
 * 启动时初始化：确保数据库与表存在（开发/生产通用）
 * 生产也可改为仅连接校验，表结构由独立迁移维护
 */
import mysql from 'mysql2/promise'
import { getDatabaseConfig } from '../config/database'
import { readFileSync } from 'fs'
import { join } from 'path'
import { existsSync } from 'fs'

// 开发时 __dirname 为 src/db，生产为 dist/db（需在 build 时复制 schema.sql）
const schemaPath = [join(__dirname, 'schema.sql'), join(process.cwd(), 'src', 'db', 'schema.sql')].find(existsSync)
if (!schemaPath) throw new Error('未找到 schema.sql')
const schemaSql = readFileSync(schemaPath, 'utf-8')

export async function initDatabase(): Promise<void> {
  const config = getDatabaseConfig()
  // 先不指定 database，连接后创建库（若不存在）
  const conn = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    multipleStatements: true,
  })
  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    )
    await conn.query(`USE \`${config.database}\``)
    await conn.query(schemaSql)
  } finally {
    await conn.end()
  }
}
