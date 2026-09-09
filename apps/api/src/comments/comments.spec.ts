import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { JwtService } from '@nestjs/jwt';
import { setupTestApp, teardownTestApp, cleanDatabase, type TestContext } from '../common/test-setup.js';

describe('CommentsModule (integration)', () => {
  let ctx: TestContext;
  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    ctx = await setupTestApp();
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
    const user = await ctx.prisma.user.create({
      data: { email: 'user@example.com', username: 'user', passwordHash: 'not-used', displayName: 'Test User' },
    });
    userId = user.id;
    userToken = ctx.app.get(JwtService).sign({ sub: user.id, email: user.email, username: user.username });
  });

  it('GET /comments — returns paginated comments for a target', async () => {
    await ctx.prisma.comment.create({
      data: { userId, targetType: 'match', targetId: 'sr:match:1', body: 'Great match!' },
    });
    const res = await ctx.agent.get('/comments?targetType=match&targetId=sr:match:1').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].body).toBe('Great match!');
    expect(res.body.meta.totalRecords).toBe(1);
  });

  it('POST /comments — creates a comment', async () => {
    const res = await ctx.agent
      .post('/comments')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ targetType: 'match', targetId: 'sr:match:2', body: 'Well played!' })
      .expect(201);
    expect(res.body.body).toBe('Well played!');
    expect(res.body.user.username).toBe('user');
  });

  it('DELETE /comments/:id — deletes own comment', async () => {
    const comment = await ctx.prisma.comment.create({
      data: { userId, targetType: 'news', targetId: 'news-1', body: 'Delete me' },
    });
    await ctx.agent.delete(`/comments/${comment.id}`).set('Authorization', `Bearer ${userToken}`).expect(200);
    const remaining = await ctx.prisma.comment.count();
    expect(remaining).toBe(0);
  });

  it('DELETE /comments/:id — rejects deleting another user comment', async () => {
    const otherUser = await ctx.prisma.user.create({
      data: { email: 'other@example.com', username: 'other', passwordHash: 'not-used' },
    });
    const comment = await ctx.prisma.comment.create({
      data: { userId: otherUser.id, targetType: 'match', targetId: 'sr:match:1', body: 'Not mine' },
    });
    await ctx.agent.delete(`/comments/${comment.id}`).set('Authorization', `Bearer ${userToken}`).expect(404);
  });

  it('GET /reactions — returns reaction counts', async () => {
    await ctx.prisma.reaction.create({
      data: { userId, targetType: 'match', targetId: 'sr:match:1', emoji: '🔥' },
    });
    const otherUser = await ctx.prisma.user.create({
      data: { email: 'other@example.com', username: 'other', passwordHash: 'not-used' },
    });
    await ctx.prisma.reaction.create({
      data: { userId: otherUser.id, targetType: 'match', targetId: 'sr:match:1', emoji: '🔥' },
    });
    await ctx.prisma.reaction.create({
      data: { userId: otherUser.id, targetType: 'match', targetId: 'sr:match:1', emoji: '❤️' },
    });

    const res = await ctx.agent.get('/reactions?targetType=match&targetId=sr:match:1').expect(200);
    expect(res.body.counts['🔥']).toBe(2);
    expect(res.body.counts['❤️']).toBe(1);
    expect(res.body.emojis).toContain('🔥');
    expect(res.body.emojis).toContain('❤️');
  });

  it('POST /reactions — adds a reaction', async () => {
    const res = await ctx.agent
      .post('/reactions')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ targetType: 'match', targetId: 'sr:match:1', emoji: '👏' })
      .expect(201);
    expect(res.body.toggled).toBe('added');
    expect(res.body.emoji).toBe('👏');
  });

  it('POST /reactions — toggles off an existing reaction', async () => {
    await ctx.prisma.reaction.create({
      data: { userId, targetType: 'match', targetId: 'sr:match:1', emoji: '👏' },
    });
    const res = await ctx.agent
      .post('/reactions')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ targetType: 'match', targetId: 'sr:match:1', emoji: '👏' })
      .expect(201);
    expect(res.body.toggled).toBe('removed');
  });

  it('POST /comments — rejects unauthenticated', async () => {
    await ctx.agent.post('/comments').send({ targetType: 'match', targetId: '1', body: 'x' }).expect(401);
  });

  it('POST /reactions — rejects unauthenticated', async () => {
    await ctx.agent.post('/reactions').send({ targetType: 'match', targetId: '1', emoji: '🔥' }).expect(401);
  });
});
