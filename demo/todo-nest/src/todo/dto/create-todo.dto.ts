import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, IsInt, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTodoDto {
  @ApiProperty({ example: '学习 NestJS' })
  @IsString()
  @IsNotEmpty({ message: 'title 不能为空' })
  @MaxLength(500, { message: 'title 长度不能超过 500' })
  title!: string;

  @ApiPropertyOptional({ description: '所属用户 ID，不传时使用当前登录用户' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  userId?: number;
}
