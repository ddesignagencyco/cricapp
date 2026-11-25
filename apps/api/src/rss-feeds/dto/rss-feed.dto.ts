import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export const REWRITE_MODES = ['ai_rewrite', 'summary_attribution', 'raw'] as const;
export type RewriteMode = (typeof REWRITE_MODES)[number];

export class CreateRssFeedDto {
  @ApiProperty({ example: 'ESPNcricinfo — Pakistan' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'https://www.espncricinfo.com/rss/content/story/feeds/7.xml' })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  url!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Target NewsCategory UUID' })
  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @ApiPropertyOptional({ description: 'Default Author UUID' })
  @IsOptional()
  @IsString()
  authorId?: string | null;

  @ApiPropertyOptional({ type: [String], example: ['PSL', 'Pakistan', 'Babar', 'ICC'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includeKeywords?: string[];

  @ApiPropertyOptional({ type: [String], example: ['betting', 'sponsored'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeKeywords?: string[];

  @ApiPropertyOptional({ enum: REWRITE_MODES, default: 'summary_attribution' })
  @IsOptional()
  @IsIn(REWRITE_MODES)
  rewriteMode?: RewriteMode;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  autoPublish?: boolean;

  @ApiPropertyOptional({ default: 'en', enum: ['en', 'ur'] })
  @IsOptional()
  @IsIn(['en', 'ur'])
  language?: string;

  @ApiPropertyOptional({ default: 30, minimum: 5, maximum: 1440 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(1440)
  pollIntervalMinutes?: number;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  maxItemsPerPoll?: number;
}

export class UpdateRssFeedDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authorId?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includeKeywords?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeKeywords?: string[];

  @ApiPropertyOptional({ enum: REWRITE_MODES })
  @IsOptional()
  @IsIn(REWRITE_MODES)
  rewriteMode?: RewriteMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoPublish?: boolean;

  @ApiPropertyOptional({ enum: ['en', 'ur'] })
  @IsOptional()
  @IsIn(['en', 'ur'])
  language?: string;

  @ApiPropertyOptional({ minimum: 5, maximum: 1440 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(1440)
  pollIntervalMinutes?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  maxItemsPerPoll?: number;
}

export class PreviewRssFeedDto {
  @ApiProperty({ example: 'https://www.espncricinfo.com/rss/content/story/feeds/7.xml' })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  url!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includeKeywords?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeKeywords?: string[];

  @ApiPropertyOptional({ default: 15, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
