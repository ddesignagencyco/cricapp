import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { PlayersService } from './players.service.js';
import { PlayerProfileDto as PlayerProfileResponse } from './players.service.js';
import { PlayerProfileDto } from './dto/player-profile.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

@ApiTags('players')
@Controller('players')
export class PlayersController {
  constructor(
    private readonly playersService: PlayersService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Search players', description: 'By name query and/or team abbreviation.' })
  @ApiQuery({ name: 'q', required: false, description: 'Name substring query.' })
  @ApiQuery({ name: 'team', required: false, description: 'Team abbreviation filter.' })
  @ApiResponse({ status: 200, description: 'Matching players.' })
  async search(@Query('q') query?: string, @Query('team') teamAbbr?: string) {
    return this.prisma.player.findMany({
      where: {
        ...(query
          ? {
              OR: [
                { fullName: { contains: query, mode: 'insensitive' } },
                { shortName: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(teamAbbr ? { team: { abbr: teamAbbr } } : {}),
      },
      take: 50,
      orderBy: [{ fullName: 'asc' }],
      select: {
        id: true,
        fullName: true,
        shortName: true,
        role: true,
        nationality: true,
        team: { select: { id: true, name: true, abbr: true } },
      },
    });
  }

  @Get(':playerId')
  @ApiOperation({ summary: 'Get a player profile', description: 'Player bio, team and recent matches.' })
  @ApiParam({ name: 'playerId', description: 'Provider player id (e.g. sr:player:1246946).' })
  @ApiQuery({ name: 'recent', required: false, description: 'Number of recent matches to include (max 20).' })
  @ApiResponse({ status: 200, description: 'The player profile.' })
  @ApiResponse({ status: 404, description: 'Player not found.' })
  async profile(
    @Param('playerId') playerId: string,
    @Query('recent') recent?: string,
  ): Promise<PlayerProfileResponse> {
    const recentCount = recent ? Math.min(parseInt(recent, 10) || 0, 20) : 5;
    return this.playersService.getProfile(playerId, { recent: recentCount });
  }
}
