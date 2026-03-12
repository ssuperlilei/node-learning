import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, MaxLength } from 'class-validator';

export class UpdateTodoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'title 长度不能超过 500' })
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
