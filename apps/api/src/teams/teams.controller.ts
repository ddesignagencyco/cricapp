import { Controller, Get, Param, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TeamsService } from './teams.service.js';
import type { TeamSummary, PlayerSummaryDto as PlayerSummary } from './teams.service.js';
import { TeamSummaryDto, PlayerSummaryDto } from './dto/team.dto.js';
import { SportEventRecordDto } from '../common/dto/sport-event-record.dto.js';
import { PaginationQuery } from '../common/dto/pagination.query.js';

@ApiTags('teams')
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'List all teams' })
  @ApiResponse({ status: 200, description: 'All persisted teams.', type: [TeamSummaryDto] })
  async list(@Query() query: PaginationQuery): Promise<TeamSummary[]> {
    return this.teamsService.list(query);
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
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Get a team roster', description: 'Players belonging to a team.' })
  @ApiParam({ name: 'idOrAbbr', description: 'Team id or abbreviation.' })
  @ApiResponse({ status: 200, description: 'The team roster.', type: [PlayerSummaryDto] })
  @ApiResponse({ status: 404, description: 'Team not found.' })
  async roster(
    @Param('idOrAbbr') idOrAbbr: string,
    @Query() query: PaginationQuery,
  ): Promise<PlayerSummary[]> {
    return this.teamsService.getRoster(idOrAbbr, query);
  }

  @Get(':idOrAbbr/schedule')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Team schedule', description: 'Upcoming matches for a team.' })
  @ApiParam({ name: 'idOrAbbr', description: 'Team id or abbreviation.' })
  @ApiResponse({ status: 200, description: 'Upcoming matches.', type: [SportEventRecordDto] })
  @ApiResponse({ status: 404, description: 'Team not found.' })
  async schedule(
    @Param('idOrAbbr') idOrAbbr: string,
    @Query() query: PaginationQuery,
  ) {
    return this.teamsService.getSchedule(idOrAbbr, query);
  }

  @Get(':idOrAbbr/results')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Team results', description: 'Completed matches for a team.' })
  @ApiParam({ name: 'idOrAbbr', description: 'Team id or abbreviation.' })
  @ApiResponse({ status: 200, description: 'Completed matches.', type: [SportEventRecordDto] })
  @ApiResponse({ status: 404, description: 'Team not found.' })
  async results(
    @Param('idOrAbbr') idOrAbbr: string,
    @Query() query: PaginationQuery,
  ) {
    return this.teamsService.getResults(idOrAbbr, query);
  }
}
