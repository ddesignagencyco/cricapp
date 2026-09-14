import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module.js';
import { GalleryController } from './gallery.controller.js';
import { GalleryService } from './gallery.service.js';

@Module({
  imports: [MediaModule],
  controllers: [GalleryController],
  providers: [GalleryService],
})
export class GalleryModule {}
