import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CurrentInningsDto {
  @ApiProperty({ description: 'Batting team abbreviation.' })
  battingTeam: string;

  @ApiProperty()
  runs: number;

  @ApiProperty()
  wickets: number;

  @ApiProperty({ description: 'Cricket decimal overs (15.3 = 93 balls).' })
  overs: number;

  @ApiProperty()
  runRate: number;
}

export class LastEventDto {
  @ApiProperty({ enum: ['runs', 'wicket', 'none'] })
  type: string;

  @ApiProperty()
  runs: number;

  @ApiProperty()
  over: number;
}

export class TeamSideScoreDto {
  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ description: 'Runs/wickets display, e.g. 182/4.' })
  score: string;

  @ApiProperty({ description: 'Decimal overs when available.' })
  overs: string;
}

export class MatchSummaryDto {
  @ApiProperty({ description: 'Provider match id.' })
  matchId: string;

  @ApiProperty({ enum: ['upcoming', 'live', 'completed', 'cancelled'] })
  status: string;

  @ApiProperty({
    description:
      'Team abbreviations, or `{ home, away }` objects with score/overs when available.',
  })
  teams: string[] | { home: TeamSideScoreDto; away: TeamSideScoreDto };

  @ApiProperty({ type: [String] })
  teamNames: string[];

  @ApiPropertyOptional({
    description: 'Per-side scores derived from Sportradar period_scores.',
  })
  teamScores?: { home: TeamSideScoreDto; away: TeamSideScoreDto } | null;

  @ApiPropertyOptional()
  tournament: string | null;

  @ApiPropertyOptional()
  venue: string | null;

  @ApiPropertyOptional({ description: 'ISO scheduled timestamp.' })
  scheduled: string | null;

  @ApiPropertyOptional({ type: CurrentInningsDto })
  currentInnings: CurrentInningsDto | null;

  @ApiProperty({ type: LastEventDto })
  lastEvent: LastEventDto;

  @ApiPropertyOptional()
  displayScore: string | null;

  @ApiPropertyOptional()
  matchStatus: string | null;

  @ApiPropertyOptional({ description: 'Official result line when the match is completed.' })
  result?: string | null;

  @ApiPropertyOptional({ description: 'Sportradar competitor id of the winning team.' })
  winnerId?: string | null;

  @ApiPropertyOptional({ description: 'Sportradar competitor id that won the toss.' })
  tossWonBy?: string | null;

  @ApiPropertyOptional({ enum: ['bat', 'bowl', 'field'] })
  tossDecision?: string | null;

  @ApiPropertyOptional()
  currentInning?: number | null;

  @ApiPropertyOptional({ description: 'Innings breakdown from Sportradar period_scores.' })
  periodScores?: unknown[] | null;

  @ApiPropertyOptional()
  displayOvers?: number | null;
}
