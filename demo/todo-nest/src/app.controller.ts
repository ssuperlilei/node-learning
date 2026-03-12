import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
@Controller()
export class AppController {
  @Get()
  root() {
    return { message: 'Todo API 服务运行中 🚀' };
  }
}
