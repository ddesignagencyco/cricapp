import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MATCH_STATUS } from '@cricapp/shared-types';

export class ListMatchesQuery {
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

  @ApiPropertyOptional({
    default: 50,
    maximum: 100,
    description: 'Number of matches to return.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    default: 0,
    description: 'Number of matches to skip (pagination).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
