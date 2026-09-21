import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { MediaService } from '../media/media.service.js';
import {
  createPaginatedResponse,
  getPaginationOffset,
} from '../common/pagination/pagination.util.js';
import { PUBLIC_GALLERY_PURPOSE } from './gallery.constants.js';
import type {
  AdminGalleryListQuery,
  GalleryListQuery,
  UploadGalleryMediaDto,
} from './dto/gallery.dto.js';

/** Cloudinary folder for article covers / avatars — never shown on public gallery. */
const EDITORIAL_PUBLIC_ID_PREFIX = 'cricapp/articles/';

@Injectable()
export class GalleryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  /** URLs referenced outside the public gallery (profiles, logos, news covers). */
  private async referencedAssetUrls(): Promise<string[]> {
    const [users, authors, teams, players, articles] = await Promise.all([
      this.prisma.user.findMany({
        where: { avatarUrl: { not: null } },
        select: { avatarUrl: true },
      }),
      this.prisma.author.findMany({
        where: { avatarUrl: { not: null } },
        select: { avatarUrl: true },
      }),
      this.prisma.team.findMany({
        where: { logoUrl: { not: null } },
        select: { logoUrl: true },
      }),
      this.prisma.player.findMany({
        where: { profileUrl: { not: null } },
        select: { profileUrl: true },
      }),
      this.prisma.newsArticle.findMany({
        where: { imageUrl: { not: null } },
        select: { imageUrl: true },
      }),
    ]);

    return [
      ...users.map(({ avatarUrl }) => avatarUrl),
      ...authors.map(({ avatarUrl }) => avatarUrl),
      ...teams.map(({ logoUrl }) => logoUrl),
      ...players.map(({ profileUrl }) => profileUrl),
      ...articles.map(({ imageUrl }) => imageUrl),
    ].filter((url): url is string => Boolean(url));
  }

  private async publicGalleryWhere(
    type?: GalleryListQuery['type'],
  ): Promise<Prisma.GalleryMediaWhereInput> {
    const referencedUrls = await this.referencedAssetUrls();
    return {
      purpose: PUBLIC_GALLERY_PURPOSE,
      ...(type ? { type } : {}),
      NOT: { publicId: { startsWith: EDITORIAL_PUBLIC_ID_PREFIX } },
      ...(referencedUrls.length ? { url: { notIn: referencedUrls } } : {}),
    };
  }

  private adminGalleryWhere(
    purpose: string,
    type?: GalleryListQuery['type'],
  ): Prisma.GalleryMediaWhereInput {
    return {
      purpose,
      ...(type ? { type } : {}),
    };
  }

  async listPublic(query: GalleryListQuery) {
    const { page, limit, skip } = getPaginationOffset(
      query.page,
      query.limit,
      query.offset,
    );
    const where = await this.publicGalleryWhere(query.type);
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

  async listAdmin(query: AdminGalleryListQuery) {
    const purpose = query.purpose ?? PUBLIC_GALLERY_PURPOSE;
    const { page, limit, skip } = getPaginationOffset(
      query.page,
      query.limit,
      query.offset,
    );
    const where = this.adminGalleryWhere(purpose, query.type);
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

  async getByIdPublic(id: string) {
    const where = await this.publicGalleryWhere();
    const media = await this.prisma.galleryMedia.findFirst({
      where: { id, ...where },
    });
    if (!media) throw new NotFoundException('Gallery media not found');
    return media;
  }

  /** When a cover is attached to news (or similar), keep it out of the public gallery. */
  async markEditorialByUrl(url: string | null | undefined) {
    const trimmed = url?.trim();
    if (!trimmed) return;
    await this.prisma.galleryMedia.updateMany({
      where: { url: trimmed },
      data: { purpose: 'editorial' },
    });
  }

  async upload(file: Express.Multer.File, dto: UploadGalleryMediaDto) {
    const purpose = dto.purpose ?? PUBLIC_GALLERY_PURPOSE;
    if (purpose === 'editorial' && dto.type !== 'image') {
      throw new BadRequestException(
        'Editorial uploads only support type image',
      );
    }

    const expectsImage = dto.type === 'image';
    if (expectsImage !== file.mimetype.startsWith('image/')) {
      throw new BadRequestException(
        expectsImage
          ? 'Gallery type image requires an image file'
          : `Gallery type ${dto.type} requires a video file`,
      );
    }

    const uploaded = await this.media.uploadGalleryMedia(file, dto.type, purpose);
    try {
      return await this.prisma.galleryMedia.create({
        data: {
          title: dto.title?.trim() || null,
          caption: dto.caption?.trim() || null,
          type: dto.type,
          purpose,
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
    const media = await this.prisma.galleryMedia.findUnique({ where: { id } });
    if (!media) throw new NotFoundException('Gallery media not found');
    await this.media.destroy(
      media.publicId,
      media.resourceType as 'image' | 'video',
    );
    await this.prisma.galleryMedia.delete({ where: { id } });
    return { deleted: true };
  }
}
