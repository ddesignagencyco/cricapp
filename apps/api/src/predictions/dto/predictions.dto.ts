import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

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

  @ApiPropertyOptional({
    description: 'Natural-language explanation of this stored run. Does not change probabilities.',
  })
  narrative: string | null;

  @ApiPropertyOptional({ enum: ['template', 'llm'] })
  narrativeSource: string | null;
}

export class MatchPredictionsDto {
  @ApiProperty()
  matchId: string;

  @ApiPropertyOptional({ type: PredictionRunDto })
  preMatch: PredictionRunDto | null;

  @ApiPropertyOptional({ type: PredictionRunDto })
  live: PredictionRunDto | null;
}

export class BulkPredictionsRequestDto {
  @ApiProperty({ type: [String], minItems: 1, maxItems: 50 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @Matches(/^sr:match:[A-Za-z0-9][A-Za-z0-9_-]*$/, { each: true })
  matchIds: string[];
}

export class BulkPredictionsMetaDto {
  @ApiProperty()
  requested: number;

  @ApiProperty()
  returned: number;

  @ApiProperty()
  missing: number;
}

export class BulkPredictionsResponseDto {
  @ApiProperty({ type: Object, additionalProperties: true })
  data: Record<string, MatchPredictionsDto>;

  @ApiProperty({ type: BulkPredictionsMetaDto })
  meta: BulkPredictionsMetaDto;
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

  @ApiProperty({ enum: ['pre_match', 'live'] })
  stage: string;

  @ApiProperty()
  sampleSize: number;

  @ApiPropertyOptional()
  accuracy: number | null;

  @ApiPropertyOptional()
  brierScore: number | null;

  @ApiPropertyOptional()
  expectedCalibrationError: number | null;

  @ApiProperty({ type: [FormatAccuracyDto] })
  byFormat: FormatAccuracyDto[];

  @ApiProperty({ type: [ConfidenceBandAccuracyDto] })
  byConfidenceBand: ConfidenceBandAccuracyDto[];

  @ApiProperty({
    description: 'True only when sampleSize meets the publish threshold (default 200).',
  })
  claimReady: boolean;

  @ApiProperty()
  publishMinSamples: number;

  @ApiProperty()
  guidance: string;
}

export class PredictionPerformanceQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modelVersion?: string;

  @ApiPropertyOptional({ enum: ['pre_match', 'live'], default: 'pre_match' })
  @IsOptional()
  @IsIn(['pre_match', 'live'])
  stage?: string;

  @ApiPropertyOptional({ minimum: 5, maximum: 20, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(20)
  bins?: number = 10;
}

export class PredictionPerformanceSnapshotDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  modelVersion: string;

  @ApiProperty({ enum: ['pre_match', 'live'] })
  stage: string;

  @ApiProperty()
  sampleSize: number;

  @ApiPropertyOptional()
  accuracy: number | null;

  @ApiPropertyOptional()
  brierScore: number | null;

  @ApiPropertyOptional()
  expectedCalibrationError: number | null;

  @ApiProperty({ type: [FormatAccuracyDto] })
  byFormat: FormatAccuracyDto[] | unknown;

  @ApiProperty({ type: [ConfidenceBandAccuracyDto] })
  byConfidenceBand: ConfidenceBandAccuracyDto[] | unknown;

  @ApiProperty()
  source: string;

  @ApiProperty()
  createdAt: Date;
}

export class PredictionPerformanceHistoryDto {
  @ApiProperty({ type: [PredictionPerformanceSnapshotDto] })
  data: PredictionPerformanceSnapshotDto[];

  @ApiProperty()
  meta: { limit: number };
}

export class PredictionPerformanceHistoryQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modelVersion?: string;

  @ApiPropertyOptional({ enum: ['pre_match', 'live'] })
  @IsOptional()
  @IsIn(['pre_match', 'live'])
  stage?: string;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 30;
}

export class AdminPerformanceSnapshotQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modelVersion?: string;

  @ApiPropertyOptional({ enum: ['pre_match', 'live'], default: 'pre_match' })
  @IsOptional()
  @IsIn(['pre_match', 'live'])
  stage?: string;

  @ApiPropertyOptional({ default: 'manual' })
  @IsOptional()
  @IsString()
  source?: string;
}

export class PredictionModelWeightDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  modelVersion: string;

  @ApiProperty({ enum: ['pre_match', 'live'] })
  stage: string;

  @ApiProperty()
  format: string;

  @ApiProperty({ type: Object })
  weights: Record<string, number>;

  @ApiProperty()
  intercept: number;

  @ApiProperty()
  sampleSize: number;

  @ApiPropertyOptional()
  brierScore: number | null;

  @ApiPropertyOptional()
  accuracy: number | null;

  @ApiProperty()
  source: string;

  @ApiProperty()
  createdAt: Date;
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

  @ApiPropertyOptional({ enum: ['pre_match', 'live'], default: 'pre_match' })
  @IsOptional()
  @IsIn(['pre_match', 'live'])
  stage?: string;

  @ApiPropertyOptional({ minimum: 5, maximum: 20, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(20)
  bins?: number = 10;
}
