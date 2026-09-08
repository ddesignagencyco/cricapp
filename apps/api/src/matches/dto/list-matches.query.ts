import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MATCH_STATUS } from '@cricapp/shared-types';
import { PaginationQuery } from '../../common/dto/pagination.query.js';

export class ListMatchesQuery extends PaginationQuery {
  @ApiPropertyOptional({
    enum: Object.values(MATCH_STATUS),
    description: 'Filter by match status: upcoming, live, completed or cancelled.',
  })
  @IsOptional()
  @IsIn(Object.values(MATCH_STATUS))
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by tournament/competition name (case-insensitive).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tournament?: string;
}
