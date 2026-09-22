import { Global, Module } from '@nestjs/common';
import { SportradarService } from './sportradar.service.js';

@Global()
@Module({
  providers: [SportradarService],
  exports: [SportradarService],
})
export class SportradarModule {}
