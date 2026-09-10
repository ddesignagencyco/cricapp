import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { setupTestApp, teardownTestApp, cleanDatabase, type TestContext } from '../common/test-setup.js';
import bcrypt from 'bcrypt';

describe('AdminModule (integration)', () => {
  let ctx: TestContext;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    ctx = await setupTestApp();
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
    const passwordHash = await bcrypt.hash('password123', 10);

    // Seed admin via signup
    const adminSignup = await ctx.agent.post('/auth/signup').send({
      email: 'admin@example.com',
      username: 'admin',
      password: 'password123',
    });
    await ctx.prisma.user.update({
      where: { id: adminSignup.body.user.id },
      data: { isAdmin: true },
    });
    const adminLogin = await ctx.agent.post('/auth/login').send({
      email: 'admin@example.com',
      password: 'password123',
    });
    adminToken = adminLogin.body.access_token;

    // Seed regular user
    await ctx.agent.post('/auth/signup').send({
      email: 'user@example.com',
      username: 'user',
      password: 'password123',
    });
    const userLogin = await ctx.agent.post('/auth/login').send({
      email: 'user@example.com',
      password: 'password123',
    });
    userToken = userLogin.body.access_token;
  });

  it('GET /admin/users — returns paginated users (admin only)', async () => {
    const res = await ctx.agent
      .get('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.totalRecords).toBe(2);
  });

  it('GET /admin/users — rejects non-admin', async () => {
    await ctx.agent
      .get('/admin/users')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });

  it('PATCH /admin/users/:id — promotes user to admin', async () => {
    const user = await ctx.prisma.user.findUnique({ where: { email: 'user@example.com' } });
    const res = await ctx.agent
      .patch(`/admin/users/${user!.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isAdmin: true })
      .expect(200);
    expect(res.body.isAdmin).toBe(true);
  });

  it('GET /admin/analytics — returns stats', async () => {
    const res = await ctx.agent
      .get('/admin/analytics')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.users).toBe(2);
    expect(typeof res.body.matches).toBe('number');
  });

  it('POST /admin/streams — creates stream entry', async () => {
    const res = await ctx.agent
      .post('/admin/streams')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Test Stream',
        streamUrl: 'https://youtube.com/embed/test',
        provider: 'YouTube',
        status: 'upcoming',
      })
      .expect(201);
    expect(res.body.title).toBe('Test Stream');
    expect(res.body.streamUrl).toBe('https://youtube.com/embed/test');
  });

  it('GET /admin/reported-comments — returns moderation queue', async () => {
    const user = await ctx.prisma.user.findUnique({ where: { email: 'user@example.com' } });
    const comment = await ctx.prisma.comment.create({
      data: { userId: user!.id, targetType: 'match', targetId: 'sr:match:1', body: 'test comment' },
    });
    await ctx.prisma.commentReport.create({
      data: { commentId: comment.id, reporterId: user!.id, reason: 'spam' },
    });

    const res = await ctx.agent
      .get('/admin/reported-comments')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].reason).toBe('spam');
  });

  it('PATCH /admin/comments/:id — hides a comment', async () => {
    const user = await ctx.prisma.user.findUnique({ where: { email: 'user@example.com' } });
    const comment = await ctx.prisma.comment.create({
      data: { userId: user!.id, targetType: 'match', targetId: 'sr:match:1', body: 'test comment' },
    });

    const res = await ctx.agent
      .patch(`/admin/comments/${comment.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'hidden' })
      .expect(200);
    expect(res.body.status).toBe('hidden');
  });
});
