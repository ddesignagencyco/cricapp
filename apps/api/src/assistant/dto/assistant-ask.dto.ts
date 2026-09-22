import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { AssistantIntent } from '@cricapp/shared-types';

const ASSISTANT_INTENTS = [
  'team_head_to_head',
  'match_prediction_summary',
  'live_win_prob_explain',
  'player_compare',
  'player_recent_form',
  'standings_qualification',
  'unknown',
] as const satisfies readonly AssistantIntent[];

export class AssistantAskDto {
  @ApiProperty({ description: 'Natural-language cricket question.', maxLength: 2000 })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  question!: string;

  @ApiPropertyOptional({ description: 'Optional client session id for analytics.' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Override auto intent detection when slots are provided.',
    enum: ASSISTANT_INTENTS,
  })
  @IsOptional()
  @IsIn(ASSISTANT_INTENTS)
  intent?: AssistantIntent;

  @ApiPropertyOptional({ description: 'Sportradar team id for structured H2H queries.' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  teamAId?: string;

  @ApiPropertyOptional({ description: 'Sportradar team id for structured H2H queries.' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  teamBId?: string;

  @ApiPropertyOptional({ description: 'Sportradar match id for prediction intents.' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  matchId?: string;

  @ApiPropertyOptional({ description: 'Sportradar player id for recent-form questions.' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  playerId?: string;

  @ApiPropertyOptional({ description: 'Sportradar player id for compare / form intents.' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  playerAId?: string;

  @ApiPropertyOptional({ description: 'Sportradar player id for compare / form intents.' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  playerBId?: string;

  @ApiPropertyOptional({
    description: 'PSL season year (2026) or Sportradar season id for standings / compare.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  season?: string;

  @ApiPropertyOptional({ description: 'Team id or name hint for PSL qualification questions.' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  teamId?: string;
}
