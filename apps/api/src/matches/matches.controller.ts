import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MatchesService } from './matches.service.js';
import { MatchSummaryDto } from './dto/match-summary.dto.js';
import { MatchTimelineDto } from './dto/match-timeline.dto.js';
import { ListMatchesQuery } from './dto/list-matches.query.js';

@ApiTags('matches')
@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'List matches (paginated)', description: 'All matches (live, upcoming, completed, cancelled) with status/tournament filters and pagination. Ordered live first, then soonest upcoming, then most recent finished.' })
  @ApiResponse({ status: 200, description: 'Paginated match summaries.' })
  async list(@Query() query: ListMatchesQuery) {
    return this.matchesService.list(query);
  }

  @Get('live')
  @ApiOperation({ summary: 'List live matches', description: 'Live matches, preferring the Redis live-set then falling back to Postgres.' })
  @ApiResponse({ status: 200, description: 'Live match summaries.' })
  async listLive() {
    return this.matchesService.listLive();
  }

  @Get(':matchId/timeline')
  @ApiOperation({ summary: 'Match timeline', description: 'Ball-by-ball timeline for a match. Pass `?since=<revision>` to receive only newer events.' })
  @ApiParam({ name: 'matchId', description: 'Provider match id (e.g. sr:match:66650320).' })
  @ApiResponse({ status: 200, description: 'The match timeline payload.', type: MatchTimelineDto })
  @ApiResponse({ status: 404, description: 'Timeline not found.' })
  async timeline(
    @Param('matchId') matchId: string,
    @Query('since') since?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const sinceNum =
      since != null && since.trim() !== '' && !Number.isNaN(Number(since))
        ? Number(since)
        : null;
    const body = await this.matchesService.getTimeline(matchId, sinceNum);
    if (body.noNewEvents) {
      res!.status(204);
      return undefined;
    }
    return body;
  }

  @Get(':matchId')
  @ApiOperation({ summary: 'Get a match by id', description: 'Cached live match state first, then Postgres.' })
  @ApiParam({ name: 'matchId', description: 'Provider match id (e.g. sr:match:66650320).' })
  @ApiResponse({ status: 200, description: 'The match summary.', type: MatchSummaryDto })
  @ApiResponse({ status: 404, description: 'Match not found.' })
  async byId(@Param('matchId') matchId: string) {
    return this.matchesService.getById(matchId);
  }
}
