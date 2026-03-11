/**
 * Todo 服务层：业务逻辑，调用 repository，可在此做权限、多步操作等
 */
import * as todoRepo from '../repositories/todoRepository';
import type { Todo, TodoWithUser, CreateTodoDto, UpdateTodoDto } from '../types/todo';
import type { PagedResult, ListQuery, CompletedStats } from '../repositories/todoRepository';

export async function findAll(): Promise<Todo[]> {
  return todoRepo.findAll();
}

export async function findById(id: number): Promise<Todo | null> {
  return todoRepo.findById(id);
}

export async function create(dto: CreateTodoDto, userId?: number): Promise<Todo> {
  return todoRepo.create({ ...dto, userId: userId ?? dto.userId });
}

export async function update(id: number, dto: UpdateTodoDto): Promise<Todo | null> {
  return todoRepo.update(id, dto);
}

export async function remove(id: number): Promise<Todo | null> {
  return todoRepo.remove(id);
}

export async function findAllWithUser(): Promise<TodoWithUser[]> {
  return todoRepo.findAllWithUser();
}

export async function findPaged(query: ListQuery): Promise<PagedResult<Todo>> {
  return todoRepo.findPaged(query);
}

export async function countByCompleted(): Promise<CompletedStats[]> {
  return todoRepo.countByCompleted();
}

export async function toggleCompletedInTransaction(ids: number[]): Promise<void> {
  return todoRepo.toggleCompletedInTransaction(ids);
}
