import { Module } from '@nestjs/common';
import {
  NewsController,
  AuthorsController,
  AuthorsAdminController,
  EditorialPagesController,
  EditorialPagesAdminController,
} from './news.controller.js';
import { NewsService } from './news.service.js';

@Module({
  controllers: [
    NewsController,
    AuthorsController,
    AuthorsAdminController,
    EditorialPagesController,
    EditorialPagesAdminController,
  ],
  providers: [NewsService],
  exports: [NewsService],
})
export class NewsModule {}
