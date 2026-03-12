import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @ApiPropertyOptional({ example: 'newuser' })
  @IsString()
  @IsNotEmpty({ message: 'username 不能为空' })
  @MinLength(2, { message: '用户名 2–100 字符' })
  @MaxLength(100, { message: '用户名 2–100 字符' })
  username!: string;

  @ApiPropertyOptional({ example: 'password123' })
  @IsString()
  @IsNotEmpty({ message: 'password 不能为空' })
  @MinLength(6, { message: '密码至少 6 位' })
  password!: string;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsEmail({}, { message: 'email 格式无效' })
  email?: string;
}
