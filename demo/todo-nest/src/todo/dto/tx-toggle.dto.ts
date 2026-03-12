import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, Min, ArrayMinSize, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class TxToggleDto {
  @ApiPropertyOptional({ example: [1, 2, 3], description: '要批量切换完成状态的 Todo ID 列表' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Type(() => Number)
  ids?: number[] = [];
}
