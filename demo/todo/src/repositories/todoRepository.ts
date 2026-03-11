/**
 * Todo 数据访问层：所有 MySQL 读写集中在此，便于测试与替换
 *
 * 本文件会系统性演示：
 * - 基本 CRUD：SELECT / INSERT / UPDATE / DELETE
 * - 条件查询 + 排序 + 分页：WHERE + ORDER BY + LIMIT ... OFFSET ...
 * - 联表查询：INNER JOIN / LEFT JOIN
 * - 分组统计：GROUP BY + 聚合函数 COUNT(*)
 * - 事务：BEGIN / COMMIT / ROLLBACK
 * - 简单 SQL 优化思路：使用合适的索引、减少 SELECT *
 */
import type { Prisma, Todo as TodoEntity } from '../generated/client';
import { getPrisma } from '../db/prismaClient';
import type { Todo, TodoWithUser, CreateTodoDto, UpdateTodoDto } from '../types/todo';

// ========== 基本 CRUD 示例 ==========

/** SELECT 示例：查询所有 Todo，按主键升序 */
export async function findAll(): Promise<Todo[]> {
  const prisma = getPrisma();
  const rows: TodoEntity[] = await prisma.todo.findMany({
    orderBy: { id: 'asc' },
  });
  return rows.map((row) => ({
    id: Number(row.id),
    userId: Number(row.userId),
    title: row.title,
    completed: row.completed,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

/** 带条件的 SELECT：按主键精确查找 */
export async function findById(id: number): Promise<Todo | null> {
  const prisma = getPrisma();
  const row: TodoEntity | null = await prisma.todo.findUnique({
    where: { id: BigInt(id) },
  });
  if (!row) return null;
  return {
    id: Number(row.id),
    userId: Number(row.userId),
    title: row.title,
    completed: row.completed,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** INSERT 示例：创建 Todo */
export async function create(dto: CreateTodoDto): Promise<Todo> {
  // 演示：如果未显式传 userId，则默认写到一个「演示用户」ID（1）
  const userId = dto.userId ?? 1;
  const prisma = getPrisma();
  const row: TodoEntity = await prisma.todo.create({
    data: {
      userId: BigInt(userId),
      title: dto.title.trim(),
      completed: false,
    },
  });
  return {
    id: Number(row.id),
    userId: Number(row.userId),
    title: row.title,
    completed: row.completed,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** UPDATE 示例：只更新传入的字段（演示动态 SQL 拼接） */
export async function update(id: number, dto: UpdateTodoDto): Promise<Todo | null> {
  const prisma = getPrisma();
  try {
    const row: TodoEntity = await prisma.todo.update({
      where: { id: BigInt(id) },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.completed !== undefined ? { completed: dto.completed } : {}),
      },
    });
    return {
      id: Number(row.id),
      userId: Number(row.userId),
      title: row.title,
      completed: row.completed,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  } catch (e) {
    // Prisma 在记录不存在时会抛错，这里按原约定返回 null
    return null;
  }
}

/** DELETE 示例：删除前先查一遍，用于返回被删除的数据 */
export async function remove(id: number): Promise<Todo | null> {
  const existing = await findById(id);
  if (!existing) return null;
  const prisma = getPrisma();
  await prisma.todo.delete({
    where: { id: BigInt(id) },
  });
  return existing;
}

// ========== 联表查询（JOIN）示例 ==========

/**
 * INNER JOIN：只返回「有用户、且有 Todo」的记录
 * - 语义：todos.user_id = users.id
 * - 典型场景：展示 Todo 时同时显示用户名
 */
export async function findAllWithUser(): Promise<TodoWithUser[]> {
  const prisma = getPrisma();
  const rows = await prisma.todo.findMany({
    orderBy: { id: 'asc' },
    include: { user: true },
  });
  return rows.map((row: TodoEntity & { user: { username: string } }) => ({
    id: Number(row.id),
    userId: Number(row.userId),
    title: row.title,
    completed: row.completed,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    username: row.user.username,
  }));
}

/**
 * LEFT JOIN：即使用户被逻辑删除（假设 users 有 deleted 字段）或缺少关联，也保留左表记录
 * 这里只是语法演示，当前 users 表没有 deleted 字段，仅用于对比 INNER JOIN 写法。
 */
export async function findAllWithUserLeftJoin(): Promise<TodoWithUser[]> {
  const prisma = getPrisma();
  const rows = await prisma.todo.findMany({
    orderBy: { id: 'asc' },
    include: { user: true },
  });
  return rows.map((row: TodoEntity & { user: { username: string } }) => ({
    id: Number(row.id),
    userId: Number(row.userId),
    title: row.title,
    completed: row.completed,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    username: row.user.username,
  }));
}

// ========== 分页 / 排序 示例 ==========

export interface ListQuery {
  /** 第几页，从 1 开始 */
  page?: number;
  /** 每页条数 */
  pageSize?: number;
  /** 是否只看已完成/未完成，undefined 表示不过滤 */
  completed?: boolean;
}

export interface PagedResult<T> {
  list: T[];
  page: number;
  pageSize: number;
  total: number;
}

/**
 * 分页查询示例：
 * - WHERE：可选过滤条件（completed）
 * - ORDER BY：优先使用索引列（created_at）排序
 * - LIMIT ... OFFSET ...：实现简单分页
 */
export async function findPaged(query: ListQuery): Promise<PagedResult<Todo>> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10)); // 防止一次查太多
  const offset = (page - 1) * pageSize;

  const prisma = getPrisma();

  const where: Prisma.TodoWhereInput = {};
  if (query.completed !== undefined) {
    where.completed = query.completed;
  }

  const total = await prisma.todo.count({ where });
  const rows = await prisma.todo.findMany({
    where,
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' },
    ],
    skip: offset,
    take: pageSize,
  });

  return {
    list: rows.map((row: TodoEntity) => ({
      id: Number(row.id),
      userId: Number(row.userId),
      title: row.title,
      completed: row.completed,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })),
    page,
    pageSize,
    total,
  };
}

// ========== 分组 / 聚合 示例 ==========

export interface CompletedStats {
  completed: boolean;
  count: number;
}

/**
 * GROUP BY 示例：统计已完成/未完成的数量
 * - 使用 COUNT(*) 聚合函数
 * - GROUP BY completed
 */
export async function countByCompleted(): Promise<CompletedStats[]> {
  const prisma = getPrisma();
  const rows = await prisma.todo.groupBy({
    by: ['completed'],
    _count: { _all: true },
  });
  return rows.map((row: { completed: boolean; _count: { _all: number } }) => ({
    completed: row.completed,
    count: row._count._all,
  }));
}

// ========== 事务 示例 ==========

/**
 * 在一个事务中批量切换多个 Todo 的完成状态。
 * 如果中途任何一条 UPDATE 失败，则整体回滚。
 *
 * 学习点：
 * - ACID：原子性（要么全部成功，要么全部失败）、一致性、隔离性、持久性
 * - BEGIN / COMMIT / ROLLBACK 的基本用法
 */
export async function toggleCompletedInTransaction(ids: number[]): Promise<void> {
  if (ids.length === 0) return;

  const prisma = getPrisma();
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    for (const id of ids) {
      const current = await tx.todo.findUnique({
        where: { id: BigInt(id) },
      });
      if (!current) {
        throw new Error(`Todo #${id} 不存在，事务中止并回滚`);
      }
      await tx.todo.update({
        where: { id: BigInt(id) },
        data: { completed: !current.completed },
      });
    }
  });
}
