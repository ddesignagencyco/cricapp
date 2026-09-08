import { Controller, Get, Param, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TournamentsService } from './tournaments.service.js';
import { TournamentDto } from './dto/tournament.dto.js';
import { PaginationQuery } from '../common/dto/pagination.query.js';

@ApiTags('tournaments')
@Controller('tournaments')
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'List tournaments / competitions (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated tournaments.' })
  list(@Query() query: PaginationQuery) {
    return this.tournamentsService.list(query);
  }

  @Get(':tournamentId')
  @ApiOperation({ summary: 'Get a tournament by id' })
  @ApiParam({ name: 'tournamentId', description: 'Tournament id (e.g. sr:tournament:14931).' })
  @ApiResponse({ status: 200, description: 'Tournament record.', type: TournamentDto })
  @ApiResponse({ status: 404, description: 'Tournament not found.' })
  byId(@Param('tournamentId') tournamentId: string) {
    return this.tournamentsService.getById(tournamentId);
  }

  @Get(':tournamentId/seasons')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'List seasons for a tournament (paginated)' })
  @ApiParam({ name: 'tournamentId', description: 'Tournament id.' })
  @ApiResponse({ status: 200, description: 'Paginated seasons for the tournament.' })
  seasons(
    @Param('tournamentId') tournamentId: string,
    @Query() query: PaginationQuery,
  ) {
    return this.tournamentsService.seasons(tournamentId, query);
  }

  @Get(':tournamentOrSeasonId/results')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Results for a tournament or season (paginated)', description: 'Every completed match within the given tournament or season.' })
  @ApiParam({ name: 'tournamentOrSeasonId', description: 'Tournament or season id.' })
  @ApiResponse({ status: 200, description: 'Paginated match results.' })
  results(
    @Param('tournamentOrSeasonId') id: string,
    @Query() query: PaginationQuery,
  ) {
    return this.tournamentsService.results(id, query);
  }
}
