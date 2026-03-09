import express from 'express';
import todoRouter from './routes/todo';

const app = express();
const PORT = process.env.PORT ?? 3000;

// 解析 JSON 请求体
app.use(express.json());

// 挂载路由
app.use('/todos', todoRouter);

// 健康检查
app.get('/', (_req, res) => {
  res.json({ message: 'Todo API 服务运行中 🚀' });
});

// 404 处理
app.use((_req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在' });
});

app.listen(PORT, () => {
  console.log(`服务已启动，监听端口 ${PORT}`);
  console.log(`访问地址: http://localhost:${PORT}`);
});
