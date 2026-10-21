import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailerService } from '../mailer/mailer.service.js';
import { buildNewsletterWelcomeEmail } from './newsletter-emails.js';
import {
  createPaginatedResponse,
  getPaginationOffset,
} from '../common/pagination/pagination.util.js';
import type {
  NewsletterListQuery,
  SubscribeNewsletterDto,
  UnsubscribeNewsletterDto,
} from './dto/newsletter.dto.js';

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    private readonly config: ConfigService,
  ) {}

  private get apiUrl(): string {
    return this.config.get<string>('API_PUBLIC_URL', 'http://localhost:3001').replace(/\/$/, '');
  }

  async subscribe(dto: SubscribeNewsletterDto) {
    const email = dto.email.trim().toLowerCase();
    const [existing, user] = await Promise.all([
      this.prisma.newsletterSubscriber.findUnique({ where: { email } }),
      this.prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true },
      }),
    ]);
    if (user) {
      await this.prisma.newsletterSubscriber.updateMany({
        where: {
          userId: user.id,
          ...(existing ? { id: { not: existing.id } } : {}),
        },
        data: { userId: null },
      });
    }
    if (existing?.status === 'active') {
      if (existing.userId !== user?.id) {
        await this.prisma.newsletterSubscriber.update({
          where: { id: existing.id },
          data: { userId: user?.id ?? null },
        });
      }
      return { message: 'Subscription confirmed.' };
    }

    const unsubscribeToken = crypto.randomUUID();
    const subscriber = await this.prisma.newsletterSubscriber.upsert({
      where: { email },
      update: {
        status: 'active',
        unsubscribeToken,
        subscribedAt: new Date(),
        unsubscribedAt: null,
        userId: user?.id ?? null,
      },
      create: { email, unsubscribeToken, userId: user?.id },
    });

    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    const unsubscribeUrl = `${appUrl}/newsletter/unsubscribe?token=${subscriber.unsubscribeToken}`;
    const welcome = buildNewsletterWelcomeEmail({ appUrl, unsubscribeUrl });
    void this.mailer
      .sendMail({
        to: subscriber.email,
        subject: 'Welcome to the PakCricZone newsletter',
        html: welcome.html,
        text: welcome.text,
        headers: {
          'List-Unsubscribe': `<${this.apiUrl}/api/newsletter/unsubscribe/one-click?token=${subscriber.unsubscribeToken}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      })
      .catch((error: unknown) => {
        this.logger.error(
          `Failed to send newsletter welcome email to ${subscriber.email}`,
          error instanceof Error ? error.stack : String(error),
        );
      });

    return { message: 'Subscription confirmed.' };
  }

  async unsubscribe(dto: UnsubscribeNewsletterDto) {
    await this.prisma.newsletterSubscriber.updateMany({
      where: { unsubscribeToken: dto.token, status: 'active' },
      data: { status: 'unsubscribed', unsubscribedAt: new Date() },
    });
    return { message: 'You have been unsubscribed.' };
  }

  async list(query: NewsletterListQuery) {
    const { page, limit, skip } = getPaginationOffset(
      query.page,
      query.limit,
      query.offset,
    );
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? { email: { contains: query.q, mode: 'insensitive' as const } }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.newsletterSubscriber.findMany({
        where,
        select: {
          id: true,
          email: true,
          userId: true,
          status: true,
          subscribedAt: true,
          unsubscribedAt: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
        orderBy: { subscribedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.newsletterSubscriber.count({ where }),
    ]);
    return createPaginatedResponse(rows, total, page, limit);
  }
}
