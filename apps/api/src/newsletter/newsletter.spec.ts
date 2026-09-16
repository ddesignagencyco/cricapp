import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals';
import { JwtService } from '@nestjs/jwt';
import {
  cleanDatabase,
  setupTestApp,
  teardownTestApp,
  type TestContext,
} from '../common/test-setup.js';

describe('NewsletterModule (integration)', () => {
  let ctx: TestContext;
  let adminToken: string;

  beforeAll(async () => {
    ctx = await setupTestApp();
  });

  afterAll(async () => teardownTestApp(ctx));

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
    const admin = await ctx.prisma.user.create({
      data: {
        email: 'admin@example.com',
        username: 'admin',
        passwordHash: 'unused',
        emailVerified: true,
        isAdmin: true,
      },
    });
    adminToken = ctx.app.get(JwtService).sign({
      sub: admin.id,
      email: admin.email,
      username: admin.username,
      isAdmin: true,
      isSuperAdmin: false,
      emailVerified: true,
    });
  });

  it('subscribes idempotently and unsubscribes by opaque token', async () => {
    await ctx.agent
      .post('/newsletter/subscribe')
      .send({ email: 'FAN@Example.com' })
      .expect(201);
    await ctx.agent
      .post('/newsletter/subscribe')
      .send({ email: 'fan@example.com' })
      .expect(201);

    expect(await ctx.prisma.newsletterSubscriber.count()).toBe(1);
    const subscriber =
      await ctx.prisma.newsletterSubscriber.findUniqueOrThrow({
        where: { email: 'fan@example.com' },
      });

    await ctx.agent
      .post('/newsletter/unsubscribe')
      .send({ token: subscriber.unsubscribeToken })
      .expect(200);

    const updated = await ctx.prisma.newsletterSubscriber.findUniqueOrThrow({
      where: { id: subscriber.id },
    });
    expect(updated.status).toBe('unsubscribed');
    expect(updated.unsubscribedAt).toBeTruthy();
  });

  it('links an active subscription to its registered user', async () => {
    const user = await ctx.prisma.user.create({
      data: {
        email: 'Fan@Example.com',
        username: 'newsletter-fan',
        passwordHash: 'unused',
      },
    });

    await ctx.agent
      .post('/newsletter/subscribe')
      .send({ email: 'fan@example.com' })
      .expect(201);

    const subscriber =
      await ctx.prisma.newsletterSubscriber.findUniqueOrThrow({
        where: { email: 'fan@example.com' },
      });
    expect(subscriber.userId).toBe(user.id);
    expect(subscriber.status).toBe('active');
  });

  it('lists subscribers for admins without exposing unsubscribe tokens', async () => {
    await ctx.prisma.newsletterSubscriber.create({
      data: {
        email: 'fan@example.com',
        unsubscribeToken: crypto.randomUUID(),
        userId: (
          await ctx.prisma.user.create({
            data: {
              email: 'fan@example.com',
              username: 'subscriber',
              passwordHash: 'unused',
            },
          })
        ).id,
      },
    });

    const response = await ctx.agent
      .get('/admin/newsletter/subscribers')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(response.body.meta.totalRecords).toBe(1);
    expect(response.body.data[0].email).toBe('fan@example.com');
    expect(response.body.data[0].user.username).toBe('subscriber');
    expect(response.body.data[0].unsubscribeToken).toBeUndefined();
  });
});
