import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HeadToHeadService, type HeadToHeadResult } from './head-to-head.service.js';
import { HeadToHeadDto } from './dto/head-to-head.dto.js';

@ApiTags('head-to-head')
@Controller('head-to-head')
export class HeadToHeadController {
  constructor(private readonly headToHeadService: HeadToHeadService) {}

  @Get(':teamAId/:teamBId')
  @ApiOperation({
    summary: 'Head-to-head between two teams',
    description: 'Previous and upcoming meetings between two teams, returning the full Sportradar payload.',
  })
  @ApiParam({ name: 'teamAId', description: 'First team id (e.g. sr:competitor:107203).' })
  @ApiParam({ name: 'teamBId', description: 'Second team id (e.g. sr:competitor:142690).' })
  @ApiResponse({ status: 200, description: 'Head-to-head meetings.', type: HeadToHeadDto })
  @ApiResponse({ status: 404, description: 'No records available.' })
  get(
    @Param('teamAId') teamAId: string,
    @Param('teamBId') teamBId: string,
  ): Promise<HeadToHeadResult> {
    return this.headToHeadService.get(teamAId, teamBId);
  }
}