import { Module } from '@nestjs/common';
import { RssFeedsController } from './rss-feeds.controller.js';
import { RssFeedsService } from './rss-feeds.service.js';

@Module({
  controllers: [RssFeedsController],
  providers: [RssFeedsService],
  exports: [RssFeedsService],
})
export class RssFeedsModule {}
