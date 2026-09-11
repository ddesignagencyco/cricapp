import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  getPaginationOffset,
  createPaginatedResponse,
} from '../common/pagination/pagination.util.js';
import type { AddFavoriteDto, FavoriteListQuery } from './dto/favorites.dto.js';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  private async expandFavorite(row: { id: string; userId: string; targetType: string; targetId: string; createdAt: Date }) {
    let target: Record<string, unknown> | null = null;

    switch (row.targetType) {
      case 'team': {
        const team = await this.prisma.team.findFirst({
          where: { OR: [{ id: row.targetId }, { abbr: row.targetId }] },
        });
        if (team) {
          target = {
            id: team.id,
            name: team.name,
            abbr: team.abbr,
            country: team.country,
            logoUrl: team.logoUrl,
          };
        }
        break;
      }
      case 'player': {
        const player = await this.prisma.player.findUnique({
          where: { id: row.targetId },
          include: { team: { select: { id: true, name: true, abbr: true } } },
        });
        if (player) {
          target = {
            id: player.id,
            fullName: player.fullName,
            shortName: player.shortName,
            role: player.role,
            nationality: player.nationality,
            team: player.team,
          };
        }
        break;
      }
      case 'match': {
        const match = await this.prisma.match.findUnique({ where: { matchId: row.targetId } });
        if (match) {
          target = {
            matchId: match.matchId,
            status: match.status,
            teams: match.teams,
            teamNames: match.teamNames,
            tournament: match.tournament,
            venue: match.venue,
            scheduled: match.scheduled,
            displayScore: match.displayScore,
          };
        }
        break;
      }
    }

    return { ...row, target };
  }

  async list(userId: string, query: FavoriteListQuery) {
    const { page, limit, skip } = getPaginationOffset(query.page, query.limit, query.offset);

    const where: Record<string, unknown> = { userId };
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

    const data = query.expand
      ? await Promise.all(rows.map((row) => this.expandFavorite(row)))
      : rows;

    return createPaginatedResponse(data, total, page, limit);
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
