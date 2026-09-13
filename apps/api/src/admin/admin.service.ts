import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { redisKeys } from '@cricapp/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { NewsService } from '../news/news.service.js';
import type { ListUsersQuery, UpdateUserDto, CreateStreamDto, ModerateCommentDto, ResolveReportDto } from './dto/admin.dto.js';
import type { NewsListQuery, CreateAuthorDto, UpdateAuthorDto } from '../news/dto/news.dto.js';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly newsService: NewsService,
  ) {}

  /* ------------------------------------------------------------------ */
  /* Users                                                              */
  /* ------------------------------------------------------------------ */

  async listUsers(query: ListUsersQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = query.q
      ? {
          OR: [
            { email: { contains: query.q, mode: 'insensitive' as const } },
            { username: { contains: query.q, mode: 'insensitive' as const } },
            { displayName: { contains: query.q, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          isAdmin: true,
          isSuperAdmin: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, totalRecords: total, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateUser(
    actor: { id: string; isSuperAdmin?: boolean },
    userId: string,
    dto: UpdateUserDto,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.isSuperAdmin && !actor.isSuperAdmin) {
      throw new ForbiddenException('Superadmin accounts cannot be modified by admins');
    }
    if (user.isSuperAdmin && dto.isAdmin === false) {
      throw new ForbiddenException('The superadmin role cannot be removed');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.isAdmin !== undefined && { isAdmin: dto.isAdmin }),
        ...(dto.emailVerified !== undefined && { emailVerified: dto.emailVerified }),
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        isAdmin: true,
        isSuperAdmin: true,
        emailVerified: true,
        updatedAt: true,
      },
    });
  }

  async deleteUser(
    actor: { id: string; isSuperAdmin?: boolean },
    userId: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.isSuperAdmin) {
      throw new ForbiddenException('The superadmin account cannot be deleted');
    }
    if (actor.id === userId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.commentReport.deleteMany({
        where: {
          OR: [{ reporterId: userId }, { comment: { userId } }],
        },
      });
      await tx.reaction.deleteMany({
        where: { OR: [{ userId }, { comment: { userId } }] },
      });
      await tx.comment.deleteMany({ where: { userId } });
      await tx.favorite.deleteMany({ where: { userId } });
      await tx.device.updateMany({
        where: { userId },
        data: { userId: null },
      });
      await tx.notificationLog.updateMany({
        where: { userId },
        data: { userId: null },
      });
      await tx.passwordResetToken.deleteMany({ where: { userId } });
      await tx.emailVerificationToken.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });
    return { deleted: true };
  }

  /* ------------------------------------------------------------------ */
  /* News & Authors                                                     */
  /* ------------------------------------------------------------------ */

  async listNews(query: NewsListQuery) {
    return this.newsService.list(query, { includeUnpublished: true });
  }

  async listAuthors() {
    return this.newsService.listAuthors();
  }

  async createAuthor(dto: CreateAuthorDto) {
    return this.newsService.createAuthor(dto);
  }

  async updateAuthor(id: string, dto: UpdateAuthorDto) {
    return this.newsService.updateAuthor(id, dto);
  }

  /* ------------------------------------------------------------------ */
  /* Comments & Reports                                                 */
  /* ------------------------------------------------------------------ */

  async listReportedComments() {
    const reports = await this.prisma.commentReport.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
      include: {
        comment: {
          select: {
            id: true,
            body: true,
            status: true,
            userId: true,
            targetType: true,
            targetId: true,
            createdAt: true,
            user: { select: { id: true, username: true, email: true } },
          },
        },
      },
    });

    return reports;
  }

  async moderateComment(commentId: string, dto: ModerateCommentDto) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { status: dto.status },
    });

    return updated;
  }

  async resolveReport(reportId: string, dto: ResolveReportDto) {
    const report = await this.prisma.commentReport.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report not found');

    return this.prisma.commentReport.update({
      where: { id: reportId },
      data: {
        status: dto.status ?? 'resolved',
        resolvedAt: new Date(),
      },
    });
  }

  /* ------------------------------------------------------------------ */
  /* Streams                                                            */
  /* ------------------------------------------------------------------ */

  async createStream(dto: CreateStreamDto) {
    return this.prisma.liveStream.create({
      data: {
        title: dto.title,
        matchId: dto.matchId,
        streamUrl: dto.streamUrl,
        provider: dto.provider,
        thumbnailUrl: dto.thumbnailUrl,
        status: dto.status ?? 'upcoming',
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      },
    });
  }

  /* ------------------------------------------------------------------ */
  /* Analytics & Ingestion Health                                       */
  /* ------------------------------------------------------------------ */

  async getAnalytics() {
    const [
      userCount,
      matchCount,
      teamCount,
      playerCount,
      tournamentCount,
      tourCount,
      commentCount,
      favoriteCount,
      favoriteTypes,
      streamCount,
      pendingReports,
      articleCount,
      shareTotal,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.match.count(),
      this.prisma.team.count(),
      this.prisma.player.count(),
      this.prisma.tournament.count(),
      this.prisma.tour.count(),
      this.prisma.comment.count(),
      this.prisma.favorite.count(),
      this.prisma.favorite.groupBy({
        by: ['targetType'],
        _count: { _all: true },
      }),
      this.prisma.liveStream.count(),
      this.prisma.commentReport.count({ where: { status: 'pending' } }),
      this.prisma.newsArticle.count({ where: { isPublished: true } }),
      this.prisma.shareStat.aggregate({ _sum: { count: true } }),
    ]);

    return {
      users: userCount,
      matches: matchCount,
      teams: teamCount,
      players: playerCount,
      tournaments: tournamentCount,
      tours: tourCount,
      comments: commentCount,
      favorites: {
        total: favoriteCount,
        types: {
          team: 0,
          player: 0,
          match: 0,
          ...Object.fromEntries(
            favoriteTypes.map((type) => [
              type.targetType,
              type._count._all,
            ]),
          ),
        },
      },
      streams: streamCount,
      pendingReports,
      publishedArticles: articleCount,
      totalShares: shareTotal._sum.count ?? 0,
    };
  }

  async getIngestionHealth() {
    const [heartbeatRaw, liveIds, syncKeys, newsSyncKey] = await Promise.all([
      this.redis.cached.get('ingestion:heartbeat'),
      this.redis.smembers(redisKeys.liveMatches()),
      this.redis.cached.keys('ref:sync:*'),
      this.redis.cached.get('ref:sync:news'),
    ]);

    let heartbeat: { ts?: number; liveCount?: number } | null = null;
    if (heartbeatRaw) {
      try {
        heartbeat = JSON.parse(heartbeatRaw);
      } catch {
        heartbeat = { ts: Number(heartbeatRaw) || undefined };
      }
    }

    const now = Date.now();
    const heartbeatAgeMs = heartbeat?.ts ? now - heartbeat.ts : null;
    const isHealthy = heartbeatAgeMs !== null && heartbeatAgeMs < 120_000;

    return {
      status: isHealthy ? 'healthy' : heartbeat ? 'stale' : 'unknown',
      heartbeat,
      heartbeatAgeMs,
      liveMatchCount: liveIds.length,
      liveMatchIds: liveIds,
      syncKeyCount: syncKeys.length,
      newsLastSynced: newsSyncKey ? Number(newsSyncKey) : null,
      checkedAt: new Date().toISOString(),
    };
  }
}
