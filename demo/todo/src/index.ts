/**
 * Express 入口：路由、中间件、MySQL 持久化、健康检查、优雅关闭
 */
import 'dotenv/config';
import express from 'express';
import path from 'path';
import todoRouter from './routes/todo';
import {
  requestLogger,
  responseHelper,
  errorHandler,
  corsMiddleware,
} from './middleware';
import { initDatabase } from './db/init';
import { getPool, closePool, ping } from './db';

const app = express();
const PORT = process.env.PORT ?? 3000;

// ========== 全局中间件 ==========
app.use(express.json());
app.use(requestLogger);
app.use(responseHelper);
app.use(corsMiddleware);

// ========== 静态资源 ==========
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// ========== 路由 ==========
app.get('/', (_req, res) => {
  res.success({ message: 'Todo API 服务运行中 🚀' });
});

/** 健康检查：含数据库连通性，便于 K8s/负载均衡探活 */
app.get('/health', async (_req, res) => {
  const dbOk = await ping();
  if (!dbOk) {
    res.status(503).json({ code: 503, message: '数据库不可用', data: { database: false } });
    return;
  }
  res.json({ code: 0, message: 'ok', data: { database: true } });
});

app.use('/todos', todoRouter);

// ========== 404 ==========
app.use((_req, res) => {
  res.error('接口不存在', 404);
});

// ========== 错误处理 ==========
app.use(errorHandler);

// ========== 启动与优雅关闭 ==========
async function start() {
  try {
    await initDatabase();
    const ok = await ping();
    if (!ok) throw new Error('数据库连接失败');
  } catch (e) {
    console.error('启动失败:', e);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`服务已启动，监听端口 ${PORT}`);
    console.log(`API: http://localhost:${PORT}`);
    console.log(`健康检查: http://localhost:${PORT}/health`);
    console.log(`静态资源: http://localhost:${PORT}/index.html`);
  });

  const shutdown = async (signal: string) => {
    console.log(`收到 ${signal}，正在关闭...`);
    server.close(async () => {
      await closePool();
      console.log('已关闭');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('强制退出');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
