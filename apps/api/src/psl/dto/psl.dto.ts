import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PslStandingDto {
  @ApiProperty({ description: 'Sportradar season id (e.g. sr:season:140552).' })
  seasonId: string;

  @ApiProperty({ description: 'Sportradar team id.' })
  teamId: string;

  @ApiProperty()
  teamName: string;

  @ApiProperty()
  teamAbbr: string;

  @ApiProperty()
  rank: number;

  @ApiProperty()
  played: number;

  @ApiProperty()
  won: number;

  @ApiProperty()
  lost: number;

  @ApiProperty()
  tied: number;

  @ApiProperty()
  noResult: number;

  @ApiProperty()
  points: number;

  @ApiProperty()
  netRunRate: number;

  @ApiPropertyOptional()
  runsFor: number;

  @ApiPropertyOptional()
  runsAgainst: number;

  @ApiPropertyOptional()
  oversFor: number;

  @ApiPropertyOptional()
  oversAgainst: number;

  @ApiPropertyOptional()
  change: number;
}

export class PslFixtureDto {
  @ApiProperty({ description: 'Sportradar match id.' })
  matchId: string;

  @ApiProperty({ description: 'Sportradar season id.' })
  seasonId: string;

  @ApiPropertyOptional({ description: 'Provider status (closed, cancelled, live, etc.).' })
  status: string | null;

  @ApiPropertyOptional({ description: 'ISO scheduled timestamp.' })
  scheduled: string | null;

  @ApiPropertyOptional()
  homeTeamId: string | null;

  @ApiPropertyOptional()
  homeTeamName: string | null;

  @ApiPropertyOptional()
  homeTeamAbbr: string | null;

  @ApiPropertyOptional()
  awayTeamId: string | null;

  @ApiPropertyOptional()
  awayTeamName: string | null;

  @ApiPropertyOptional()
  awayTeamAbbr: string | null;

  @ApiPropertyOptional()
  venue: string | null;

  @ApiPropertyOptional({ description: 'Result text for completed matches.' })
  resultText: string | null;

  @ApiPropertyOptional()
  round: string | null;
}

export class PslLeaderEntryDto {
  @ApiProperty()
  rank: number;

  @ApiProperty({ description: 'Sportradar player id.' })
  playerId: string;

  @ApiProperty()
  playerName: string;

  @ApiPropertyOptional()
  teamAbbr: string | null;

  @ApiPropertyOptional()
  teamName: string | null;

  @ApiProperty({ description: 'The leader value (runs, wickets, average, rate, etc.).' })
  value: number;
}

export class PslLeaderGroupDto {
  @ApiProperty({ enum: ['batting', 'bowling', 'fielding'] })
  category: string;

  @ApiProperty({ description: 'Stat key, e.g. top_runs, top_wickets, top_average, top_economy.' })
  stat: string;

  @ApiProperty({ type: [PslLeaderEntryDto] })
  entries: PslLeaderEntryDto[];
}

export class PslSquadPlayerDto {
  @ApiProperty({ description: 'Sportradar player id.' })
  playerId: string;

  @ApiProperty()
  playerName: string;

  @ApiPropertyOptional()
  playerShortName: string | null;

  @ApiPropertyOptional({ description: 'Role: batsman, bowler, all_rounder, wicket_keeper.' })
  role: string | null;

  @ApiPropertyOptional()
  battingStyle: string | null;

  @ApiPropertyOptional()
  bowlingStyle: string | null;

  @ApiPropertyOptional()
  nationality: string | null;

  @ApiPropertyOptional()
  dateOfBirth: string | null;

  @ApiPropertyOptional()
  jerseyNumber: number | null;
}

export class PslSquadDto {
  @ApiProperty({ description: 'Sportradar team id.' })
  teamId: string;

  @ApiProperty()
  teamName: string;

  @ApiProperty()
  teamAbbr: string;

  @ApiPropertyOptional()
  manager: string | null;

  @ApiProperty({ type: [PslSquadPlayerDto] })
  players: PslSquadPlayerDto[];
}
