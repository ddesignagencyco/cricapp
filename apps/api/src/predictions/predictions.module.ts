import { Module } from '@nestjs/common';
import { PredictionsController } from './predictions.controller.js';
import { AdminPredictionsController } from './admin-predictions.controller.js';
import { PredictionsService } from './predictions.service.js';
import { PredictionNarrativeService } from './prediction-narrative.service.js';

@Module({
  controllers: [PredictionsController, AdminPredictionsController],
  providers: [PredictionsService, PredictionNarrativeService],
  exports: [PredictionsService],
})
export class PredictionsModule {}
