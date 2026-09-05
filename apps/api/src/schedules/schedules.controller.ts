import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SchedulesService, type SportEventRecordSummary } from './schedules.service.js';
import { SportEventRecordDto } from '../common/dto/sport-event-record.dto.js';

@ApiTags('schedules')
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get(':date')
  @ApiOperation({ summary: 'Daily schedule', description: 'All matches scheduled for a given date (YYYY-MM-DD).' })
  @ApiParam({ name: 'date', description: 'Date in YYYY-MM-DD format.', example: '2026-09-05' })
  @ApiResponse({ status: 200, description: 'Matches scheduled for the day.', type: [SportEventRecordDto] })
  schedule(@Param('date') date: string): Promise<SportEventRecordSummary[]> {
    return this.schedulesService.dailySchedule(date);
  }

  @Get(':date/results')
  @ApiOperation({ summary: 'Daily results', description: 'All matches completed on a given date (YYYY-MM-DD).' })
  @ApiParam({ name: 'date', description: 'Date in YYYY-MM-DD format.', example: '2026-09-05' })
  @ApiResponse({ status: 200, description: 'Matches completed for the day.', type: [SportEventRecordDto] })
  results(@Param('date') date: string): Promise<SportEventRecordSummary[]> {
    return this.schedulesService.dailyResults(date);
  }
}