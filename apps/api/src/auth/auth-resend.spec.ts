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
import { ThrottlerStorage } from '@nestjs/throttler';

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
      psubscribe: async () => {},
      punsubscribe: async () => {},
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
      // These tests exercise the per-code attempt limit, not the per-IP rate limit.
      .overrideProvider(ThrottlerStorage)
      .useValue({
        increment: async () => ({ totalHits: 1, timeToExpire: 60, isBlocked: false, timeToBlockExpire: 0 }),
      })
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

    expect(MockMailerService.lastMail?.subject).toContain('PakCricZone');
    expect(MockMailerService.lastMail?.html).toContain('Confirm your email');
    expect(MockMailerService.lastMail?.html).toContain('Verify email address');
    expect(MockMailerService.lastMail?.html).not.toContain('Reset Code');
  });

  /** The 6-digit code from the plain-text part of the last email sent. */
  function mailedCode(): string {
    const match = MockMailerService.lastMail?.text?.match(/Enter this code instead: (\d{6})/);
    expect(match).toBeTruthy();
    return match![1];
  }

  it('emails a reset code that resets the password once', async () => {
    const user = await prisma.user.create({
      data: { email: TEST_EMAIL, username: 'codereset', passwordHash: 'not-used' },
    });
    await agent.post('/auth/forgot-password').send({ email: TEST_EMAIL }).expect(200);
    const code = mailedCode();
    expect(MockMailerService.lastMail?.html).toContain(code);

    const tokenRow = await prisma.passwordResetToken.findFirstOrThrow({ where: { userId: user.id } });
    expect(tokenRow.codeHash).toBeTruthy();
    expect(tokenRow.codeHash).not.toContain(code);

    await agent.post('/auth/reset-password')
      .send({ email: TEST_EMAIL, code, password: 'newpassword123' })
      .expect(200);
    const bcrypt = await import('bcrypt');
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await bcrypt.compare('newpassword123', updated.passwordHash)).toBe(true);

    // Single use: the same code cannot reset again.
    await agent.post('/auth/reset-password')
      .send({ email: TEST_EMAIL, code, password: 'another123' })
      .expect(400);
  });

  it('stops accepting a reset code after five wrong guesses', async () => {
    await prisma.user.create({
      data: { email: TEST_EMAIL, username: 'codelock', passwordHash: 'not-used' },
    });
    await agent.post('/auth/forgot-password').send({ email: TEST_EMAIL }).expect(200);
    const code = mailedCode();
    const wrong = code === '000000' ? '111111' : '000000';

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await agent.post('/auth/reset-password')
        .send({ email: TEST_EMAIL, code: wrong, password: 'newpassword123' })
        .expect(400);
    }
    const res = await agent.post('/auth/reset-password')
      .send({ email: TEST_EMAIL, code, password: 'newpassword123' })
      .expect(400);
    expect(res.body.message).toContain('Invalid or expired code');
  });

  it('retires the previous reset code when a new one is requested', async () => {
    await prisma.user.create({
      data: { email: TEST_EMAIL, username: 'coderetire', passwordHash: 'not-used' },
    });
    await agent.post('/auth/forgot-password').send({ email: TEST_EMAIL }).expect(200);
    const first = mailedCode();
    await agent.post('/auth/forgot-password').send({ email: TEST_EMAIL }).expect(200);
    const second = mailedCode();

    if (first !== second) {
      await agent.post('/auth/reset-password')
        .send({ email: TEST_EMAIL, code: first, password: 'newpassword123' })
        .expect(400);
    }
    await agent.post('/auth/reset-password')
      .send({ email: TEST_EMAIL, code: second, password: 'newpassword123' })
      .expect(200);
  });

  it('verifies an email with the mailed code', async () => {
    const user = await prisma.user.create({
      data: { email: TEST_EMAIL, username: 'codeverify', passwordHash: 'not-used' },
    });
    await agent.post('/auth/resend-verification').send({ email: TEST_EMAIL }).expect(200);
    const code = mailedCode();
    expect(MockMailerService.lastMail?.html).toContain('Verification code');

    const wrong = code === '000000' ? '111111' : '000000';
    const bad = await agent.post('/auth/verify-email').send({ email: TEST_EMAIL, code: wrong }).expect(400);
    expect(bad.body.message).toContain('Invalid or expired verification code');

    const res = await agent.post('/auth/verify-email').send({ email: TEST_EMAIL, code }).expect(200);
    expect(res.body.message).toContain('verified successfully');
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.emailVerified).toBe(true);

    const again = await agent.post('/auth/verify-email').send({ email: TEST_EMAIL, code }).expect(200);
    expect(again.body.message).toContain('already verified');
  });
});
