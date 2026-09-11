import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '../mailer/mailer.service.js';
import type { SendMailOptions } from '../mailer/mailer.service.js';

class MockRedisService {
  async get<T = unknown>(): Promise<T | null> { return null; }
  async hgetall(): Promise<Record<string, string>> { return {}; }
  async smembers(): Promise<string[]> { return []; }
  get cached() {
    return {
      get: async () => null,
      set: async () => null,
      del: async () => null,
      smembers: async () => [],
      sadd: async () => null,
      srem: async () => null,
      ping: async () => 'PONG',
    };
  }
  get subscriber() {
    return {
      on: () => {},
      subscribe: async () => {},
      unsubscribe: async () => {},
    };
  }
}

class MockMailerService {
  static lastMail: SendMailOptions | null = null;

  async sendMail(options: SendMailOptions): Promise<void> {
    MockMailerService.lastMail = options;
  }
}

describe('AuthModule forgot-password with Resend (live)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let agent: request.SuperTest<request.Test>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string, fallback?: any) => {
          const overrides: Record<string, any> = {
            API_KEY: '',
            RATE_LIMIT_TTL: 60,
            RATE_LIMIT_MAX: 1000,
            EMAIL_PROVIDER: 'resend',
            EMAIL_FROM: 'onboarding@resend.dev',
            RESEND_API_KEY: 'test-key',
          };
          return key in overrides ? overrides[key] : fallback;
        },
      })
      .overrideProvider(RedisService)
      .useClass(MockRedisService)
      .overrideProvider(MailerService)
      .useClass(MockMailerService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    agent = request(app.getHttpServer()) as unknown as request.SuperTest<request.Test>;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "password_reset_tokens", "email_verification_tokens", "users" CASCADE;`);
    MockMailerService.lastMail = null;
  });

  const TEST_EMAIL = 'test@resend.dev';

  it('POST /auth/forgot-password — creates token and sends email (mailer mocked)', async () => {
    const user = await prisma.user.create({
      data: { email: TEST_EMAIL, username: 'testuser', passwordHash: 'not-used' },
    });

    const res = await agent.post('/auth/forgot-password').send({ email: TEST_EMAIL }).expect(200);
    expect(res.body.message).toContain('If an account exists');

    const tokenRow = await prisma.passwordResetToken.findFirst({ where: { userId: user.id } });
    expect(tokenRow).toBeTruthy();
    expect(tokenRow!.expiresAt > new Date()).toBe(true);
  });

  it('POST /auth/forgot-password + POST /auth/reset-password — full flow with known token', async () => {
    const user = await prisma.user.create({
      data: { email: TEST_EMAIL, username: 'testuser2', passwordHash: 'not-used' },
    });

    // Seed a known token hash directly so we can test reset
    const knownToken = 'test-token-12345';
    const bcrypt = await import('bcrypt');
    const tokenHash = await bcrypt.hash(knownToken, 10);
    const tokenRecord = await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 3600_000) },
    });
    expect(
      await prisma.passwordResetToken.count({
        where: {
          id: tokenRecord.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
      }),
    ).toBe(1);

    const resetRes = await agent.post('/auth/reset-password').send({
      tokenId: tokenRecord.id,
      token: knownToken,
      password: 'newpassword123',
    }).expect(200);

    expect(resetRes.body.message).toContain('Password has been reset');

    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    const valid = await bcrypt.compare('newpassword123', updatedUser!.passwordHash);
    expect(valid).toBe(true);
  });

  it('sends a branded, scope-specific verification email', async () => {
    await prisma.user.create({
      data: {
        email: TEST_EMAIL,
        username: 'cricketfan',
        displayName: 'Cricket Fan',
        passwordHash: 'not-used',
      },
    });

    await agent
      .post('/auth/resend-verification')
      .send({ email: TEST_EMAIL })
      .expect(200);

    expect(MockMailerService.lastMail?.subject).toContain('CricApp');
    expect(MockMailerService.lastMail?.html).toContain('Pakistan cricket, live scores, PSL and news');
    expect(MockMailerService.lastMail?.html).toContain('Verify Email Address');
    expect(MockMailerService.lastMail?.html).not.toContain('Reset Code');
  });
});
