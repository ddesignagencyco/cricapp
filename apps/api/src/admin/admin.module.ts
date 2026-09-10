import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { NewsModule } from '../news/news.module.js';

@Module({
  imports: [NewsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
