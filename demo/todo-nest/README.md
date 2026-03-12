# Todo API — NestJS + Prisma + Redis

基于 **NestJS** 的企业级 Todo 后端：Prisma ORM（MySQL）、Redis 分页缓存、JWT 鉴权、Swagger 文档、统一响应与异常处理。

## 技术栈

- **NestJS** — 模块化、依赖注入、Guard/Interceptor/Filter
- **Prisma** — MySQL ORM，迁移与类型安全
- **Redis** — 分页结果缓存（读穿透 + 写失效）
- **JWT** — 登录鉴权（Passport + passport-jwt）
- **class-validator / class-transformer** — DTO 校验与转换
- **Swagger** — OpenAPI 文档

## 功能对照（与原 Express 版一致）

| 功能 | 路径 | 说明 |
|------|------|------|
| 根路由 | `GET /` | 欢迎信息 |
| 健康检查 | `GET /health` | 数据库连通性 |
| 登录 | `POST /auth/login` | 返回 JWT |
| 注册 | `POST /auth/register` | 创建用户 |
| Todo 列表 | `GET /todos` | 需 Bearer Token |
| 按 ID 获取 | `GET /todos/:id` | |
| 创建 Todo | `POST /todos` | |
| 更新 Todo | `PUT /todos/:id` | |
| 删除 Todo | `DELETE /todos/:id` | |
| 联表查询 | `GET /todos/with-user` | INNER JOIN users |
| 分页（含缓存） | `GET /todos/page?page=1&pageSize=10&completed=true` | Redis 缓存 |
| 完成状态统计 | `GET /todos/stats/completed` | GROUP BY completed |
| 事务批量切换 | `POST /todos/tx/toggle` | body: `{ "ids": [1,2,3] }` |

## 运行

### 1. 启动 MySQL 与 Redis（Docker）

```bash
cd demo/todo-nest
docker-compose up -d
```

### 2. 环境变量

复制 `.env.example` 为 `.env`，按需修改 `DATABASE_URL`、`JWT_SECRET`、`REDIS_URL` 等。

### 3. 安装与迁移

```bash
pnpm install
pnpm prisma:generate
npx prisma migrate dev --name init   # 首次会建表（需 MySQL 已启动且 DATABASE_URL 正确）
```

### 4. 启动应用

```bash
pnpm start:dev        # 开发
pnpm build && pnpm start:prod   # 生产
```

- API：http://localhost:3000  
- 健康检查：http://localhost:3000/health  
- Swagger：http://localhost:3000/api-docs  
- 静态页：http://localhost:3000/index.html  

## 请求示例

```bash
# 注册
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}'

# 登录
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}'

# 创建 Todo（需替换 TOKEN）
curl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"title":"第一个任务"}'

# 分页
curl "http://localhost:3000/todos/page?page=1&pageSize=10" \
  -H "Authorization: Bearer TOKEN"
```

## 项目结构（企业级分层）

```
src/
├── main.ts                 # 入口、全局 Pipe/Interceptor/Filter、CORS、静态资源、Swagger
├── app.module.ts
├── common/                 # 公共层
│   ├── decorators/         # 如 CurrentUser
│   ├── filters/            # 全局异常
│   ├── interceptors/       # 统一响应 { code, message, data }
│   └── interfaces/
├── config/                 # 配置（本示例用 ConfigModule + env）
├── prisma/                 # Prisma 模块（全局）
├── redis/                  # Redis 模块（全局）
├── auth/                   # 鉴权模块：登录、注册、JWT Strategy、Guard
├── todo/                   # Todo 模块：CRUD、分页缓存、联表、统计、事务
├── health/                 # 健康检查
└── public/                # 静态资源
```
