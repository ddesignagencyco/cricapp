import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PredictionExplanationDto {
  @ApiPropertyOptional()
  z?: number;

  @ApiPropertyOptional({ type: [String] })
  reasons?: string[];

  @ApiPropertyOptional()
  over?: number;

  @ApiPropertyOptional()
  wickets?: number;
}

export class PredictionRunDto {
  @ApiProperty()
  runId: string;

  @ApiProperty({ enum: ['pre_match', 'live'] })
  stage: string;

  @ApiProperty()
  modelVersion: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  homeWinProb: number;

  @ApiProperty()
  awayWinProb: number;

  @ApiProperty()
  confidence: number;

  @ApiProperty({ type: Object, additionalProperties: true })
  explanation: Record<string, unknown>;
}

export class MatchPredictionsDto {
  @ApiProperty()
  matchId: string;

  @ApiPropertyOptional({ type: PredictionRunDto })
  preMatch: PredictionRunDto | null;

  @ApiPropertyOptional({ type: PredictionRunDto })
  live: PredictionRunDto | null;
}

export class PredictionHistoryDto {
  @ApiProperty()
  matchId: string;

  @ApiProperty({ type: [PredictionRunDto] })
  runs: PredictionRunDto[];
}

export class FormatAccuracyDto {
  @ApiProperty()
  format: string;

  @ApiProperty()
  sampleSize: number;

  @ApiProperty()
  accuracy: number;
}

export class PredictionPerformanceDto {
  @ApiProperty()
  modelVersion: string;

  @ApiProperty()
  sampleSize: number;

  @ApiPropertyOptional()
  accuracy: number | null;

  @ApiPropertyOptional()
  brierScore: number | null;

  @ApiProperty({ type: [FormatAccuracyDto] })
  byFormat: FormatAccuracyDto[];
}
