import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PredictionsService } from './predictions.service.js';
import {
  MatchPredictionsDto,
  PredictionHistoryDto,
  PredictionPerformanceDto,
  PredictionPerformanceHistoryDto,
  PredictionPerformanceHistoryQuery,
  PredictionPerformanceQuery,
  PredictionChartDto,
} from './dto/predictions.dto.js';

@ApiTags('predictions')
@Controller('predictions')
export class PredictionsController {
  constructor(private readonly predictionsService: PredictionsService) {}

  @Get('performance')
  @ApiOperation({
    summary: 'Public prediction performance',
    description:
      'Prediction accuracy on settled matches for a stage and model version, grouped by format and confidence band.',
  })
  @ApiResponse({ status: 200, description: 'Accuracy summary.', type: PredictionPerformanceDto })
  getPerformance(@Query() query: PredictionPerformanceQuery) {
    return this.predictionsService.getPerformance(query);
  }

  @Get('performance/history')
  @ApiOperation({
    summary: 'Prediction performance history',
    description: 'Recorded accuracy/Brier/ECE snapshots over time for a stage and model version.',
  })
  @ApiResponse({
    status: 200,
    description: 'Chronological performance snapshots.',
    type: PredictionPerformanceHistoryDto,
  })
  getPerformanceHistory(@Query() query: PredictionPerformanceHistoryQuery) {
    return this.predictionsService.listPerformanceHistory(query);
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
