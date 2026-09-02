import { Module } from '@nestjs/common';
import { PslController } from './psl.controller.js';
import { PslService } from './psl.service.js';

@Module({
  controllers: [PslController],
  providers: [PslService],
  exports: [PslService],
})
export class PslModule {}
