import {
  Controller,
  Get,
  Param,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MatchesService } from './matches.service.js';
import type { MatchSummary as MatchSummaryResponse } from './matches.service.js';
import { MatchSummaryDto } from './dto/match-summary.dto.js';
import { ListMatchesQuery } from './dto/list-matches.query.js';

@ApiTags('matches')
@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'List matches', description: 'Filter by status and/or tournament with pagination.' })
  @ApiResponse({ status: 200, description: 'Matching match summaries.', type: [MatchSummaryDto] })
  async list(@Query() query: ListMatchesQuery): Promise<MatchSummaryResponse[]> {
    return this.matchesService.list(query);
  }

  @Get('live')
  @ApiOperation({ summary: 'List live matches', description: 'Live matches, preferring the Redis live-set then falling back to Postgres.' })
  @ApiResponse({ status: 200, description: 'Live match summaries.', type: [MatchSummaryDto] })
  async listLive(): Promise<MatchSummaryResponse[]> {
    return this.matchesService.listLive();
  }

  @Get(':matchId')
  @ApiOperation({ summary: 'Get a match by id', description: 'Cached live match state first, then Postgres.' })
  @ApiParam({ name: 'matchId', description: 'Provider match id (e.g. sr:match:66650320).' })
  @ApiResponse({ status: 200, description: 'The match summary.', type: MatchSummaryDto })
  @ApiResponse({ status: 404, description: 'Match not found.' })
  async byId(@Param('matchId') matchId: string): Promise<MatchSummaryResponse> {
    return this.matchesService.getById(matchId);
  }
}
