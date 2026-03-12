import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    const dbOk = await this.prisma.ping();
    if (!dbOk) {
      throw new HttpException(
        { code: 503, message: '数据库不可用', data: { database: false } },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return { data: { database: true }, message: 'ok' };
  }
}
