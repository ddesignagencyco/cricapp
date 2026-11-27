import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { RssFeedsService } from './rss-feeds.service.js';
import {
  CreateRssFeedDto,
  PreviewRssFeedDto,
  UpdateRssFeedDto,
} from './dto/rss-feed.dto.js';

@ApiTags('admin/rss-feeds')
@ApiCookieAuth()
@Controller('admin/rss-feeds')
@UseGuards(JwtAuthGuard, AdminGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class RssFeedsController {
  constructor(private readonly rssFeedsService: RssFeedsService) {}

  @Get()
  @ApiOperation({ summary: 'List all configured RSS autoblogging feed sources' })
  @ApiResponse({ status: 200, description: 'List of RSS feed sources.' })
  async list() {
    return this.rssFeedsService.list();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new RSS feed source' })
  @ApiResponse({ status: 201, description: 'RSS feed created.' })
  async create(@Body() dto: CreateRssFeedDto) {
    return this.rssFeedsService.create(dto);
  }

  @Post('preview')
  @ApiOperation({ summary: 'Fetch an RSS feed and preview topic-filtered items without saving' })
  @ApiResponse({ status: 200, description: 'Matched and skipped feed items.' })
  async preview(@Body() dto: PreviewRssFeedDto) {
    return this.rssFeedsService.preview(dto);
  }

  @Post('dissolve-existing')
  @ApiOperation({ summary: 'Strip outbound hyperlinks and copyright boilerplate from existing RSS-imported articles' })
  async dissolveExisting() {
    return this.rssFeedsService.dissolveExistingOutboundLinks();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an RSS feed source' })
  async update(@Param('id') id: string, @Body() dto: UpdateRssFeedDto) {
    return this.rssFeedsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an RSS feed source' })
  async remove(@Param('id') id: string) {
    return this.rssFeedsService.remove(id);
  }

  @Post(':id/sync')
  @ApiOperation({ summary: 'Trigger an immediate sync for a single RSS feed source' })
  async syncOne(@Param('id') id: string) {
    return this.rssFeedsService.syncOne(id);
  }
}
