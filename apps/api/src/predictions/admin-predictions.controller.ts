import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import {
  AdminPredictionCalibrationQuery,
  AdminPredictionRunsQuery,
} from './dto/predictions.dto.js';
import { PredictionsService } from './predictions.service.js';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/predictions')
export class AdminPredictionsController {
  constructor(private readonly predictionsService: PredictionsService) {}

  @Get('model-versions')
  @ApiOperation({ summary: 'List prediction model versions and run counts' })
  listModels() {
    return this.predictionsService.listModelVersions();
  }

  @Get('calibration')
  @ApiOperation({ summary: 'Get reliability bins for model recalibration' })
  calibration(@Query() query: AdminPredictionCalibrationQuery) {
    return this.predictionsService.getCalibration(query.modelVersion, query.bins);
  }

  @Get('runs')
  @ApiOperation({ summary: 'Review paginated prediction history' })
  listRuns(@Query() query: AdminPredictionRunsQuery) {
    return this.predictionsService.listRuns(query);
  }

  @Get('runs/:runId')
  @ApiOperation({ summary: 'Review one prediction run with its input snapshot' })
  getRun(@Param('runId') runId: string) {
    return this.predictionsService.getRun(runId);
  }
}
