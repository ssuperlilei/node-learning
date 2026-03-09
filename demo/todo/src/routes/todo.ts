import { Router, Request, Response } from 'express';
import { Todo, CreateTodoDto, UpdateTodoDto } from '../types/todo';

const router = Router();

// 内存存储
const todos: Todo[] = [];
let nextId = 1;

// GET /todos — 获取所有 Todo
router.get('/', (_req: Request, res: Response) => {
  res.json({
    code: 0,
    message: '获取成功',
    data: todos,
  });
});

// GET /todos/:id — 获取单个 Todo
router.get('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const todo = todos.find((t) => t.id === id);

  if (!todo) {
    res.status(404).json({ code: 404, message: `Todo #${id} 不存在` });
    return;
  }

  res.json({ code: 0, message: '获取成功', data: todo });
});

// POST /todos — 创建 Todo
router.post('/', (req: Request, res: Response) => {
  const { title } = req.body as CreateTodoDto;

  if (!title || title.trim() === '') {
    res.status(400).json({ code: 400, message: 'title 不能为空' });
    return;
  }

  const now = new Date();
  const todo: Todo = {
    id: nextId++,
    title: title.trim(),
    completed: false,
    createdAt: now,
    updatedAt: now,
  };

  todos.push(todo);
  res.status(201).json({ code: 0, message: '创建成功', data: todo });
});

// PUT /todos/:id — 更新 Todo
router.put('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const index = todos.findIndex((t) => t.id === id);

  if (index === -1) {
    res.status(404).json({ code: 404, message: `Todo #${id} 不存在` });
    return;
  }

  const { title, completed } = req.body as UpdateTodoDto;

  if (title !== undefined && title.trim() === '') {
    res.status(400).json({ code: 400, message: 'title 不能为空字符串' });
    return;
  }

  const updated: Todo = {
    ...todos[index],
    ...(title !== undefined && { title: title.trim() }),
    ...(completed !== undefined && { completed }),
    updatedAt: new Date(),
  };

  todos[index] = updated;
  res.json({ code: 0, message: '更新成功', data: updated });
});

// DELETE /todos/:id — 删除 Todo
router.delete('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const index = todos.findIndex((t) => t.id === id);

  if (index === -1) {
    res.status(404).json({ code: 404, message: `Todo #${id} 不存在` });
    return;
  }

  const [deleted] = todos.splice(index, 1);
  res.json({ code: 0, message: '删除成功', data: deleted });
});

export default router;
