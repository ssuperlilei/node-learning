/**
 * Express 学习入口
 * 涉及：路由配置、全局/错误处理中间件、响应封装、CORS、静态资源托管
 */
import express from 'express';
import path from 'path';
import todoRouter from './routes/todo';
import {
  requestLogger,
  responseHelper,
  errorHandler,
  corsMiddleware,
} from './middleware';

const app = express();
const PORT = process.env.PORT ?? 3000;

// ========== 全局中间件（对所有请求生效）==========
app.use(express.json());           // 解析 JSON 请求体
app.use(requestLogger);            // 请求日志
app.use(responseHelper);           // 为 res 挂载 .success() / .error()

// ========== 跨域处理（CORS）==========
app.use(corsMiddleware);

// ========== 静态资源托管 ==========
// 将 public 目录下的文件通过根路径提供，如 GET /index.html
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// ========== 路由配置 ==========
app.get('/', (_req, res) => {
  res.success({ message: 'Todo API 服务运行中 🚀' });
});

app.use('/todos', todoRouter);

// ========== 404 处理 ==========
app.use((_req, res) => {
  res.error('接口不存在', 404);
});

// ========== 错误处理中间件（必须放在最后，且为四参数）==========
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`服务已启动，监听端口 ${PORT}`);
  console.log(`API: http://localhost:${PORT}`);
  console.log(`静态资源: http://localhost:${PORT}/index.html`);
});
