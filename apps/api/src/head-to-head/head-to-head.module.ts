import { Module } from '@nestjs/common';
import { HeadToHeadController } from './head-to-head.controller.js';
import { HeadToHeadService } from './head-to-head.service.js';

@Module({
  controllers: [HeadToHeadController],
  providers: [HeadToHeadService],
  exports: [HeadToHeadService],
})
export class HeadToHeadModule {}