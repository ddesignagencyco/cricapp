import { IsEmail, IsIn, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQuery } from '../../common/dto/pagination.query.js';
import { NEWSLETTER_TYPES, type NewsletterType } from '../newsletter-templates.js';

export class SubscribeNewsletterDto {
  @ApiProperty({ example: 'fan@example.com' })
  @IsEmail()
  email: string;
}

export class UnsubscribeNewsletterDto {
  @ApiProperty({ description: 'Opaque token from the unsubscribe link' })
  @IsUUID()
  token: string;
}

export class NewsletterListQuery extends PaginationQuery {
  @ApiPropertyOptional({ enum: ['active', 'unsubscribed'] })
  @IsOptional()
  @IsIn(['active', 'unsubscribed'])
  status?: string;

  @ApiPropertyOptional({ description: 'Search by email' })
  @IsOptional()
  @IsString()
  q?: string;
}

export class NewsletterTokenDto {
  @ApiProperty({ description: 'Opaque token from the email link' })
  @IsUUID()
  token: string;
}

export class NewsletterPreferencesDto extends NewsletterTokenDto {
  @ApiProperty({
    description: 'Newsletter type → on/off, e.g. {"daily_digest": false}',
    example: { daily_digest: true, match_preview: false },
  })
  @IsObject()
  preferences: Record<string, boolean>;
}

export class NewsletterCampaignDto {
  @ApiProperty({ enum: NEWSLETTER_TYPES })
  @IsIn(NEWSLETTER_TYPES as unknown as string[])
  type: NewsletterType;

  @ApiPropertyOptional({ description: 'Required for match_preview' })
  @IsOptional()
  @IsString()
  matchId?: string;

  @ApiPropertyOptional({ description: 'News id or slug; required for breaking_news' })
  @IsOptional()
  @IsString()
  newsId?: string;
}

export class NewsletterTestDto extends NewsletterCampaignDto {
  @ApiPropertyOptional({ description: 'Defaults to the signed-in admin’s email' })
  @IsOptional()
  @IsEmail()
  to?: string;
}
