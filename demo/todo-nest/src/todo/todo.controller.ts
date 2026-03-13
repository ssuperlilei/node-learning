import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { TodoService } from './todo.service'
import { CreateTodoDto } from './dto/create-todo.dto'
import { UpdateTodoDto } from './dto/update-todo.dto'
import { PageQueryDto } from './dto/page-query.dto'
import { TxToggleDto } from './dto/tx-toggle.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Transform } from 'class-transformer'

@ApiTags('Todo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('todos')
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

  @Get()
  @ApiOperation({ summary: '获取 Todo 列表' })
  async list() {
    return this.todoService.findAll()
  }

  @Get('with-user')
  @ApiOperation({ summary: '联表查询（INNER JOIN users）' })
  async listWithUser() {
    const list = await this.todoService.findAllWithUser()
    return { data: list, message: '联表查询成功（INNER JOIN users）' }
  }

  @Get('page')
  @ApiOperation({ summary: '分页查询（含 Redis 缓存）' })
  async listPaged(@Query() query: PageQueryDto) {
    const completed = query.completed === 'true' ? true : query.completed === 'false' ? false : undefined
    const result = await this.todoService.findPaged({
      page: query.page,
      pageSize: query.pageSize,
      completed,
    })
    return { data: result, message: '分页查询成功' }
  }

  @Get('stats/completed')
  @ApiOperation({ summary: '按完成状态分组统计' })
  async statsCompleted() {
    return this.todoService.countByCompleted()
  }

  @Post('tx/toggle')
  @ApiOperation({ summary: '事务批量切换完成状态' })
  async txToggle(@Body() dto: TxToggleDto) {
    const ids = dto.ids ?? []
    await this.todoService.toggleCompletedInTransaction(ids)
    return { data: null, message: '事务执行成功，已批量切换 completed' }
  }

  @Get(':id')
  @ApiOperation({ summary: '按 ID 获取' })
  async getById(@Param('id', ParseIntPipe) id: number) {
    const todo = await this.todoService.findById(id)
    if (!todo) throw new NotFoundException(`Todo #${id} 不存在`)
    return { data: todo, message: '获取成功' }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建 Todo' })
  async create(@Body() dto: CreateTodoDto, @CurrentUser() user: { userId: number }) {
    const todo = await this.todoService.create(dto, user.userId)
    return { data: todo, message: '创建成功' }
  }

  @Put(':id')
  @ApiOperation({ summary: '更新 Todo' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTodoDto) {
    return this.todoService.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除 Todo' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.todoService.remove(id)
  }
}
