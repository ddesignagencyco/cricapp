import { IsString, IsIn, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQuery } from '../../common/dto/pagination.query.js';

export const FAVORITE_TARGET_TYPES = [
  'team',
  'player',
  'match',
  'news',
  'tour',
  'tournament',
] as const;
export type FavoriteTargetType = (typeof FAVORITE_TARGET_TYPES)[number];

export class AddFavoriteDto {
  @ApiProperty({ enum: FAVORITE_TARGET_TYPES })
  @IsString()
  @IsIn(FAVORITE_TARGET_TYPES)
  targetType: FavoriteTargetType;

  @ApiProperty({ example: 'sr:team:1' })
  @IsString()
  targetId: string;
}

export class FavoriteListQuery extends PaginationQuery {
  @ApiPropertyOptional({ enum: FAVORITE_TARGET_TYPES, description: 'Filter by type' })
  @IsOptional()
  @IsString()
  @IsIn(FAVORITE_TARGET_TYPES)
  targetType?: FavoriteTargetType;

  @ApiPropertyOptional({ description: 'Include expanded target entity details' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  expand?: boolean;
}

export class FavoriteDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty() targetType: string;
  @ApiProperty() targetId: string;
  @ApiProperty() createdAt: Date;
}
