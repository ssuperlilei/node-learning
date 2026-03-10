/**
 * Todo 路由：使用 MySQL 持久化，异步错误通过 next(err) 交给全局错误处理
 *
 * 本文件会配合仓库层，演示：
 * - 基本 CRUD 接口：对应 SELECT / INSERT / UPDATE / DELETE
 * - 联表查询接口：INNER JOIN
 * - 分页 / 排序 / 过滤接口：page + pageSize + completed
 * - 分组统计接口：GROUP BY completed
 * - 事务接口：在一个事务中批量切换 completed
 */
import { Router, Request, Response, NextFunction } from 'express';
import { CreateTodoDto, UpdateTodoDto } from '../types/todo';
import * as todoRepo from '../repositories/todoRepository';
import {
  handleValidation,
  validateCreateTodo,
  validateUpdateTodo,
  validateIdParam,
} from '../middleware';

const router = Router();

/** 包装异步处理器，将 Promise 拒绝传给 errorHandler（避免重复 try/catch） */
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// GET /todos — 获取所有 Todo（最基础的 SELECT 示例）
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const list = await todoRepo.findAll();
    res.success(list, '获取成功');
  })
);

// GET /todos/:id — 获取单个 Todo（WHERE id = ?）
router.get(
  '/:id',
  validateIdParam,
  handleValidation,
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const todo = await todoRepo.findById(id);
    if (!todo) {
      res.error(`Todo #${id} 不存在`, 404);
      return;
    }
    res.success(todo, '获取成功');
  })
);

// POST /todos — 创建 Todo（INSERT 示例）
router.post(
  '/',
  validateCreateTodo,
  handleValidation,
  asyncHandler(async (req: Request, res: Response) => {
    const { title } = req.body as CreateTodoDto;
    const todo = await todoRepo.create({ title });
    res.status(201).success(todo, '创建成功');
  })
);

// PUT /todos/:id — 更新 Todo（UPDATE 示例）
router.put(
  '/:id',
  validateIdParam,
  validateUpdateTodo,
  handleValidation,
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const updated = await todoRepo.update(id, req.body as UpdateTodoDto);
    if (!updated) {
      res.error(`Todo #${id} 不存在`, 404);
      return;
    }
    res.success(updated, '更新成功');
  })
);

// DELETE /todos/:id — 删除 Todo（DELETE 示例）
router.delete(
  '/:id',
  validateIdParam,
  handleValidation,
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const deleted = await todoRepo.remove(id);
    if (!deleted) {
      res.error(`Todo #${id} 不存在`, 404);
      return;
    }
    res.success(deleted, '删除成功');
  })
);

// GET /todos/with-user — 联表查询（INNER JOIN users 表）
router.get(
  '/with-user',
  asyncHandler(async (_req: Request, res: Response) => {
    const list = await todoRepo.findAllWithUser();
    res.success(list, '联表查询成功（INNER JOIN users）');
  })
);

// GET /todos/page — 分页 + 排序 + 可选过滤（completed）
router.get(
  '/page',
  asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page ?? '1');
    const pageSize = Number(req.query.pageSize ?? '10');
    const completedRaw = req.query.completed;

    let completed: boolean | undefined;
    if (completedRaw === 'true') completed = true;
    if (completedRaw === 'false') completed = false;

    const result = await todoRepo.findPaged({
      page,
      pageSize,
      completed,
    });
    res.success(result, '分页查询成功');
  })
);

// GET /todos/stats/completed — 分组统计（GROUP BY completed）
router.get(
  '/stats/completed',
  asyncHandler(async (_req: Request, res: Response) => {
    const stats = await todoRepo.countByCompleted();
    res.success(stats, '按完成状态分组统计成功');
  })
);

// POST /todos/tx/toggle — 事务示例：在一个事务中批量切换 completed
router.post(
  '/tx/toggle',
  asyncHandler(async (req: Request, res: Response) => {
    const ids = (req.body?.ids ?? []) as number[];
    await todoRepo.toggleCompletedInTransaction(ids);
    res.success(null, '事务执行成功，已批量切换 completed');
  })
);

export default router;
