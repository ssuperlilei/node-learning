/**
 * Todo 路由：演示局部中间件（参数校验）、统一响应封装
 */
import { Router, Request, Response } from 'express';
import { Todo, CreateTodoDto, UpdateTodoDto } from '../types/todo';
import {
  handleValidation,
  validateCreateTodo,
  validateUpdateTodo,
  validateIdParam,
} from '../middleware';

const router = Router();

const todos: Todo[] = [];
let nextId = 1;

// GET /todos — 获取所有
router.get('/', (_req: Request, res: Response) => {
  res.success(todos, '获取成功');
});

// GET /todos/:id — 获取单个（局部中间件：校验 id 为正整数）
router.get('/:id', validateIdParam, handleValidation, (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const todo = todos.find((t) => t.id === id);
  if (!todo) {
    res.error(`Todo #${id} 不存在`, 404);
    return;
  }
  res.success(todo, '获取成功');
});

// POST /todos — 创建（局部中间件：校验 body.title）
router.post(
  '/',
  validateCreateTodo,
  handleValidation,
  (req: Request, res: Response) => {
    const { title } = req.body as CreateTodoDto;
    const now = new Date();
    const todo: Todo = {
      id: nextId++,
      title: title.trim(),
      completed: false,
      createdAt: now,
      updatedAt: now,
    };
    todos.push(todo);
    res.status(201).success(todo, '创建成功');
  }
);

// PUT /todos/:id — 更新
router.put(
  '/:id',
  validateIdParam,
  validateUpdateTodo,
  handleValidation,
  (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const index = todos.findIndex((t) => t.id === id);
    if (index === -1) {
      res.error(`Todo #${id} 不存在`, 404);
      return;
    }
    const { title, completed } = req.body as UpdateTodoDto;
    const updated: Todo = {
      ...todos[index],
      ...(title !== undefined && { title: title.trim() }),
      ...(completed !== undefined && { completed }),
      updatedAt: new Date(),
    };
    todos[index] = updated;
    res.success(updated, '更新成功');
  }
);

// DELETE /todos/:id — 删除
router.delete(
  '/:id',
  validateIdParam,
  handleValidation,
  (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const index = todos.findIndex((t) => t.id === id);
    if (index === -1) {
      res.error(`Todo #${id} 不存在`, 404);
      return;
    }
    const [deleted] = todos.splice(index, 1);
    res.success(deleted, '删除成功');
  }
);

export default router;
