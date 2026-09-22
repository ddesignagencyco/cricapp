import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { OddsService } from './odds.service.js';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/odds')
export class AdminOddsController {
  constructor(private readonly oddsService: OddsService) {}

  @Get('sources/health')
  @ApiOperation({ summary: 'Odds feed health and stale-price detection' })
  sourceHealth() {
    return this.oddsService.adminSourceHealth();
  }
}
