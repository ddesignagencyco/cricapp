import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQuery } from '../../common/dto/pagination.query.js';

export class ListToursQuery extends PaginationQuery {
  @ApiPropertyOptional({ description: 'Search by tour name or country code.' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}

export class TourDto {
  @ApiProperty({ description: 'Sportradar tour id.' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ description: 'Category (country) info.' })
  category: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'Sport info.' })
  sport: Record<string, unknown> | null;

  @ApiProperty({ description: 'Tournaments filed under this tour’s category.' })
  tournamentCount: number;
}
