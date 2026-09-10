import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const BASE_URL = process.env.APP_URL ?? 'https://cricapp.com';

@Injectable()
export class SharingService {
  constructor(private readonly prisma: PrismaService) {}

  async getShareLink(type: string, id: string) {
    await this.trackShare(type, id);

    let ogTitle = 'CricApp';
    let ogDescription = 'Cricket scores, news and live streams';

    switch (type) {
      case 'match': {
        const match = await this.prisma.match.findUnique({ where: { matchId: id } });
        if (match) {
          const names = match.teamNames as Record<string, string>;
          ogTitle = `${names?.home ?? 'Home'} vs ${names?.away ?? 'Away'} — CricApp`;
          ogDescription = match.displayScore ?? `Scheduled: ${match.scheduled ?? 'TBD'}`;
        }
        break;
      }
      case 'news': {
        const article = await this.prisma.newsArticle.findFirst({
          where: { OR: [{ id }, { slug: id }] },
        });
        if (article) {
          ogTitle = `${article.title} — CricApp`;
          ogDescription = article.summary ?? article.title;
        }
        break;
      }
      case 'player': {
        const player = await this.prisma.player.findUnique({ where: { id } });
        if (player) {
          ogTitle = `${player.fullName} — CricApp`;
          ogDescription = `${player.role ?? 'Player'} • ${player.nationality ?? ''}`;
        }
        break;
      }
      case 'team': {
        const team = await this.prisma.team.findFirst({
          where: { OR: [{ id }, { abbr: id }] },
        });
        if (team) {
          ogTitle = `${team.name} — CricApp`;
          ogDescription = `${team.country ?? ''} • ${team.abbr}`;
        }
        break;
      }
    }

    const path = type === 'match' ? 'matches' : type === 'news' ? 'news' : `${type}s`;

    return {
      url: `${BASE_URL}/${path}/${id}`,
      ogTitle,
      ogDescription,
      ogImage: `${BASE_URL}/api/og/${type}/${id}`,
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
