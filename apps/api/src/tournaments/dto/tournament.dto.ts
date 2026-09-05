import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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