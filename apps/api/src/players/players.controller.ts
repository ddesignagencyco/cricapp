import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Controller, Get, Param, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { PlayersService } from './players.service.js';
import { PlayerProfileDto as PlayerProfileResponse } from './players.service.js';
import { PlayerProfileDto } from './dto/player-profile.dto.js';
import { SearchPlayersQuery } from './dto/search-players.query.js';

@ApiTags('players')
@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Search players (paginated)', description: 'By name query and/or team abbreviation.' })
  @ApiQuery({ name: 'q', required: false, description: 'Name substring query.' })
  @ApiQuery({ name: 'team', required: false, description: 'Team abbreviation filter.' })
  @ApiResponse({ status: 200, description: 'Paginated matching players.' })
  async search(@Query() query: SearchPlayersQuery) {
    return this.playersService.search({
      q: query.q,
      team: query.team,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':playerId')
  @ApiOperation({ summary: 'Get a player profile', description: 'Player bio, team and recent matches.' })
  @ApiParam({ name: 'playerId', description: 'Provider player id (e.g. sr:player:1246946).' })
  @ApiQuery({ name: 'recent', required: false, description: 'Number of recent matches to include (max 20).' })
  @ApiResponse({ status: 200, description: 'The player profile.', type: PlayerProfileDto })
  @ApiResponse({ status: 404, description: 'Player not found.' })
  async profile(
    @Param('playerId') playerId: string,
    @Query('recent') recent?: string,
  ): Promise<PlayerProfileResponse> {
    const recentCount = recent ? Math.min(parseInt(recent, 10) || 0, 20) : 5;
    return this.playersService.getProfile(playerId, { recent: recentCount });
  }
}
