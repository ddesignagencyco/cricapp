import { Controller, Get, Query, UseGuards, Request, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { NotificationsService } from './notifications.service.js';
import { PaginationQuery } from '../common/dto/pagination.query.js';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
export class NotificationsHistoryController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('history')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'List notification history for the current user' })
  @ApiResponse({ status: 200, description: 'Paginated notification log.' })
  async history(
    @Request() req: { user: { id: string } },
    @Query() query: PaginationQuery,
  ) {
    return this.notificationsService.listHistory(req.user.id, query);
  }
}
