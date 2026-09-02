import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PslService, type PslLeaderGroup, type PslSquad } from './psl.service.js';
import {
  PslFixtureDto,
  PslLeaderGroupDto,
  PslSquadDto,
  PslStandingDto,
} from './dto/psl.dto.js';
import { PslSeasonDto } from './dto/psl-season.dto.js';

@ApiTags('psl')
@Controller('psl')
export class PslController {
  constructor(private readonly pslService: PslService) {}

  @Get('seasons')
  @ApiOperation({ summary: 'List available PSL seasons' })
  @ApiResponse({ status: 200, description: 'Available PSL seasons.', type: [PslSeasonDto] })
  seasons(): PslSeasonDto[] {
    return this.pslService.seasons();
  }

  @Get('standings')
  @ApiOperation({ summary: 'PSL points table' })
  @ApiQuery({ name: 'season', required: false, description: 'Season id or year (e.g. sr:season:140552 or 2026). Defaults to latest.' })
  @ApiResponse({ status: 200, description: 'PSL standings for the season.', type: [PslStandingDto] })
  standings(@Query('season') season?: string) {
    return this.pslService.standings(season);
  }

  @Get('schedule')
  @ApiOperation({ summary: 'PSL fixtures / schedule' })
  @ApiQuery({ name: 'season', required: false, description: 'Season id or year. Defaults to latest.' })
  @ApiResponse({ status: 200, description: 'PSL fixtures for the season.', type: [PslFixtureDto] })
  schedule(@Query('season') season?: string) {
    return this.pslService.fixtures(season);
  }

  @Get('leaders')
  @ApiOperation({ summary: 'PSL statistical leaders' })
  @ApiQuery({ name: 'season', required: false, description: 'Season id or year. Defaults to latest.' })
  @ApiResponse({ status: 200, description: 'PSL leaders grouped by category/stat.', type: [PslLeaderGroupDto] })
  leaders(@Query('season') season?: string): Promise<PslLeaderGroup[]> {
    return this.pslService.leaders(season);
  }

  @Get('squads')
  @ApiOperation({ summary: 'PSL team squads / rosters' })
  @ApiQuery({ name: 'season', required: false, description: 'Season id or year. Defaults to latest.' })
  @ApiResponse({ status: 200, description: 'PSL squads for the season.', type: [PslSquadDto] })
  squads(@Query('season') season?: string): Promise<PslSquad[]> {
    return this.pslService.squads(season);
  }
}
