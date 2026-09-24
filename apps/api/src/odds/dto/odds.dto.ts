import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class OddsComplianceDto {
  @ApiProperty()
  publicEnabled: boolean;

  @ApiProperty()
  regionAllowed: boolean;

  @ApiProperty()
  ageGatingRequired: boolean;

  @ApiProperty()
  advertisingRestricted: boolean;

  @ApiProperty()
  responsibleUseMessage: string;

  @ApiProperty()
  disclaimer: string;
}

export class OddsFormatsDto {
  @ApiProperty()
  decimal: number;

  @ApiProperty()
  fractional: string;

  @ApiProperty()
  american: number;

  @ApiPropertyOptional()
  impliedProbability: number | null;
}

export class OddsSelectionPriceDto {
  @ApiProperty()
  selectionKey: string;

  @ApiProperty()
  label: string;

  @ApiProperty({ type: OddsFormatsDto })
  current: OddsFormatsDto;

  @ApiPropertyOptional({ type: OddsFormatsDto })
  opening: OddsFormatsDto | null;

  @ApiPropertyOptional()
  movementPercent: number | null;

  @ApiProperty()
  sourceSlug: string;

  @ApiProperty()
  sourceName: string;

  @ApiProperty()
  capturedAt: Date;

  @ApiProperty()
  receivedAt: Date;

  @ApiProperty()
  isBestDisplayedPrice: boolean;
}

export class OddsMarketComparisonDto {
  @ApiProperty()
  marketKey: string;

  @ApiProperty()
  marketType: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  bookmakerMargin: number | null;

  @ApiProperty({ type: [OddsSelectionPriceDto] })
  selections: OddsSelectionPriceDto[];
}

export class ModelVsMarketDto {
  @ApiPropertyOptional()
  homeWinProb: number | null;

  @ApiPropertyOptional()
  awayWinProb: number | null;

  @ApiPropertyOptional()
  marketHomeImplied: number | null;

  @ApiPropertyOptional()
  marketAwayImplied: number | null;

  @ApiProperty()
  note: string;
}

export class MatchOddsDto {
  @ApiProperty()
  matchId: string;

  @ApiProperty({ type: OddsComplianceDto })
  compliance: OddsComplianceDto;

  @ApiProperty({ type: [OddsMarketComparisonDto] })
  markets: OddsMarketComparisonDto[];

  @ApiPropertyOptional({ type: ModelVsMarketDto })
  modelVsMarket: ModelVsMarketDto | null;

  @ApiPropertyOptional()
  unavailable: string | null;
}

export class OddsHistoryPointDto {
  @ApiProperty()
  capturedAt: Date;

  @ApiProperty()
  decimalPrice: number;

  @ApiProperty()
  sourceSlug: string;

  @ApiProperty()
  selectionKey: string;
}

export class OddsHistoryDto {
  @ApiProperty()
  matchId: string;

  @ApiProperty()
  marketKey: string;

  @ApiProperty({ type: [OddsHistoryPointDto] })
  points: OddsHistoryPointDto[];
}

export class OddsHistoryQuery {
  @ApiPropertyOptional({ default: 'match_winner' })
  @IsOptional()
  @IsString()
  marketKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  selectionKey?: string;

  @ApiPropertyOptional({ default: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  limit?: number;
}

export class OddsConvertQuery {
  @ApiProperty({ enum: ['decimal', 'fractional', 'american'] })
  @IsIn(['decimal', 'fractional', 'american'])
  from!: 'decimal' | 'fractional' | 'american';

  @ApiProperty({ description: 'Decimal/american number or fractional string e.g. 5/2' })
  @IsString()
  value!: string;

  @ApiPropertyOptional({ enum: ['decimal', 'fractional', 'american'], default: 'decimal' })
  @IsOptional()
  @IsIn(['decimal', 'fractional', 'american'])
  to?: 'decimal' | 'fractional' | 'american';
}

export class OddsConvertDto {
  @ApiProperty()
  decimal: number;

  @ApiProperty({ type: OddsFormatsDto })
  formats: OddsFormatsDto;

  @ApiPropertyOptional()
  bookmakerMargin: number | null;
}

export class OddsMarginBody {
  @ApiProperty({ type: [Number], description: 'Decimal prices for all outcomes in one market' })
  decimals!: number[];
}
