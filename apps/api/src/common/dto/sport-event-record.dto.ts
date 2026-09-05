import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SportEventRecordDto {
  @ApiProperty({ description: 'The normalized kind: daily_schedule, daily_results, team_schedule, team_results, tournament_results.' })
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
}