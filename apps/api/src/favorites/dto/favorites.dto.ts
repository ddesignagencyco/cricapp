import { IsString, IsIn, IsOptional, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQuery } from '../../common/dto/pagination.query.js';

export class AddFavoriteDto {
  @ApiProperty({ enum: ['team', 'player', 'match'] })
  @IsString()
  @IsIn(['team', 'player', 'match'])
  targetType: string;

  @ApiProperty({ example: 'sr:team:1' })
  @IsString()
  targetId: string;
}

export class FavoriteListQuery extends PaginationQuery {
  @ApiPropertyOptional({ enum: ['team', 'player', 'match'], description: 'Filter by type' })
  @IsOptional()
  @IsString()
  targetType?: string;

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
