/**
 * Todo 路由：使用 MySQL 持久化，异步错误通过 next(err) 交给全局错误处理
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

/** 包装异步处理器，将 Promise 拒绝传给 errorHandler */
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// GET /todos — 获取所有
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const list = await todoRepo.findAll();
    res.success(list, '获取成功');
  })
);

// GET /todos/:id — 获取单个
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

// POST /todos — 创建
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

// PUT /todos/:id — 更新
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

// DELETE /todos/:id — 删除
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

export default router;
