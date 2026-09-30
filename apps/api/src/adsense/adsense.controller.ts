import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { AdSenseService, parseIsoDate, type AdSenseReportOptions } from './adsense.service.js';
import { AdSenseAdUnitsQuery, AdSenseReportQuery } from './dto/adsense-query.dto.js';
import {
  AdSenseAdUnitsResponseDto,
  AdSensePolicyIssuesResponseDto,
  AdSenseReportResponseDto,
  AdSenseStatusDto,
} from './adsense.types.js';

const DEFAULT_DIMENSIONS = ['DATE'] as const;
const DEFAULT_METRICS = ['ESTIMATED_EARNINGS', 'PAGE_VIEWS', 'IMPRESSIONS', 'IMPRESSIONS_RPM'] as const;

@ApiTags('adsense')
@ApiCookieAuth()
@Controller('admin/adsense')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdSenseAdminController {
  constructor(private readonly adsense: AdSenseService) {}

  @Get('status')
  @ApiOperation({
    summary: 'AdSense Management API status',
    description:
      'Reports whether the Management API is configured and which account/ad client ids are pinned via environment variables. Makes no upstream call.',
  })
  @ApiResponse({ status: 200, type: AdSenseStatusDto })
  getStatus(): AdSenseStatusDto {
    return this.adsense.getStatus();
  }

  @Get('ad-units')
  @ApiOperation({
    summary: 'List AdSense ad units',
    description:
      'Ad units for the resolved ad client, ready to populate the admin slot dropdown. Returns the bare numeric id for `data-ad-slot` as `slotId`; `reportingDimensionId` is the separate `ca-pub-…:…` reporting id.',
  })
  @ApiResponse({ status: 200, type: AdSenseAdUnitsResponseDto })
  async listAdUnits(@Query() query: AdSenseAdUnitsQuery): Promise<AdSenseAdUnitsResponseDto> {
    return this.adsense.listAdUnits(query.includeArchived ?? false);
  }

  @Get('policy-issues')
  @ApiOperation({
    summary: 'List AdSense policy issues',
    description:
      'Active policy issues for the account, most severe first, with a summary of how many are disabled, restricted or merely warned.',
  })
  @ApiResponse({ status: 200, type: AdSensePolicyIssuesResponseDto })
  listPolicyIssues(): Promise<AdSensePolicyIssuesResponseDto> {
    return this.adsense.listPolicyIssues();
  }

  @Get('reports')
  @ApiOperation({
    summary: 'AdSense earnings report',
    description:
      'Ad hoc report from `reports:generate`. Dimensions and metrics are restricted to allowlists and a custom range is capped at 400 days.',
  })
  @ApiResponse({ status: 200, type: AdSenseReportResponseDto })
  generateReport(@Query() query: AdSenseReportQuery): Promise<AdSenseReportResponseDto> {
    if (Boolean(query.startDate) !== Boolean(query.endDate)) {
      throw new BadRequestException('startDate and endDate must be supplied together.');
    }

    let startDate: AdSenseReportOptions['startDate'] = null;
    let endDate: AdSenseReportOptions['endDate'] = null;
    if (query.startDate && query.endDate) {
      try {
        startDate = parseIsoDate(query.startDate);
        endDate = parseIsoDate(query.endDate);
      } catch (err) {
        throw new BadRequestException(err instanceof Error ? err.message : 'Invalid date range.');
      }
    }

    return this.adsense.generateReport({
      dateRange: startDate ? 'CUSTOM' : query.dateRange,
      startDate,
      endDate,
      dimensions: (query.dimensions ?? [...DEFAULT_DIMENSIONS]) as AdSenseReportOptions['dimensions'],
      metrics: (query.metrics ?? [...DEFAULT_METRICS]) as AdSenseReportOptions['metrics'],
      adUnitId: query.adUnitId ?? null,
      limit: query.limit,
      timeZone: query.timeZone ?? null,
      currencyCode: query.currencyCode ?? null,
    });
  }
}
