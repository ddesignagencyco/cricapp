import { Module } from '@nestjs/common';
import { PredictionsController } from './predictions.controller.js';
import { PredictionsService } from './predictions.service.js';

@Module({
  controllers: [PredictionsController],
  providers: [PredictionsService],
  exports: [PredictionsService],
})
export class PredictionsModule {}
