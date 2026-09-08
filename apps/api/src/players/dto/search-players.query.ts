import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQuery } from '../../common/dto/pagination.query.js';

export class SearchPlayersQuery extends PaginationQuery {
  @ApiPropertyOptional({ description: 'Name substring query.' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Team abbreviation filter.' })
  @IsOptional()
  @IsString()
  team?: string;
}