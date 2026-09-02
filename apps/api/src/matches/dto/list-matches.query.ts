import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { MATCH_STATUS } from '@cricapp/shared-types';

export class ListMatchesQuery {
  @IsOptional()
  @IsIn(Object.values(MATCH_STATUS))
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tournament?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
