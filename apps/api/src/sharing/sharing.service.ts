import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  SHARE_TARGET_TYPES,
  type ShareTargetType,
} from './dto/sharing.dto.js';

const BASE_URL = process.env.APP_URL ?? 'https://criczapp.com';

@Injectable()
export class SharingService {
  constructor(private readonly prisma: PrismaService) {}

  async getShareLink(type: string, id: string) {
    if (!SHARE_TARGET_TYPES.includes(type as ShareTargetType)) {
      throw new BadRequestException('Unsupported share type');
    }
    const shareType = type as ShareTargetType;
    await this.trackShare(shareType, id);

    let ogTitle = 'CriczApp';
    let ogDescription = 'Cricket scores, news and live streams';
    let ogImage: string | undefined;

    switch (shareType) {
      case 'match': {
        const match = await this.prisma.match.findUnique({ where: { matchId: id } });
        if (match) {
          const names = match.teamNames as Record<string, string>;
          ogTitle = `${names?.home ?? 'Home'} vs ${names?.away ?? 'Away'} — CriczApp`;
          ogDescription = match.displayScore ?? `Scheduled: ${match.scheduled ?? 'TBD'}`;
        }
        break;
      }
      case 'news': {
        const article = await this.prisma.newsArticle.findFirst({
          where: { OR: [{ id }, { slug: id }] },
        });
        if (article) {
          ogTitle = `${article.title} — CriczApp`;
          ogDescription = article.summary ?? article.title;
        }
        break;
      }
      case 'player': {
        const player = await this.prisma.player.findUnique({ where: { id } });
        if (player) {
          ogTitle = `${player.fullName} — CriczApp`;
          ogDescription = `${player.role ?? 'Player'} • ${player.nationality ?? ''}`;
        }
        break;
      }
      case 'team': {
        const team = await this.prisma.team.findFirst({
          where: { OR: [{ id }, { abbr: id }] },
        });
        if (team) {
          ogTitle = `${team.name} — CriczApp`;
          ogDescription = `${team.country ?? ''} • ${team.abbr}`;
        }
        break;
      }
      case 'gallery': {
        const media = await this.prisma.galleryMedia.findFirst({
          where: { id, purpose: 'gallery' },
        });
        if (media) {
          ogTitle = `${media.title ?? 'Gallery image'} — CriczApp`;
          ogDescription = media.caption ?? media.title ?? 'Cricket gallery media';
          ogImage = media.thumbnailUrl ?? media.url;
        }
        break;
      }
      case 'tour': {
        const tour = await this.prisma.tour.findUnique({ where: { id } });
        if (tour) {
          ogTitle = `${tour.name} — CriczApp`;
          ogDescription = 'Cricket tour schedules, tournaments and results';
        }
        break;
      }
      case 'tournament': {
        const tournament = await this.prisma.tournament.findUnique({
          where: { id },
        });
        if (tournament) {
          ogTitle = `${tournament.name} — CriczApp`;
          ogDescription = [
            tournament.type,
            tournament.gender,
            'fixtures, results and standings',
          ]
            .filter(Boolean)
            .join(' • ');
        }
        break;
      }
      default: {
        const exhaustiveCheck: never = shareType;
        throw new BadRequestException(
          `Unsupported share type: ${exhaustiveCheck}`,
        );
      }
    }

    const path =
      shareType === 'match'
        ? 'matches'
        : shareType === 'news'
          ? 'news'
          : shareType === 'gallery'
            ? 'gallery'
            : `${shareType}s`;

    return {
      url: `${BASE_URL}/${path}/${id}`,
      ogTitle,
      ogDescription,
      ogImage: ogImage ?? `${BASE_URL}/api/og/${shareType}/${id}`,
    };
  }

  private async trackShare(shareType: string, targetId: string) {
    await this.prisma.shareStat.upsert({
      where: { shareType_targetId: { shareType, targetId } },
      create: { shareType, targetId, count: 1 },
      update: { count: { increment: 1 } },
    });
  }

  async getShareStats(shareType?: string) {
    const where = shareType ? { shareType } : {};
    return this.prisma.shareStat.findMany({
      where,
      orderBy: { count: 'desc' },
      take: 50,
    });
  }
}
