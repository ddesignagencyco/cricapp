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

export class MatchSummaryDto {
  @ApiProperty({ description: 'Provider match id.' })
  matchId: string;

  @ApiProperty({ enum: ['upcoming', 'live', 'completed'] })
  status: string;

  @ApiProperty({ type: [String] })
  teams: string[];

  @ApiProperty({ type: [String] })
  teamNames: string[];

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
}
