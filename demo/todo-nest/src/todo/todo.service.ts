import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';

export interface ListQuery {
  page?: number;
  pageSize?: number;
  completed?: boolean;
}

export interface TodoVo {
  id: number;
  userId: number;
  title: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TodoWithUserVo extends TodoVo {
  username: string;
}

export interface PagedResult<T> {
  list: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface CompletedStats {
  completed: boolean;
  count: number;
}

function toTodoVo(row: { id: bigint; userId: bigint; title: string; completed: boolean; createdAt: Date; updatedAt: Date }): TodoVo {
  return {
    id: Number(row.id),
    userId: Number(row.userId),
    title: row.title,
    completed: row.completed,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class TodoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findAll(): Promise<TodoVo[]> {
    const rows = await this.prisma.todo.findMany({
      orderBy: { id: 'asc' },
    });
    return rows.map(toTodoVo);
  }

  async findById(id: number): Promise<TodoVo | null> {
    const row = await this.prisma.todo.findUnique({
      where: { id: BigInt(id) },
    });
    if (!row) return null;
    return toTodoVo(row);
  }

  async create(dto: CreateTodoDto, userId?: number): Promise<TodoVo> {
    const uid = userId ?? dto.userId ?? 1;
    const row = await this.prisma.todo.create({
      data: {
        userId: BigInt(uid),
        title: dto.title.trim(),
        completed: false,
      },
    });
    await this.redis.incrPagedGen();
    return toTodoVo(row);
  }

  async update(id: number, dto: UpdateTodoDto): Promise<TodoVo> {
    const existing = await this.prisma.todo.findUnique({
      where: { id: BigInt(id) },
    });
    if (!existing) {
      throw new NotFoundException(`Todo #${id} 不存在`);
    }
    const row = await this.prisma.todo.update({
      where: { id: BigInt(id) },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.completed !== undefined ? { completed: dto.completed } : {}),
      },
    });
    await this.redis.incrPagedGen();
    return toTodoVo(row);
  }

  async remove(id: number): Promise<TodoVo> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Todo #${id} 不存在`);
    }
    await this.prisma.todo.delete({
      where: { id: BigInt(id) },
    });
    await this.redis.incrPagedGen();
    return existing;
  }

  async findAllWithUser(): Promise<TodoWithUserVo[]> {
    const rows = await this.prisma.todo.findMany({
      orderBy: { id: 'asc' },
      include: { user: true },
    });
    return rows.map((r) => ({
      ...toTodoVo(r),
      username: r.user.username,
    }));
  }

  async findPaged(query: ListQuery): Promise<PagedResult<TodoVo>> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10));
    const completed = query.completed;

    const cached = await this.redis.getPagedCache<PagedResult<TodoVo>>(page, pageSize, completed);
    if (cached) return cached;

    const offset = (page - 1) * pageSize;
    const where = completed !== undefined ? { completed } : {};
    const total = await this.prisma.todo.count({ where });
    const rows = await this.prisma.todo.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: offset,
      take: pageSize,
    });
    const result: PagedResult<TodoVo> = {
      list: rows.map(toTodoVo),
      page,
      pageSize,
      total,
    };
    await this.redis.setPagedCache(page, pageSize, completed, result);
    return result;
  }

  async countByCompleted(): Promise<CompletedStats[]> {
    const rows = await this.prisma.todo.groupBy({
      by: ['completed'],
      _count: { _all: true },
    });
    return rows.map((r) => ({
      completed: r.completed,
      count: r._count._all,
    }));
  }

  async toggleCompletedInTransaction(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    await this.prisma.$transaction(async (tx) => {
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
    await this.redis.incrPagedGen();
  }
}
