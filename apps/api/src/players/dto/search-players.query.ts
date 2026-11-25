import { IsIn, IsOptional, IsString } from 'class-validator';
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

  @ApiPropertyOptional({ enum: ['name', 'team', 'nationality', 'role', 'birth'] })
  @IsOptional()
  @IsIn(['name', 'team', 'nationality', 'role', 'birth'])
  sortBy?: 'name' | 'team' | 'nationality' | 'role' | 'birth';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}