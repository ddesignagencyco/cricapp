import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MediaService } from '../media/media.service.js';
import {
  createPaginatedResponse,
  getPaginationOffset,
} from '../common/pagination/pagination.util.js';
import type {
  GalleryListQuery,
  UploadGalleryMediaDto,
} from './dto/gallery.dto.js';

@Injectable()
export class GalleryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  async list(query: GalleryListQuery) {
    const { page, limit, skip } = getPaginationOffset(
      query.page,
      query.limit,
      query.offset,
    );
    const where = query.type ? { type: query.type } : {};
    const [rows, total] = await Promise.all([
      this.prisma.galleryMedia.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.galleryMedia.count({ where }),
    ]);
    return createPaginatedResponse(rows, total, page, limit);
  }

  async getById(id: string) {
    const media = await this.prisma.galleryMedia.findUnique({ where: { id } });
    if (!media) throw new NotFoundException('Gallery media not found');
    return media;
  }

  async upload(file: Express.Multer.File, dto: UploadGalleryMediaDto) {
    const expectsImage = dto.type === 'image';
    if (expectsImage !== file.mimetype.startsWith('image/')) {
      throw new BadRequestException(
        expectsImage
          ? 'Gallery type image requires an image file'
          : `Gallery type ${dto.type} requires a video file`,
      );
    }

    const uploaded = await this.media.uploadGalleryMedia(file, dto.type);
    try {
      return await this.prisma.galleryMedia.create({
        data: {
          title: dto.title?.trim() || null,
          caption: dto.caption?.trim() || null,
          type: dto.type,
          url: uploaded.url,
          publicId: uploaded.publicId,
          resourceType: uploaded.resourceType,
          thumbnailUrl: uploaded.thumbnailUrl,
          duration: uploaded.duration,
          width: uploaded.width,
          height: uploaded.height,
          format: uploaded.format,
          bytes: uploaded.bytes,
        },
      });
    } catch (error) {
      await this.media
        .destroy(uploaded.publicId, uploaded.resourceType)
        .catch(() => undefined);
      throw error;
    }
  }

  async remove(id: string) {
    const media = await this.getById(id);
    await this.media.destroy(
      media.publicId,
      media.resourceType as 'image' | 'video',
    );
    await this.prisma.galleryMedia.delete({ where: { id } });
    return { deleted: true };
  }
}
