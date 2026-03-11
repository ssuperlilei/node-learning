/**
 * Express 入口：路由→控制器→服务→模型 分层，JWT 鉴权、Swagger、日志、多环境
 */
import 'dotenv/config';
import express from 'express';
import path from 'path';
import routes from './routes';
import {
  requestLogger,
  responseHelper,
  errorHandler,
  corsMiddleware,
} from './middleware';
import { initDatabase } from './db/init';
import { ping } from './db';
import { disconnectPrisma } from './db/prismaClient';
import { getRedis, disconnectRedis } from './db/redis';
import { port, swaggerEnabled } from './config';
import logger from './utils/logger';
import swaggerUi from 'swagger-ui-express';
import * as fs from 'fs';

const app = express();

app.use(express.json());
app.use(requestLogger);
app.use(responseHelper);
app.use(corsMiddleware);

const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

app.get('/', (_req, res) => {
  res.success({ message: 'Todo API 服务运行中 🚀' });
});

app.get('/health', async (_req, res) => {
  const dbOk = await ping();
  if (!dbOk) {
    res.status(503).json({ code: 503, message: '数据库不可用', data: { database: false } });
    return;
  }
  res.json({ code: 0, message: 'ok', data: { database: true } });
});

if (swaggerEnabled) {
  let spec: Record<string, unknown> = {};
  try {
    const jsonPath = path.join(__dirname, 'config', 'swagger.json');
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    spec = JSON.parse(raw) as Record<string, unknown>;
    if (spec.servers && Array.isArray(spec.servers) && (spec.servers as unknown[])[0]) {
      (spec.servers as { url?: string }[])[0].url = `http://localhost:${port}`;
    }
  } catch {
    spec = { openapi: '3.0.0', info: { title: 'Todo API', version: '1.0.0' }, paths: {} };
  }
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec, { customSiteTitle: 'Todo API 文档' }));
  logger.info('Swagger 文档: /api-docs');
}

app.use(routes);

app.use((_req, res) => {
  res.error('接口不存在', 404);
});

app.use(errorHandler);

async function start() {
  try {
    await initDatabase();
    const ok = await ping();
    if (!ok) {
      const url = process.env.DATABASE_URL;
      const hint = url
        ? 'Prisma 连接失败，请检查 DATABASE_URL 与 MySQL 账号、密码、库名是否一致'
        : '未配置 DATABASE_URL。请在 .env 中设置，格式: mysql://用户:密码@主机:端口/数据库名（与 MYSQL_* 对应）';
      throw new Error(`数据库连接失败。${hint}`);
    }
  } catch (e) {
    logger.fatal(e, '启动失败');
    process.exit(1);
  }

  if (getRedis()) {
    logger.info('分页接口已启用 Redis 缓存');
  } else {
    logger.info('未配置 REDIS_URL，分页接口将直接查库');
  }

  const server = app.listen(port, () => {
    logger.info({ port, swagger: swaggerEnabled }, '服务已启动');
    logger.info(`API: http://localhost:${port}`);
    logger.info(`健康检查: http://localhost:${port}/health`);
    if (swaggerEnabled) logger.info(`接口文档: http://localhost:${port}/api-docs`);
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, '收到退出信号，正在关闭...');
    server.close(async () => {
      await disconnectPrisma();
      await disconnectRedis();
      logger.info('已关闭');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('强制退出');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
