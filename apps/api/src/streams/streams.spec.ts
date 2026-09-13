import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { JwtService } from '@nestjs/jwt';
import { setupTestApp, teardownTestApp, cleanDatabase, type TestContext } from '../common/test-setup.js';

describe('StreamsModule (integration)', () => {
  let ctx: TestContext;
  let adminToken: string;

  beforeAll(async () => {
    ctx = await setupTestApp();
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
    const admin = await ctx.prisma.user.create({
      data: { email: 'admin@example.com', username: 'admin', passwordHash: 'not-used', isAdmin: true },
    });
    adminToken = ctx.app.get(JwtService).sign({ sub: admin.id, email: admin.email, username: admin.username, isAdmin: true });

    // Seed streams
    await ctx.prisma.liveStream.create({
      data: { title: 'Stream A', streamUrl: 'https://a.com', status: 'live' },
    });
    await ctx.prisma.liveStream.create({
      data: { title: 'Stream B', streamUrl: 'https://b.com', status: 'upcoming', scheduledAt: new Date('2026-10-01T10:00:00Z') },
    });
  });

  it('GET /streams — returns paginated streams', async () => {
    const res = await ctx.agent.get('/streams').expect(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data.map((stream: { title: string }) => stream.title)).toEqual(
      expect.arrayContaining(['Stream A', 'Stream B']),
    );
    expect(res.body.meta.totalRecords).toBe(res.body.data.length);
  });

  it('GET /streams?status=live — filters by status', async () => {
    const res = await ctx.agent.get('/streams?status=live').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe('live');
    expect(res.body.meta.totalRecords).toBe(1);
  });

  it('GET /streams/:id — returns stream by id', async () => {
    const stream = await ctx.prisma.liveStream.create({
      data: { title: 'Stream C', streamUrl: 'https://c.com', status: 'ended' },
    });
    const res = await ctx.agent.get(`/streams/${stream.id}`).expect(200);
    expect(res.body.id).toBe(stream.id);
    expect(res.body.title).toBe('Stream C');
  });

  it('GET /streams/:id — returns 404 for unknown stream', async () => {
    await ctx.agent.get('/streams/nonexistent').expect(404);
  });

  it('supports a paginated comment section for each stream', async () => {
    const stream = await ctx.prisma.liveStream.findFirstOrThrow({
      where: { status: 'live' },
    });
    const posted = await ctx.agent
      .post(`/streams/${stream.id}/comments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ body: 'What a match!' })
      .expect(201);
    expect(posted.body.targetType).toBe('stream');
    expect(posted.body.targetId).toBe(stream.id);

    const listed = await ctx.agent
      .get(`/streams/${stream.id}/comments?page=1&limit=10`)
      .expect(200);
    expect(listed.body.data).toHaveLength(1);
    expect(listed.body.data[0].body).toBe('What a match!');
  });

  it('POST /streams — admin can create stream', async () => {
    const res = await ctx.agent
      .post('/streams')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'New Stream',
        streamUrl: 'https://new.com',
        provider: 'TestProvider',
        status: 'upcoming',
      })
      .expect(201);
    expect(res.body.title).toBe('New Stream');
    expect(res.body.status).toBe('upcoming');
  });

  it('PATCH /streams/:id — admin can update stream', async () => {
    const stream = await ctx.prisma.liveStream.create({
      data: { title: 'Old', streamUrl: 'https://old.com', status: 'upcoming' },
    });
    const res = await ctx.agent
      .patch(`/streams/${stream.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Updated', status: 'live' })
      .expect(200);
    expect(res.body.title).toBe('Updated');
    expect(res.body.status).toBe('live');
    expect(res.body.startedAt).toBeDefined();
  });

  it('DELETE /streams/:id — admin can delete stream', async () => {
    const stream = await ctx.prisma.liveStream.create({
      data: { title: 'To Delete', streamUrl: 'https://del.com', status: 'upcoming' },
    });
    await ctx.agent
      .delete(`/streams/${stream.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    await ctx.agent.get(`/streams/${stream.id}`).expect(404);
  });

  it('POST /streams — rejects non-admin', async () => {
    const user = await ctx.prisma.user.create({
      data: { email: 'user@example.com', username: 'user', passwordHash: 'not-used', isAdmin: false },
    });
    const userToken = ctx.app.get(JwtService).sign({ sub: user.id, email: user.email, username: user.username, isAdmin: false });

    await ctx.agent
      .post('/streams')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Hack', streamUrl: 'https://hack.com' })
      .expect(403);
  });
});
