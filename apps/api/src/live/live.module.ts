import { Module } from '@nestjs/common';
import { LiveController } from './live.controller.js';
import { LiveService } from './live.service.js';
import { LiveGateway } from './live.gateway.js';

@Module({
  controllers: [LiveController],
  providers: [LiveService, LiveGateway],
  exports: [LiveService],
})
export class LiveModule {}
