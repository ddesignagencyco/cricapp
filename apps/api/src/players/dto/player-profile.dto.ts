import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TeamSummaryDto } from '../../teams/dto/team.dto.js';

export class RecentMatchDto {
  @ApiProperty()
  matchId: string;

  @ApiProperty({ enum: ['upcoming', 'live', 'completed'] })
  status: string;

  @ApiProperty({ type: [String] })
  teams: string[];

  @ApiProperty({ type: [String] })
  teamNames: string[];

  @ApiPropertyOptional()
  tournament: string | null;

  @ApiPropertyOptional()
  displayScore: string | null;

  @ApiPropertyOptional()
  scheduled: string | null;
}

export class PlayerProfileDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fullName: string;

  @ApiPropertyOptional()
  shortName: string | null;

  @ApiPropertyOptional()
  role: string | null;

  @ApiPropertyOptional()
  battingStyle: string | null;

  @ApiPropertyOptional()
  bowlingStyle: string | null;

  @ApiPropertyOptional({ description: 'Date of birth.' })
  birth: string | null;

  @ApiPropertyOptional()
  nationality: string | null;

  @ApiPropertyOptional()
  profileUrl: string | null;

  @ApiPropertyOptional({ description: 'Country code from provider profile.' })
  countryCode: string | null;

  @ApiPropertyOptional({ description: 'Jersey number.' })
  jerseyNumber: number | null;

  @ApiPropertyOptional({ description: 'Height in cm.' })
  height: number | null;

  @ApiPropertyOptional({ description: 'Full provider profile payload (team history, per-format stats).' })
  providerProfile: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: TeamSummaryDto })
  team: TeamSummaryDto | null;

  @ApiPropertyOptional({ type: [RecentMatchDto] })
  recentMatches: RecentMatchDto[];
}
