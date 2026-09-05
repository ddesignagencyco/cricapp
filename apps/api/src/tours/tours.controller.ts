import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ToursService, type TourSummary } from './tours.service.js';
import { TourDto } from './dto/tour.dto.js';

@ApiTags('tours')
@Controller('tours')
export class ToursController {
  constructor(private readonly toursService: ToursService) {}

  @Get()
  @ApiOperation({ summary: 'List cricket tours' })
  @ApiResponse({ status: 200, description: 'All cricket tours.', type: [TourDto] })
  list(): Promise<TourSummary[]> {
    return this.toursService.list();
  }
}