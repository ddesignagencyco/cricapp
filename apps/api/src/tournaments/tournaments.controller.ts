import { Controller, Get, Param, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  TournamentsService,
  type SportEventRecordSummary,
  type TournamentSeasonSummary,
  type TournamentSummary,
} from './tournaments.service.js';
import { TournamentDto, TournamentSeasonDto } from './dto/tournament.dto.js';
import { SportEventRecordDto } from '../common/dto/sport-event-record.dto.js';
import { PaginationQuery } from '../common/dto/pagination.query.js';

@ApiTags('tournaments')
@Controller('tournaments')
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'List tournaments / competitions' })
  @ApiResponse({ status: 200, description: 'All tournaments.', type: [TournamentDto] })
  list(@Query() query: PaginationQuery): Promise<TournamentSummary[]> {
    return this.tournamentsService.list(query);
  }

  @Get(':tournamentId')
  @ApiOperation({ summary: 'Get a tournament by id' })
  @ApiParam({ name: 'tournamentId', description: 'Tournament id (e.g. sr:tournament:14931).' })
  @ApiResponse({ status: 200, description: 'Tournament record.', type: TournamentDto })
  @ApiResponse({ status: 404, description: 'Tournament not found.' })
  byId(@Param('tournamentId') tournamentId: string): Promise<TournamentSummary> {
    return this.tournamentsService.getById(tournamentId);
  }

  @Get(':tournamentId/seasons')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'List seasons for a tournament' })
  @ApiParam({ name: 'tournamentId', description: 'Tournament id.' })
  @ApiResponse({ status: 200, description: 'Seasons for the tournament.', type: [TournamentSeasonDto] })
  seasons(
    @Param('tournamentId') tournamentId: string,
    @Query() query: PaginationQuery,
  ): Promise<TournamentSeasonSummary[]> {
    return this.tournamentsService.seasons(tournamentId, query);
  }

  @Get(':tournamentOrSeasonId/results')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Results for a tournament or season', description: 'Every completed match within the given tournament or season, returning the full Sportradar sport_event payload.' })
  @ApiParam({ name: 'tournamentOrSeasonId', description: 'Tournament or season id (e.g. sr:tournament:2472, sr:season:140552).' })
  @ApiResponse({ status: 200, description: 'Match results.', type: [SportEventRecordDto] })
  results(
    @Param('tournamentOrSeasonId') id: string,
    @Query() query: PaginationQuery,
  ): Promise<SportEventRecordSummary[]> {
    return this.tournamentsService.results(id, query);
  }
}