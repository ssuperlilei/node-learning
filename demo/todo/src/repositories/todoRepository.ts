/**
 * Todo 数据访问层：所有 MySQL 读写集中在此，便于测试与替换
 */
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool } from '../db';
import type { Todo, CreateTodoDto, UpdateTodoDto } from '../types/todo';

interface TodoRow extends RowDataPacket {
  id: number;
  title: string;
  completed: number;
  created_at: Date;
  updated_at: Date;
}

function rowToTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    completed: Boolean(row.completed),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findAll(): Promise<Todo[]> {
  const pool = getPool();
  const [rows] = await pool.execute<TodoRow[]>('SELECT id, title, completed, created_at, updated_at FROM todos ORDER BY id ASC');
  return (rows ?? []).map(rowToTodo);
}

export async function findById(id: number): Promise<Todo | null> {
  const pool = getPool();
  const [rows] = await pool.execute<TodoRow[]>('SELECT id, title, completed, created_at, updated_at FROM todos WHERE id = ?', [id]);
  const row = Array.isArray(rows) ? rows[0] : null;
  return row ? rowToTodo(row) : null;
}

export async function create(dto: CreateTodoDto): Promise<Todo> {
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO todos (title, completed) VALUES (?, 0)',
    [dto.title.trim()]
  );
  const created = await findById(Number(result.insertId));
  if (!created) throw new Error('创建后查询失败');
  return created;
}

export async function update(id: number, dto: UpdateTodoDto): Promise<Todo | null> {
  const existing = await findById(id);
  if (!existing) return null;

  const updates: string[] = [];
  const values: (string | number | boolean)[] = [];

  if (dto.title !== undefined) {
    updates.push('title = ?');
    values.push(dto.title.trim());
  }
  if (dto.completed !== undefined) {
    updates.push('completed = ?');
    values.push(dto.completed ? 1 : 0);
  }
  if (updates.length === 0) return existing;

  const pool = getPool();
  values.push(id);
  await pool.execute(`UPDATE todos SET ${updates.join(', ')} WHERE id = ?`, values);

  const updated = await findById(id);
  return updated ?? null;
}

export async function remove(id: number): Promise<Todo | null> {
  const existing = await findById(id);
  if (!existing) return null;

  const pool = getPool();
  await pool.execute('DELETE FROM todos WHERE id = ?', [id]);
  return existing;
}
