import { Controller, Get, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ToursService } from './tours.service.js';
import { ListToursQuery } from './dto/tour.dto.js';

@ApiTags('tours')
@Controller('tours')
export class ToursController {
  constructor(private readonly toursService: ToursService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'List cricket tours (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated cricket tours.' })
  list(@Query() query: ListToursQuery) {
    return this.toursService.list(query);
  }
}