import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { FcmProvider } from './fcm.provider.js';
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

  async notifyMatchStart(matchId: string) {
    const match = await this.prisma.match.findUnique({ where: { matchId } });
    if (!match) return;

    const names = match.teamNames as Record<string, string>;
    const title = 'Match Started!';
    const body = `${names?.home ?? 'Home'} vs ${names?.away ?? 'Away'} is now live`;

    await this.sendNotificationByPreference('matchStart', title, body, { matchId });
  }

  async notifyWicket(matchId: string, eventDescription: string) {
    await this.sendNotificationByPreference('wicket', 'Wicket!', eventDescription, { matchId });
  }

  async notifyMilestone(matchId: string, eventDescription: string) {
    await this.sendNotificationByPreference('milestone', 'Milestone!', eventDescription, { matchId });
  }

  async notifyMatchEnd(matchId: string) {
    const match = await this.prisma.match.findUnique({ where: { matchId } });
    if (!match) return;

    const names = match.teamNames as Record<string, string>;
    const title = 'Match Ended';
    const body = `${names?.home ?? 'Home'} vs ${names?.away ?? 'Away'} — ${match.displayScore ?? 'Result'}`;

    await this.sendNotificationByPreference('matchEnd', title, body, { matchId });
  }

  private async sendNotificationByPreference(preference: string, title: string, body: string, data: Record<string, string>) {
    const devices = await this.prisma.device.findMany({
      where: {
        preferences: { path: [preference], equals: true },
      },
      select: { fcmToken: true },
    });

    if (devices.length === 0) return;

    const tokens = devices.map((d) => d.fcmToken);
    await this.fcm.sendToMultiple(tokens, title, body, data);
  }
}
