import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import {
  SiteSettingsResponseDto,
  UpdateSiteSettingsDto,
} from './dto/site-settings.dto.js';
import { SiteSettingsService } from './site-settings.service.js';

@ApiTags('site-settings')
@Controller('site-settings')
export class SiteSettingsController {
  constructor(private readonly siteSettingsService: SiteSettingsService) {}

  @Get()
  @ApiOperation({
    summary: 'Public site settings',
    description: 'Contact details, office location and social links for the public site.',
  })
  @ApiResponse({ status: 200, type: SiteSettingsResponseDto })
  getPublic(): Promise<SiteSettingsResponseDto> {
    return this.siteSettingsService.getPublic();
  }
}

@ApiTags('admin')
@ApiCookieAuth()
@Controller('admin/site-settings')
@UseGuards(JwtAuthGuard, AdminGuard)
export class SiteSettingsAdminController {
  constructor(private readonly siteSettingsService: SiteSettingsService) {}

  @Put()
  @ApiOperation({ summary: 'Update site settings (admin)' })
  @ApiResponse({ status: 200, type: SiteSettingsResponseDto })
  update(@Body() dto: UpdateSiteSettingsDto): Promise<SiteSettingsResponseDto> {
    return this.siteSettingsService.update(dto);
  }
}
