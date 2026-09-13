import { Module } from '@nestjs/common';
import { PredictionsController } from './predictions.controller.js';
import { AdminPredictionsController } from './admin-predictions.controller.js';
import { PredictionsService } from './predictions.service.js';

@Module({
  controllers: [PredictionsController, AdminPredictionsController],
  providers: [PredictionsService],
  exports: [PredictionsService],
})
export class PredictionsModule {}
