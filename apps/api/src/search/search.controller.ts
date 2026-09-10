import { Controller, Get, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service.js';
import { SearchResultsDto, UnifiedSearchQuery } from './dto/search.dto.js';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Unified search across players, teams, matches and tournaments' })
  @ApiResponse({ status: 200, type: SearchResultsDto })
  async search(@Query() query: UnifiedSearchQuery) {
    return this.searchService.searchAll(query);
  }
}
