import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PredictionsService } from './predictions.service.js';
import {
  MatchPredictionsDto,
  PredictionHistoryDto,
  PredictionPerformanceDto,
  PredictionChartDto,
} from './dto/predictions.dto.js';

@ApiTags('predictions')
@Controller('predictions')
export class PredictionsController {
  constructor(private readonly predictionsService: PredictionsService) {}

  @Get('performance')
  @ApiOperation({
    summary: 'Public prediction performance',
    description: 'Accuracy of the latest pre-match run on settled matches, grouped by format.',
  })
  @ApiResponse({ status: 200, description: 'Accuracy summary.', type: PredictionPerformanceDto })
  getPerformance() {
    return this.predictionsService.getPerformance();
  }

  @Get(':matchId/history')
  @ApiOperation({
    summary: 'Prediction history for a match',
    description: 'Append-only time series of pre-match and live prediction runs, with explanation copy.',
  })
  @ApiParam({ name: 'matchId', description: 'Provider match id (e.g. sr:match:58145219).' })
  @ApiResponse({ status: 200, description: 'Prediction runs in chronological order.', type: PredictionHistoryDto })
  getHistory(@Param('matchId') matchId: string) {
    return this.predictionsService.getHistory(matchId);
  }

  @Get(':matchId/chart')
  @ApiOperation({ summary: 'Chart-ready probability history for a match' })
  @ApiResponse({ status: 200, description: 'Chronological probability points.', type: PredictionChartDto })
  getChart(@Param('matchId') matchId: string) {
    return this.predictionsService.getChart(matchId);
  }

  @Get(':matchId')
  @ApiOperation({
    summary: 'Latest predictions for a match',
    description: 'Latest pre-match and live winner probabilities plus explanation copy of those stored runs.',
  })
  @ApiParam({ name: 'matchId', description: 'Provider match id (e.g. sr:match:58145219).' })
  @ApiResponse({ status: 200, description: 'Latest pre-match and live predictions.', type: MatchPredictionsDto })
  @ApiResponse({ status: 404, description: 'No predictions stored for this match.' })
  getLatest(@Param('matchId') matchId: string) {
    return this.predictionsService.getLatest(matchId);
  }
}
