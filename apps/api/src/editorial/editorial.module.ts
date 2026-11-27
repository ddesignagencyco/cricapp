import { Module } from '@nestjs/common';
import { NewsModule } from '../news/news.module.js';
import { EditorialController } from './editorial.controller.js';
import { EditorialService } from './editorial.service.js';

@Module({
  imports: [NewsModule],
  controllers: [EditorialController],
  providers: [EditorialService],
  exports: [EditorialService],
})
export class EditorialModule {}
