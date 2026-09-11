import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { setupTestApp, teardownTestApp, cleanDatabase, type TestContext } from '../common/test-setup.js';
import { JwtService } from '@nestjs/jwt';

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
    const admin = await ctx.prisma.user.create({
      data: {
        email: 'admin@example.com',
        username: 'admin',
        passwordHash: 'not-used',
        isAdmin: true,
        emailVerified: true,
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

    const user = await ctx.prisma.user.create({
      data: {
        email: 'user@example.com',
        username: 'user',
        passwordHash: 'not-used',
      },
    });
    userToken = ctx.app.get(JwtService).sign({
      sub: user.id,
      email: user.email,
      username: user.username,
      isAdmin: false,
      isSuperAdmin: false,
      emailVerified: false,
    });
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

  it('does not let an admin modify or delete the superadmin', async () => {
    const superadmin = await ctx.prisma.user.create({
      data: {
        email: 'owner@example.com',
        username: 'owner',
        passwordHash: 'not-used',
        isAdmin: true,
        isSuperAdmin: true,
        emailVerified: true,
      },
    });
    await ctx.agent
      .patch(`/admin/users/${superadmin.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isAdmin: false })
      .expect(403);
    await ctx.agent
      .delete(`/admin/users/${superadmin.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403);
  });

  it('DELETE /admin/users/:id — deletes a regular user', async () => {
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { email: 'user@example.com' },
    });
    await ctx.agent
      .delete(`/admin/users/${user.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(await ctx.prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
  });

  it('GET /admin/analytics — returns stats', async () => {
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { email: 'user@example.com' },
    });
    await ctx.prisma.favorite.createMany({
      data: [
        { userId: user.id, targetType: 'team', targetId: 'team-1' },
        { userId: user.id, targetType: 'team', targetId: 'team-2' },
        { userId: user.id, targetType: 'player', targetId: 'player-1' },
      ],
    });

    const res = await ctx.agent
      .get('/admin/analytics')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.users).toBe(2);
    expect(typeof res.body.matches).toBe('number');
    expect(typeof res.body.tournaments).toBe('number');
    expect(typeof res.body.tours).toBe('number');
    expect(res.body.favorites).toEqual({
      total: 3,
      types: { team: 2, player: 1, match: 0 },
    });
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

  it('POST /admin/media/upload — is admin protected', async () => {
    await ctx.agent
      .post('/admin/media/upload')
      .attach('file', Buffer.from('not-an-image'), {
        filename: 'article.png',
        contentType: 'image/png',
      })
      .expect(401);
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
