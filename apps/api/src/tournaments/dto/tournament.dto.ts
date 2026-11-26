import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQuery } from '../../common/dto/pagination.query.js';

export class ListTournamentsQuery extends PaginationQuery {
  @ApiPropertyOptional({ description: 'Search by tournament name.' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ description: 'Filter by format/type (e.g. t20, odi, test, league).' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  format?: string;

  @ApiPropertyOptional({ description: 'Filter by category/country name or code.' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @ApiPropertyOptional({ enum: ['active', 'upcoming', 'recent'] })
  @IsOptional()
  @IsIn(['active', 'upcoming', 'recent'])
  status?: 'active' | 'upcoming' | 'recent';

  @ApiPropertyOptional({ enum: ['name', 'type', 'latest'] })
  @IsOptional()
  @IsIn(['name', 'type', 'latest'])
  sortBy?: 'name' | 'type' | 'latest';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class TournamentDto {
  @ApiProperty({ description: 'Sportradar tournament id.' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ description: 'Match format: test, odi, t20, ...' })
  type: string | null;

  @ApiPropertyOptional({ description: 'men | women' })
  gender: string | null;

  @ApiPropertyOptional({ description: 'Country / category info.' })
  category: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'Current season object.' })
  currentSeason: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'Sport info.' })
  sport: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'Id of the tour this tournament belongs to.' })
  tourId: string | null;

  @ApiPropertyOptional({ description: 'Parent tournament id (for sub-competitions).' })
  parentId: string | null;

  @ApiPropertyOptional({
    description:
      'Tournament groups from tournaments/{id}/info.json. Each group carries the tournament teams (id, name, country, country_code, abbreviation, gender).',
    type: 'array',
  })
  groups: Record<string, unknown>[] | null;
}

export class TournamentSeasonDto {
  @ApiProperty({ description: 'Sportradar season id.' })
  id: string;

  @ApiProperty({ description: 'Sportradar tournament id.' })
  tournamentId: string;

  @ApiPropertyOptional()
  name: string | null;

  @ApiPropertyOptional({ description: 'Season year (e.g. 2026).' })
  year: string | null;

  @ApiPropertyOptional({ description: 'ISO start date.' })
  startDate: string | null;

  @ApiPropertyOptional({ description: 'ISO end date.' })
  endDate: string | null;
}

export class TournamentInfoDto {
  @ApiProperty({ description: 'ISO timestamp of when the payload was generated.' })
  generated_at: string;

  @ApiPropertyOptional({
    description: 'Tournament structure; each group carries the tournament teams.',
    type: 'array',
  })
  groups: Record<string, unknown>[] | null;

  @ApiPropertyOptional({
    description: 'Tournament object: id, name, type, gender, category, current_season, season_coverage_info, sport, tour_id, parent_id.',
    type: 'object',
  })
  tournament: Record<string, unknown> | null;
}