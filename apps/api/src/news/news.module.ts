import { Module } from '@nestjs/common';
import { GalleryModule } from '../gallery/gallery.module.js';
import {
  NewsController,
  AuthorsController,
  AuthorsAdminController,
  EditorialPagesController,
  EditorialPagesAdminController,
} from './news.controller.js';
import { NewsService } from './news.service.js';

@Module({
  imports: [GalleryModule],
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
