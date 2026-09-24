import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OddsService } from './odds.service.js';
import { regionFromHeaders } from './odds-compliance.util.js';
import {
  MatchOddsDto,
  OddsConvertDto,
  OddsConvertQuery,
  OddsHistoryDto,
  OddsHistoryQuery,
  OddsMarginBody,
} from './dto/odds.dto.js';

/** Dev/demo ids with seeded odds — run `npm run seed:odds-batch` in ingestion. */
const SWAGGER_ODDS_MATCH_EXAMPLE = 'sr:match:67132180';

@ApiTags('odds')
@Controller('odds')
export class OddsController {
  constructor(
    private readonly oddsService: OddsService,
    private readonly cfg: ConfigService,
  ) {}

  @Get('tools/convert')
  @ApiOperation({ summary: 'Convert decimal, fractional or American odds' })
  @ApiResponse({ status: 200, type: OddsConvertDto })
  convert(@Query() query: OddsConvertQuery) {
    return this.oddsService.convertOdds(query.from, query.value);
  }

  @Post('tools/margin')
  @ApiOperation({ summary: 'Bookmaker margin from decimal prices for all outcomes' })
  margin(@Body() body: OddsMarginBody) {
    return this.oddsService.marginFromDecimals(body.decimals ?? []);
  }

  @Get(':matchId/history')
  @ApiOperation({ summary: 'Odds history series for charts' })
  @ApiParam({
    name: 'matchId',
    example: SWAGGER_ODDS_MATCH_EXAMPLE,
    description:
      'Sportradar match id. Must exist in `matches` and have licensed snapshots (dev: seed:odds-batch).',
  })
  @ApiResponse({ status: 200, type: OddsHistoryDto })
  @ApiResponse({ status: 404, description: 'Match not in database or no odds markets for this match.' })
  history(
    @Param('matchId') matchId: string,
    @Query() query: OddsHistoryQuery,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.oddsService.getHistory(matchId, query, regionFromHeaders(this.cfg, headers));
  }

  @Get(':matchId')
  @ApiOperation({
    summary: 'Licensed odds comparison for a match',
    description:
      'Compares stored prices across authorized sources. Best displayed price is informational only.',
  })
  @ApiParam({
    name: 'matchId',
    example: SWAGGER_ODDS_MATCH_EXAMPLE,
    description:
      'Sportradar match id. Example is England vs Sri Lanka with demo odds. Use seed:odds-batch for more.',
  })
  @ApiResponse({ status: 200, type: MatchOddsDto })
  @ApiResponse({ status: 403, description: 'Odds disabled for region or environment.' })
  @ApiResponse({ status: 404, description: 'Match id not in `matches` table (not a missing-odds case).' })
  getMatch(
    @Param('matchId') matchId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.oddsService.getMatchOdds(matchId, regionFromHeaders(this.cfg, headers));
  }
}
