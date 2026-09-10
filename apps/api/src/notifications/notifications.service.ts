import { Injectable, NotFoundException } from '@nestjs/common';
import { MATCH_STATUS } from '@cricapp/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import { FcmProvider } from './fcm.provider.js';
import {
  getPaginationOffset,
  createPaginatedResponse,
} from '../common/pagination/pagination.util.js';
import type { RegisterDeviceDto, UpdatePreferencesDto } from './dto/notifications.dto.js';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fcm: FcmProvider,
  ) {}

  async registerDevice(userId: string, dto: RegisterDeviceDto) {
    const existing = await this.prisma.device.findUnique({ where: { fcmToken: dto.fcmToken } });
    if (existing) {
      return this.prisma.device.update({
        where: { fcmToken: dto.fcmToken },
        data: { userId, platform: dto.platform },
      });
    }

    return this.prisma.device.create({
      data: { userId, fcmToken: dto.fcmToken, platform: dto.platform },
    });
  }

  async listDevices(userId: string) {
    return this.prisma.device.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, fcmToken: true, platform: true, preferences: true, createdAt: true },
    });
  }

  async updatePreferences(userId: string, deviceId: string, dto: UpdatePreferencesDto) {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) throw new NotFoundException('Device not found');
    if (device.userId !== userId) throw new NotFoundException('Device not found');

    return this.prisma.device.update({
      where: { id: deviceId },
      data: { preferences: dto.preferences ?? {} },
    });
  }

  async removeDevice(userId: string, deviceId: string) {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) throw new NotFoundException('Device not found');
    if (device.userId !== userId) throw new NotFoundException('Device not found');

    await this.prisma.device.delete({ where: { id: deviceId } });
    return { deleted: true };
  }

  async listHistory(userId: string, params?: { page?: number; limit?: number }) {
    const { page, limit, skip } = getPaginationOffset(params?.page, params?.limit);

    const where = { userId };
    const [rows, total] = await Promise.all([
      this.prisma.notificationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notificationLog.count({ where }),
    ]);

    return createPaginatedResponse(rows, total, page, limit);
  }

  async notifyMatchStart(matchId: string) {
    const match = await this.prisma.match.findUnique({ where: { matchId } });
    if (!match) return;

    const names = match.teamNames as Record<string, string>;
    const title = 'Match Started!';
    const body = `${names?.home ?? 'Home'} vs ${names?.away ?? 'Away'} is now live`;

    await this.dispatchMatchNotification(matchId, 'matchStart', title, body, { matchId });
  }

  async notifyWicket(matchId: string, eventDescription: string) {
    await this.dispatchMatchNotification(matchId, 'wicket', 'Wicket!', eventDescription, { matchId });
  }

  async notifyMilestone(matchId: string, eventDescription: string) {
    await this.dispatchMatchNotification(matchId, 'milestone', 'Milestone!', eventDescription, { matchId });
  }

  async notifyMatchEnd(matchId: string) {
    const match = await this.prisma.match.findUnique({ where: { matchId } });
    if (!match) return;

    const names = match.teamNames as Record<string, string>;
    const title = 'Match Ended';
    const body = `${names?.home ?? 'Home'} vs ${names?.away ?? 'Away'} — ${match.displayScore ?? 'Result'}`;

    await this.dispatchMatchNotification(matchId, 'matchEnd', title, body, { matchId });
  }

  async notifyMatchEndIfCompleted(matchId: string) {
    const match = await this.prisma.match.findUnique({ where: { matchId } });
    if (!match) return;
    if (match.status === MATCH_STATUS.COMPLETED || match.status === MATCH_STATUS.CANCELLED) {
      await this.notifyMatchEnd(matchId);
    }
  }

  private async getMatchTeamIds(matchId: string): Promise<string[]> {
    const match = await this.prisma.match.findUnique({ where: { matchId } });
    if (!match) return [];
    const abbrs = (match.teams as string[]) ?? [];
    if (abbrs.length === 0) return [];
    const teams = await this.prisma.team.findMany({
      where: { abbr: { in: abbrs } },
      select: { id: true },
    });
    return teams.map((t) => t.id);
  }

  private async dispatchMatchNotification(
    matchId: string,
    preference: string,
    title: string,
    body: string,
    data: Record<string, string>,
  ) {
    const teamIds = await this.getMatchTeamIds(matchId);

    const favoriteUsers = await this.prisma.favorite.findMany({
      where: {
        OR: [
          { targetType: 'match', targetId: matchId },
          ...(teamIds.length ? [{ targetType: 'team', targetId: { in: teamIds } }] : []),
        ],
      },
      select: { userId: true },
      distinct: ['userId'],
    });
    const favoriteUserIds = favoriteUsers.map((f) => f.userId);

    const devices = await this.prisma.device.findMany({
      where: {
        OR: [
          { preferences: { path: [preference], equals: true } },
          ...(favoriteUserIds.length ? [{ userId: { in: favoriteUserIds } }] : []),
        ],
      },
      select: { id: true, fcmToken: true, userId: true },
    });

    const uniqueTokens = new Map<string, { userId: string | null }>();
    for (const device of devices) {
      uniqueTokens.set(device.fcmToken, { userId: device.userId });
    }

    if (uniqueTokens.size === 0) return;

    const tokens = [...uniqueTokens.keys()];
    await this.fcm.sendToMultiple(tokens, title, body, data);

    await this.prisma.notificationLog.createMany({
      data: [...uniqueTokens.entries()].map(([_, meta]) => ({
        userId: meta.userId,
        title,
        body,
        data,
      })),
    });
  }
}
