# Todo API — Express 学习项目

基于 Express + TypeScript 的 Todo CRUD 接口，用于学习以下知识点。

## 知识点与对应代码

| 知识点 | 说明 | 位置 |
|--------|------|------|
| **路由配置** | 根路由 + 模块化路由挂载 `/todos` | `src/index.ts`、`src/routes/todo.ts` |
| **全局中间件** | 对所有请求生效：日志、响应封装、CORS | `src/index.ts`、`src/middleware/` |
| **局部中间件** | 仅对指定路由生效：参数校验 | `src/routes/todo.ts`（`validateIdParam`、`validateCreateTodo` 等） |
| **错误处理中间件** | 四参数 `(err, req, res, next)`，统一错误响应 | `src/middleware/errorHandler.ts` |
| **请求/响应封装** | 统一 `{ code, message, data }`，`res.success()` / `res.error()` | `src/types/api.ts`、`src/middleware/responseHelper.ts` |
| **跨域（CORS）** | 配置允许的 origin、methods、headers | `src/middleware/cors.ts` |
| **接口参数校验** | express-validator：body、param 校验 | `src/middleware/validate.ts` |
| **静态资源托管** | `express.static('public')` 提供静态文件 | `src/index.ts`、`public/` |

## 运行

```bash
pnpm install
pnpm dev    # 开发
pnpm build && pnpm start  # 生产
```

- API：http://localhost:3000  
- 静态页：http://localhost:3000/index.html  
- 示例：`GET /`、`GET /todos`、`POST /todos`（body: `{ "title": "学习 Express" }`）

## 请求示例

```bash
# 创建
curl -X POST http://localhost:3000/todos -H "Content-Type: application/json" -d "{\"title\":\"第一个任务\"}"

# 列表
curl http://localhost:3000/todos

# 参数校验失败（title 为空）
curl -X POST http://localhost:3000/todos -H "Content-Type: application/json" -d "{\"title\":\"\"}"
```
