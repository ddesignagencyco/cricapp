import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQuery } from '../../common/dto/pagination.query.js';

export class ListToursQuery extends PaginationQuery {}

export class TourDto {
  @ApiProperty({ description: 'Sportradar tour id.' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ description: 'Category (country) info.' })
  category: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'Sport info.' })
  sport: Record<string, unknown> | null;
}