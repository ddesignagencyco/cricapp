import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { AD_MODES } from '../ad.config.js';

export class SiteSocialLinkDto {
  @ApiProperty({ example: 'facebook' })
  @IsString()
  @MaxLength(64)
  platform!: string;

  @ApiProperty({ example: 'https://facebook.com/pakcriczone' })
  @IsString()
  @MaxLength(512)
  value!: string;
}

/**
 * The stored shape returned by the API. Separate from `AdConfigDto` because
 * every field is always present, and the optional-looking values are explicit
 * `null`s rather than `undefined`.
 */
export class AdPlacementConfigDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ example: '1234567890', description: 'Numeric AdSense ad unit id.' })
  @IsOptional()
  @Matches(/^\d{10,20}$/, { message: 'slotId must be a numeric AdSense ad unit id.' })
  slotId?: string;
}

export class AdConfigDto {
  @ApiPropertyOptional({ enum: AD_MODES, example: 'adsense' })
  @IsOptional()
  @IsIn(AD_MODES)
  mode?: (typeof AD_MODES)[number];

  @ApiPropertyOptional({
    example: 'ca-pub-1234567890123456',
    description: 'AdSense publisher id. The ca- prefix is optional and stripped on save.',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Matches(/^(ca-)?pub-\d{10,20}$/i, { message: 'clientId must look like pub-1234567890123456.' })
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Fallback ad unit per size, used when a placement has no slot of its own.',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { leaderboard: '1234567890', 'medium-rectangle': '2345678901' },
  })
  @IsOptional()
  @IsObject()
  defaultSlots?: Record<string, string>;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { $ref: '#/components/schemas/AdPlacementConfigDto' },
    example: { 'news-detail-inarticle': { enabled: true, slotId: '3456789012' } },
  })
  @IsOptional()
  @IsObject()
  placements?: Record<string, AdPlacementConfigDto>;

  @ApiPropertyOptional({
    default: false,
    description: 'Opt in to showing ads on the betting-adjacent /odds and /predictions routes.',
  })
  @IsOptional()
  @IsBoolean()
  gamblingAds?: boolean;
}

export class AdPlacementResponseDto {
  @ApiProperty({ example: true })
  enabled!: boolean;

  @ApiProperty({ type: String, nullable: true, example: '1234567890' })
  slotId!: string | null;
}

export class AdConfigResponseDto {
  @ApiProperty({ enum: AD_MODES, example: 'adsense' })
  mode!: (typeof AD_MODES)[number];

  @ApiProperty({ type: String, nullable: true, example: 'pub-1234567890123456' })
  clientId!: string | null;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'string', nullable: true } })
  defaultSlots!: Record<string, string | null>;

  @ApiProperty({ type: 'object', additionalProperties: { $ref: '#/components/schemas/AdPlacementResponseDto' } })
  placements!: Record<string, AdPlacementResponseDto>;

  @ApiProperty({ description: 'Whether ads are opted in on the /odds and /predictions routes.' })
  gamblingAds!: boolean;
}

export class UpdateSiteSettingsDto {
  @ApiPropertyOptional({ example: 'hello@pakcriczone.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;

  @ApiPropertyOptional({ example: 'feedback@pakcriczone.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  supportEmail?: string;

  @ApiPropertyOptional({ example: '+92 300 1234567' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  phone?: string;

  @ApiPropertyOptional({ example: '+923001234567' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  whatsapp?: string;

  @ApiPropertyOptional({ example: 'Office 12, Gulberg III' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  address?: string;

  @ApiPropertyOptional({ example: 'Lahore' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  city?: string;

  @ApiPropertyOptional({ example: 'Pakistan' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  country?: string;

  @ApiPropertyOptional({ example: 'https://maps.google.com/...' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  mapsUrl?: string;

  @ApiPropertyOptional({ example: 'Mon-Fri, 10:00-18:00 PKT' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  workingHours?: string;

  @ApiPropertyOptional({ type: [SiteSocialLinkDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SiteSocialLinkDto)
  socials?: SiteSocialLinkDto[];

  @ApiPropertyOptional({ type: AdConfigDto, description: 'Advertisement delivery config.' })
  @IsOptional()
  @ValidateNested()
  @Type(() => AdConfigDto)
  ads?: AdConfigDto;
}

export class SiteSettingsResponseDto {
  @ApiPropertyOptional()
  email!: string | null;

  @ApiPropertyOptional()
  supportEmail!: string | null;

  @ApiPropertyOptional()
  phone!: string | null;

  @ApiPropertyOptional()
  whatsapp!: string | null;

  @ApiPropertyOptional()
  address!: string | null;

  @ApiPropertyOptional()
  city!: string | null;

  @ApiPropertyOptional()
  country!: string | null;

  @ApiPropertyOptional()
  mapsUrl!: string | null;

  @ApiPropertyOptional()
  workingHours!: string | null;

  @ApiProperty({ type: [SiteSocialLinkDto] })
  socials!: SiteSocialLinkDto[];

  @ApiProperty({ type: AdConfigResponseDto })
  ads!: AdConfigResponseDto;

  @ApiPropertyOptional({ description: 'ISO timestamp of last update.' })
  updatedAt!: string | null;
}
