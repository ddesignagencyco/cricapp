import { Module } from '@nestjs/common';
import { PredictionsModule } from '../predictions/predictions.module.js';
import { OddsController } from './odds.controller.js';
import { AdminOddsController } from './admin-odds.controller.js';
import { OddsService } from './odds.service.js';

@Module({
  imports: [PredictionsModule],
  controllers: [OddsController, AdminOddsController],
  providers: [OddsService],
  exports: [OddsService],
})
export class OddsModule {}
