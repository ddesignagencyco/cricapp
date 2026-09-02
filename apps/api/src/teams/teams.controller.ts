import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TeamsService } from './teams.service.js';
import type { TeamSummary, PlayerSummaryDto as PlayerSummary } from './teams.service.js';
import { TeamSummaryDto, PlayerSummaryDto } from './dto/team.dto.js';

@ApiTags('teams')
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  @ApiOperation({ summary: 'List all teams' })
  @ApiResponse({ status: 200, description: 'All persisted teams.', type: [TeamSummaryDto] })
  async list(): Promise<TeamSummary[]> {
    return this.teamsService.list();
  }

  @Get(':idOrAbbr')
  @ApiOperation({ summary: 'Get a team profile', description: 'By id or abbreviation (e.g. ENG).' })
  @ApiParam({ name: 'idOrAbbr', description: 'Team id or abbreviation.' })
  @ApiResponse({ status: 200, description: 'The team profile.', type: TeamSummaryDto })
  @ApiResponse({ status: 404, description: 'Team not found.' })
  async profile(@Param('idOrAbbr') idOrAbbr: string): Promise<TeamSummary> {
    return this.teamsService.getProfile(idOrAbbr);
  }

  @Get(':idOrAbbr/players')
  @ApiOperation({ summary: 'Get a team roster', description: 'Players belonging to a team.' })
  @ApiParam({ name: 'idOrAbbr', description: 'Team id or abbreviation.' })
  @ApiResponse({ status: 200, description: 'The team roster.', type: [PlayerSummaryDto] })
  @ApiResponse({ status: 404, description: 'Team not found.' })
  async roster(@Param('idOrAbbr') idOrAbbr: string): Promise<PlayerSummary[]> {
    return this.teamsService.getRoster(idOrAbbr);
  }
}
