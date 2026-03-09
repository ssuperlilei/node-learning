/**
 * 学习点：跨域处理（CORS）
 * 浏览器同源策略下，前端（如 http://localhost:5173）访问本 API（http://localhost:3000）会跨域
 * 通过 CORS 中间件设置 Access-Control-Allow-* 响应头，允许指定来源/方法/头
 */
import cors from 'cors';

/** 开发环境：允许任意来源；生产建议配置 origin 白名单 */
const corsOptions: cors.CorsOptions = {
  origin: true, // 或 ['http://localhost:5173'] 等白名单
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

export const corsMiddleware = cors(corsOptions);
