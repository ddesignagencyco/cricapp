import { Module } from '@nestjs/common';
import { StreamsController } from './streams.controller.js';
import { StreamsService } from './streams.service.js';
import { CommentsModule } from '../comments/comments.module.js';

@Module({
  imports: [CommentsModule],
  controllers: [StreamsController],
  providers: [StreamsService],
  exports: [StreamsService],
})
export class StreamsModule {}
