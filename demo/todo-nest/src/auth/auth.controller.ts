import { Controller, Post, Body, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('鉴权')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: '登录' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '注册' })
  async register(@Body() dto: RegisterDto) {
    const result = await this.authService.register(dto);
    if ('error' in result) {
      throw new BadRequestException(result.error);
    }
    return { data: result, message: '注册成功' };
  }
}
