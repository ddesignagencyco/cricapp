import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

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

  @ApiProperty({ enum: ['low', 'medium', 'high'] })
  calibrationBand: string;

  @ApiProperty({ type: Object, additionalProperties: true })
  explanation: Record<string, unknown>;

  @ApiPropertyOptional({ type: Object })
  scoreRange: unknown;

  @ApiPropertyOptional({ type: [Object] })
  topBatters: unknown;

  @ApiPropertyOptional({ type: [Object] })
  topBowlers: unknown;

  @ApiPropertyOptional({ type: Object })
  xi: unknown;

  @ApiPropertyOptional()
  momentum: number | null;

  @ApiPropertyOptional()
  pressureIndex: number | null;

  @ApiPropertyOptional({ type: Object })
  partnershipProjection: unknown;

  @ApiPropertyOptional()
  wicketRisk: number | null;
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

  @ApiProperty()
  brierScore: number;
}

export class ConfidenceBandAccuracyDto {
  @ApiProperty({ enum: ['low', 'medium', 'high'] })
  band: string;

  @ApiProperty()
  sampleSize: number;

  @ApiProperty()
  accuracy: number;

  @ApiProperty()
  brierScore: number;
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

  @ApiProperty({ type: [ConfidenceBandAccuracyDto] })
  byConfidenceBand: ConfidenceBandAccuracyDto[];
}

export class PredictionChartDto {
  @ApiProperty()
  matchId: string;

  @ApiProperty({ type: [Object] })
  points: Record<string, unknown>[];
}

export class AdminPredictionRunsQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  matchId?: string;

  @ApiPropertyOptional({ enum: ['pre_match', 'live'] })
  @IsOptional()
  @IsIn(['pre_match', 'live'])
  stage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modelVersion?: string;
}

export class AdminPredictionCalibrationQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modelVersion?: string;

  @ApiPropertyOptional({ minimum: 5, maximum: 20, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(20)
  bins?: number = 10;
}
