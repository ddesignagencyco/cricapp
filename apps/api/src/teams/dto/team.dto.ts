import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TeamSummaryDto {
  @ApiProperty({ description: 'Provider team id.' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ description: 'Team abbreviation.' })
  abbr: string;

  @ApiPropertyOptional()
  country: string | null;

  @ApiPropertyOptional()
  logoUrl: string | null;
}

export class PlayerSummaryDto {
  @ApiProperty({ description: 'Provider player id.' })
  id: string;

  @ApiProperty()
  fullName: string;

  @ApiPropertyOptional()
  shortName: string | null;

  @ApiPropertyOptional({ description: 'Role: batsman, bowler, all_rounder, wicketkeeper, manager.' })
  role: string | null;

  @ApiPropertyOptional()
  nationality: string | null;
}
