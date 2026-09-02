import { ApiProperty } from '@nestjs/swagger';

export class PslSeasonDto {
  @ApiProperty({ description: 'Sportradar season id (e.g. sr:season:140552).' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  year: string;
}
