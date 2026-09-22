import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

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

  @ApiPropertyOptional({ description: 'ISO timestamp of last update.' })
  updatedAt!: string | null;
}
