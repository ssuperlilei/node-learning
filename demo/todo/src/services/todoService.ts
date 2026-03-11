/**
 * Todo 服务层：业务逻辑，调用 repository，可在此做权限、多步操作等
 * 分页查询使用 Redis 缓存（读穿透 + 写失效）以减轻数据库压力
 */
import * as todoRepo from '../repositories/todoRepository';
import * as redis from '../db/redis';
import type { Todo, TodoWithUser, CreateTodoDto, UpdateTodoDto } from '../types/todo';
import type { PagedResult, ListQuery, CompletedStats } from '../repositories/todoRepository';

export async function findAll(): Promise<Todo[]> {
  return todoRepo.findAll();
}

export async function findById(id: number): Promise<Todo | null> {
  return todoRepo.findById(id);
}

export async function create(dto: CreateTodoDto, userId?: number): Promise<Todo> {
  const created = await todoRepo.create({ ...dto, userId: userId ?? dto.userId });
  await redis.incrPagedGen();
  return created;
}

export async function update(id: number, dto: UpdateTodoDto): Promise<Todo | null> {
  const updated = await todoRepo.update(id, dto);
  if (updated) await redis.incrPagedGen();
  return updated;
}

export async function remove(id: number): Promise<Todo | null> {
  const removed = await todoRepo.remove(id);
  if (removed) await redis.incrPagedGen();
  return removed;
}

export async function findAllWithUser(): Promise<TodoWithUser[]> {
  return todoRepo.findAllWithUser();
}

export async function findPaged(query: ListQuery): Promise<PagedResult<Todo>> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10));
  const completed = query.completed;

  const cached = await redis.getPagedCache<PagedResult<Todo>>(page, pageSize, completed);
  if (cached) return cached;

  const result = await todoRepo.findPaged({ page, pageSize, completed });
  await redis.setPagedCache(page, pageSize, completed, result);
  return result;
}

export async function countByCompleted(): Promise<CompletedStats[]> {
  return todoRepo.countByCompleted();
}

export async function toggleCompletedInTransaction(ids: number[]): Promise<void> {
  await todoRepo.toggleCompletedInTransaction(ids);
  if (ids.length > 0) await redis.incrPagedGen();
}
