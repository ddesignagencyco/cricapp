import { Controller, Get, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PslService } from './psl.service.js';
import { PslQuery } from './dto/psl.query.js';

@ApiTags('psl')
@Controller('psl')
export class PslController {
  constructor(private readonly pslService: PslService) {}

  @Get('seasons')
  @ApiOperation({ summary: 'List available PSL seasons' })
  @ApiResponse({ status: 200, description: 'Available PSL seasons.' })
  seasons() {
    return this.pslService.seasons();
  }

  @Get('standings')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'PSL points table (paginated)' })
  @ApiQuery({ name: 'season', required: false, description: 'Season id or year. Defaults to latest.' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Paginated PSL standings.' })
  standings(@Query() query: PslQuery) {
    return this.pslService.standings(query.season, query);
  }

  @Get('schedule')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'PSL fixtures / schedule (paginated)' })
  @ApiQuery({ name: 'season', required: false, description: 'Season id or year. Defaults to latest.' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Paginated PSL fixtures.' })
  schedule(@Query() query: PslQuery) {
    return this.pslService.fixtures(query.season, query);
  }

  @Get('leaders')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'PSL statistical leaders (paginated)' })
  @ApiQuery({ name: 'season', required: false, description: 'Season id or year. Defaults to latest.' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Paginated PSL leaders.' })
  leaders(@Query() query: PslQuery) {
    return this.pslService.leaders(query.season, query);
  }

  @Get('squads')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'PSL team squads / rosters (paginated)' })
  @ApiQuery({ name: 'season', required: false, description: 'Season id or year. Defaults to latest.' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Paginated PSL squads.' })
  squads(@Query() query: PslQuery) {
    return this.pslService.squads(query.season, query);
  }
}
