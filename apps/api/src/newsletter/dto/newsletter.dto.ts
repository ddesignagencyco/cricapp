import { IsEmail, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQuery } from '../../common/dto/pagination.query.js';

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
