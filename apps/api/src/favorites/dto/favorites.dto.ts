import { IsString, IsIn, IsOptional } from 'class-validator';
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
}

export class FavoriteDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty() targetType: string;
  @ApiProperty() targetId: string;
  @ApiProperty() createdAt: Date;
}
