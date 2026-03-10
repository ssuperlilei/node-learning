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
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool } from '../db';
import type { Todo, TodoWithUser, CreateTodoDto, UpdateTodoDto } from '../types/todo';

/** 对应 todos 表的一行（演示列和 TS 类型的映射） */
interface TodoRow extends RowDataPacket {
  id: number;
  user_id: number;
  title: string;
  completed: number;    // MySQL TINYINT(1) 存 0/1，这里用 number 接收
  created_at: Date;
  updated_at: Date;
}

/** 联表查询（todos JOIN users）的结果行 */
interface TodoWithUserRow extends TodoRow {
  username: string;
}

/** 行数据 -> 领域模型（演示「行转对象」） */
function rowToTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    completed: Boolean(row.completed),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToTodoWithUser(row: TodoWithUserRow): TodoWithUser {
  return {
    ...rowToTodo(row),
    username: row.username,
  };
}

// ========== 基本 CRUD 示例 ==========

/** SELECT 示例：查询所有 Todo，按主键升序 */
export async function findAll(): Promise<Todo[]> {
  const pool = getPool();
  // ⭐ 尽量只查用到的列，避免 SELECT *，有利于覆盖索引与 IO 性能
  const [rows] = await pool.execute<TodoRow[]>(
    `
    SELECT id, user_id, title, completed, created_at, updated_at
    FROM todos
    ORDER BY id ASC
    `,
  );
  return (rows ?? []).map(rowToTodo);
}

/** 带条件的 SELECT：按主键精确查找 */
export async function findById(id: number): Promise<Todo | null> {
  const pool = getPool();
  const [rows] = await pool.execute<TodoRow[]>(
    `
    SELECT id, user_id, title, completed, created_at, updated_at
    FROM todos
    WHERE id = ?
    `,
    [id], // ⭐ 使用占位符防止 SQL 注入
  );
  const row = Array.isArray(rows) ? rows[0] : null;
  return row ? rowToTodo(row) : null;
}

/** INSERT 示例：创建 Todo */
export async function create(dto: CreateTodoDto): Promise<Todo> {
  const pool = getPool();
  // 演示：如果未显式传 userId，则默认写到一个「演示用户」ID（1）
  const userId = dto.userId ?? 1;

  const [result] = await pool.execute<ResultSetHeader>(
    `
    INSERT INTO todos (user_id, title, completed)
    VALUES (?, ?, 0)
    `,
    [userId, dto.title.trim()],
  );

  const created = await findById(Number(result.insertId));
  if (!created) throw new Error('创建后查询失败');
  return created;
}

/** UPDATE 示例：只更新传入的字段（演示动态 SQL 拼接） */
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
  // 没有需要更新的字段，直接返回原对象
  if (updates.length === 0) return existing;

  const pool = getPool();
  values.push(id);
  await pool.execute(
    `
    UPDATE todos
    SET ${updates.join(', ')}
    WHERE id = ?
    `,
    values,
  );

  const updated = await findById(id);
  return updated ?? null;
}

/** DELETE 示例：删除前先查一遍，用于返回被删除的数据 */
export async function remove(id: number): Promise<Todo | null> {
  const existing = await findById(id);
  if (!existing) return null;

  const pool = getPool();
  await pool.execute(
    `
    DELETE FROM todos
    WHERE id = ?
    `,
    [id],
  );
  return existing;
}

// ========== 联表查询（JOIN）示例 ==========

/**
 * INNER JOIN：只返回「有用户、且有 Todo」的记录
 * - 语义：todos.user_id = users.id
 * - 典型场景：展示 Todo 时同时显示用户名
 */
export async function findAllWithUser(): Promise<TodoWithUser[]> {
  const pool = getPool();
  const [rows] = await pool.execute<TodoWithUserRow[]>(
    `
    SELECT
      t.id,
      t.user_id,
      t.title,
      t.completed,
      t.created_at,
      t.updated_at,
      u.username
    FROM todos AS t
    INNER JOIN users AS u ON t.user_id = u.id
    ORDER BY t.id ASC
    `,
  );
  return (rows ?? []).map(rowToTodoWithUser);
}

/**
 * LEFT JOIN：即使用户被逻辑删除（假设 users 有 deleted 字段）或缺少关联，也保留左表记录
 * 这里只是语法演示，当前 users 表没有 deleted 字段，仅用于对比 INNER JOIN 写法。
 */
export async function findAllWithUserLeftJoin(): Promise<TodoWithUser[]> {
  const pool = getPool();
  const [rows] = await pool.execute<TodoWithUserRow[]>(
    `
    SELECT
      t.id,
      t.user_id,
      t.title,
      t.completed,
      t.created_at,
      t.updated_at,
      u.username
    FROM todos AS t
    LEFT JOIN users AS u ON t.user_id = u.id
    ORDER BY t.id ASC
    `,
  );
  return (rows ?? []).map(rowToTodoWithUser);
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
  const pool = getPool();
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10)); // 防止一次查太多
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (query.completed !== undefined) {
    conditions.push('completed = ?');
    params.push(query.completed ? 1 : 0);
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // 1）统计总数：用于前端显示总页数
  const [countRows] = await pool.execute<RowDataPacket[]>(
    `
    SELECT COUNT(*) AS total
    FROM todos
    ${whereSql}
    `,
    params,
  );
  const total = Number((countRows[0] as any).total ?? 0);

  // 2）分页查询数据：ORDER BY + LIMIT + OFFSET
  const [rows] = await pool.execute<TodoRow[]>(
    `
    SELECT id, user_id, title, completed, created_at, updated_at
    FROM todos
    ${whereSql}
    ORDER BY created_at DESC, id DESC
    LIMIT ? OFFSET ?
    `,
    [...params, pageSize, offset],
  );

  return {
    list: (rows ?? []).map(rowToTodo),
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
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `
    SELECT completed, COUNT(*) AS cnt
    FROM todos
    GROUP BY completed
    `,
  );

  return (rows ?? []).map((row) => ({
    completed: Boolean(row.completed),
    count: Number((row as any).cnt),
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

  const pool = getPool();
  let conn: PoolConnection | null = null;

  try {
    // 1）从连接池获取一条物理连接，用于事务
    conn = await pool.getConnection();
    await conn.beginTransaction(); // 显式开启事务

    // 2）逐条更新：这里用简单写法，实际可使用 WHERE id IN (...)
    for (const id of ids) {
      // 先查当前状态
      const [rows] = await conn.execute<TodoRow[]>(
        `
        SELECT id, user_id, title, completed, created_at, updated_at
        FROM todos
        WHERE id = ?
        FOR UPDATE
        `,
        [id],
      );
      const row = rows[0];
      if (!row) {
        // 模拟错误：如果有任意一个 id 不存在，认为整个操作失败
        throw new Error(`Todo #${id} 不存在，事务中止并回滚`);
      }

      const newCompleted = row.completed ? 0 : 1;
      await conn.execute(
        `
        UPDATE todos
        SET completed = ?
        WHERE id = ?
        `,
        [newCompleted, id],
      );
    }

    // 3）所有 UPDATE 都成功，提交事务
    await conn.commit();
  } catch (err) {
    // 出现任意错误，回滚事务，保证原子性
    if (conn) {
      await conn.rollback();
    }
    throw err;
  } finally {
    // 释放连接回连接池
    if (conn) {
      conn.release();
    }
  }
}
