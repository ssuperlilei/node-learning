/**
 * Todo 控制器：处理请求/响应，调用 service
 */
import { Request, Response } from 'express';
import * as todoService from '../services/todoService';
import type { CreateTodoDto, UpdateTodoDto } from '../types/todo';

export async function list(_req: Request, res: Response): Promise<void> {
  const list = await todoService.findAll();
  res.success(list, '获取成功');
}

export async function getById(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const todo = await todoService.findById(id);
  if (!todo) {
    res.error(`Todo #${id} 不存在`, 404);
    return;
  }
  res.success(todo, '获取成功');
}

export async function create(req: Request, res: Response): Promise<void> {
  const dto = req.body as CreateTodoDto;
  const userId = req.user?.userId;
  const todo = await todoService.create(dto, userId);
  res.status(201).success(todo, '创建成功');
}

export async function update(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const updated = await todoService.update(id, req.body as UpdateTodoDto);
  if (!updated) {
    res.error(`Todo #${id} 不存在`, 404);
    return;
  }
  res.success(updated, '更新成功');
}

export async function remove(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const deleted = await todoService.remove(id);
  if (!deleted) {
    res.error(`Todo #${id} 不存在`, 404);
    return;
  }
  res.success(deleted, '删除成功');
}

export async function listWithUser(_req: Request, res: Response): Promise<void> {
  const list = await todoService.findAllWithUser();
  res.success(list, '联表查询成功（INNER JOIN users）');
}

export async function listPaged(req: Request, res: Response): Promise<void> {
  const page = Number(req.query.page ?? '1');
  const pageSize = Number(req.query.pageSize ?? '10');
  const completedRaw = req.query.completed;
  let completed: boolean | undefined;
  if (completedRaw === 'true') completed = true;
  if (completedRaw === 'false') completed = false;
  const result = await todoService.findPaged({ page, pageSize, completed });
  res.success(result, '分页查询成功');
}

export async function statsCompleted(_req: Request, res: Response): Promise<void> {
  const stats = await todoService.countByCompleted();
  res.success(stats, '按完成状态分组统计成功');
}

export async function txToggle(req: Request, res: Response): Promise<void> {
  const ids = (req.body?.ids ?? []) as number[];
  await todoService.toggleCompletedInTransaction(ids);
  res.success(null, '事务执行成功，已批量切换 completed');
}
