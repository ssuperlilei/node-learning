# Todo API — Express 学习项目

基于 Express + TypeScript 的 Todo CRUD 接口，数据持久化到 MySQL。

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
| **MySQL 持久化** | 连接池、仓库层、启动建表、健康检查、优雅关闭 | `src/db/`、`src/config/`、`src/repositories/` |
| **数据库建模** | users / todos 表、主键、外键、索引设计 | `src/db/schema.sql` |
| **CRUD SQL** | SELECT / INSERT / UPDATE / DELETE 示例 | `src/repositories/todoRepository.ts`、`src/routes/todo.ts` |
| **联表查询** | INNER JOIN / LEFT JOIN users | `src/repositories/todoRepository.ts` (`findAllWithUser` 等) |
| **分组/聚合** | GROUP BY completed，统计完成/未完成数量 | `src/repositories/todoRepository.ts` (`countByCompleted`) |
| **排序/分页** | ORDER BY + LIMIT + OFFSET 分页 | `src/repositories/todoRepository.ts` (`findPaged`)、`src/routes/todo.ts` (`GET /todos/page`) |
| **事务基础（ACID）** | 显式事务、commit/rollback、行级锁 (FOR UPDATE) | `src/repositories/todoRepository.ts` (`toggleCompletedInTransaction`) |

## 运行

### 1. 启动 MySQL（Docker）

```bash
cd demo/todo
docker-compose up -d
```

### 2. 环境变量

复制 `.env.example` 为 `.env`，按需修改（默认与 docker-compose 中 root 密码一致）：

```bash
cp .env.example .env
```

### 3. 启动应用

```bash
pnpm install
pnpm dev    # 开发（自动建库建表）
pnpm build && pnpm start  # 生产
```

- API：http://localhost:3000  
- 健康检查：http://localhost:3000/health  
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
