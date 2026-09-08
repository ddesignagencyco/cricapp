import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  getPaginationOffset,
  createPaginatedResponse,
} from '../common/pagination/pagination.util.js';
import type { AddFavoriteDto, FavoriteListQuery } from './dto/favorites.dto.js';

export interface FavoriteSummary {
  id: string;
  userId: string;
  targetType: string;
  targetId: string;
  createdAt: Date;
}

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: FavoriteListQuery) {
    const { page, limit, skip } = getPaginationOffset(query.page, query.limit, query.offset);

    const where: any = { userId };
    if (query.targetType) where.targetType = query.targetType;

    const [rows, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.favorite.count({ where }),
    ]);

    return createPaginatedResponse(rows, total, page, limit);
  }

  async add(userId: string, dto: AddFavoriteDto) {
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_targetType_targetId: { userId, targetType: dto.targetType, targetId: dto.targetId } },
    });
    if (existing) throw new ConflictException('Already in favorites');

    return this.prisma.favorite.create({
      data: { userId, targetType: dto.targetType, targetId: dto.targetId },
    });
  }

  async remove(userId: string, favoriteId: string) {
    const fav = await this.prisma.favorite.findUnique({ where: { id: favoriteId } });
    if (!fav) throw new NotFoundException('Favorite not found');
    if (fav.userId !== userId) throw new NotFoundException('Favorite not found');

    await this.prisma.favorite.delete({ where: { id: favoriteId } });
    return { deleted: true };
  }
}
