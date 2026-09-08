import { Controller, Get, Param, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SchedulesService } from './schedules.service.js';
import { PaginationQuery } from '../common/dto/pagination.query.js';

@ApiTags('schedules')
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get(':date')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Daily schedule (paginated)', description: 'All matches scheduled for a given date (YYYY-MM-DD).' })
  @ApiParam({ name: 'date', description: 'Date in YYYY-MM-DD format.', example: '2026-09-05' })
  @ApiResponse({ status: 200, description: 'Paginated matches scheduled for the day.' })
  schedule(@Param('date') date: string, @Query() query: PaginationQuery) {
    return this.schedulesService.dailySchedule(date, query);
  }

  @Get(':date/results')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Daily results (paginated)', description: 'All matches completed on a given date (YYYY-MM-DD).' })
  @ApiParam({ name: 'date', description: 'Date in YYYY-MM-DD format.', example: '2026-09-05' })
  @ApiResponse({ status: 200, description: 'Paginated matches completed for the day.' })
  results(@Param('date') date: string, @Query() query: PaginationQuery) {
    return this.schedulesService.dailyResults(date, query);
  }
}
