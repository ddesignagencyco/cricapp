import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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