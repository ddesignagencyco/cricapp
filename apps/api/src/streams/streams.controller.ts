import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { StreamsService } from './streams.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { CreateStreamDto, UpdateStreamDto, StreamListQuery, LiveStreamDto } from './dto/streams.dto.js';

@ApiTags('streams')
@Controller('streams')
export class StreamsController {
  constructor(private readonly streamsService: StreamsService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'List live streams (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated streams.' })
  async list(@Query() query: StreamListQuery) {
    return this.streamsService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get stream detail' })
  @ApiParam({ name: 'id', description: 'Stream ID' })
  @ApiResponse({ status: 200, type: LiveStreamDto })
  @ApiResponse({ status: 404, description: 'Stream not found.' })
  async getById(@Param('id') id: string) {
    return this.streamsService.getById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a live stream (admin)' })
  @ApiResponse({ status: 201, type: LiveStreamDto })
  async create(@Body() dto: CreateStreamDto) {
    return this.streamsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a live stream (admin)' })
  @ApiParam({ name: 'id', description: 'Stream ID' })
  @ApiResponse({ status: 200, type: LiveStreamDto })
  @ApiResponse({ status: 404, description: 'Stream not found.' })
  async update(@Param('id') id: string, @Body() dto: UpdateStreamDto) {
    return this.streamsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a live stream (admin)' })
  @ApiParam({ name: 'id', description: 'Stream ID' })
  @ApiResponse({ status: 200, description: 'Deleted.' })
  @ApiResponse({ status: 404, description: 'Stream not found.' })
  async remove(@Param('id') id: string) {
    return this.streamsService.remove(id);
  }
}
