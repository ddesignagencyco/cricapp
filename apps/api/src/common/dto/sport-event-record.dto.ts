import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SportEventRecordDto {
  @ApiProperty({ description: 'The normalized kind: daily_schedule, daily_results, team_schedule, team_results, tournament_results, match_summary, match_lineup, tournament_standings, tournament_leaders.' })
  kind: string;

  @ApiProperty({ description: 'Scope key: a date (YYYY-MM-DD), team id, or tournament/season id.' })
  scopeKey: string;

  @ApiProperty({ description: 'Sportradar event (match) id.' })
  eventId: string;

  @ApiPropertyOptional({ description: 'Raw Sportradar status.' })
  status: string | null;

  @ApiPropertyOptional({ description: 'ISO scheduled timestamp.' })
  scheduled: string | null;

  @ApiProperty({ description: 'Raw Sportradar sport_event payload.' })
  payload: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Parsed sport_event object (when present in payload).' })
  sportEvent?: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      'Parsed sport_event_status (winner, toss, innings, period_scores) in camelCase for UI.',
  })
  sportEventStatus?: {
    winnerId: string | null;
    tossWonBy: string | null;
    tossDecision: string | null;
    currentInning: number | null;
    displayScore: string | null;
    displayOvers: number | null;
    matchResultText: string | null;
    matchStatus: string | null;
    status: string | null;
    periodScores: Array<Record<string, unknown>> | null;
  };
}