import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQuery } from './pagination.query.js';

export class TextSearchQuery extends PaginationQuery {
  @ApiPropertyOptional({ description: 'Text search query.' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
