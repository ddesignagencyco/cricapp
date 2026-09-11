import { IsOptional, IsString, MaxLength, IsInt, Min, Max, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UnifiedSearchQuery {
  @ApiProperty({ description: 'Search query across players, teams, matches and tournaments.' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  q: string;

  @ApiPropertyOptional({ default: 6, maximum: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  playerLimit?: number;

  @ApiPropertyOptional({ default: 6, maximum: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  teamLimit?: number;

  @ApiPropertyOptional({ default: 6, maximum: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  matchLimit?: number;

  @ApiPropertyOptional({ default: 4, maximum: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  tournamentLimit?: number;
}

export class SearchResultsDto {
  @ApiProperty() players: unknown[];
  @ApiProperty() teams: unknown[];
  @ApiProperty() matches: unknown[];
  @ApiProperty() tournaments: unknown[];
}
