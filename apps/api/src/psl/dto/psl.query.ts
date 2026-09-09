import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQuery } from '../../common/dto/pagination.query.js';

export class PslQuery extends PaginationQuery {
  @ApiPropertyOptional({ description: 'Season id or year. Defaults to latest.' })
  @IsOptional()
  @IsString()
  season?: string;
}
