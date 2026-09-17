import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { JwtService } from '@nestjs/jwt';
import { setupTestApp, teardownTestApp, cleanDatabase, type TestContext } from '../common/test-setup.js';

describe('FavoritesModule (integration)', () => {
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
      data: { email: 'user@example.com', username: 'user', passwordHash: 'not-used' },
    });
    userId = user.id;
    userToken = ctx.app.get(JwtService).sign({ sub: user.id, email: user.email, username: user.username });
  });

  it('GET /favorites — returns empty list', async () => {
    const res = await ctx.agent.get('/favorites').set('Authorization', `Bearer ${userToken}`).expect(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.totalRecords).toBe(0);
  });

  it('POST /favorites — adds a favorite', async () => {
    const res = await ctx.agent
      .post('/favorites')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ targetType: 'team', targetId: 'sr:team:1' })
      .expect(201);
    expect(res.body.targetType).toBe('team');
    expect(res.body.targetId).toBe('sr:team:1');
    expect(res.body.userId).toBe(userId);
  });

  it('POST /favorites — rejects duplicate favorite', async () => {
    await ctx.agent
      .post('/favorites')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ targetType: 'team', targetId: 'sr:team:1' })
      .expect(201);
    const res = await ctx.agent
      .post('/favorites')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ targetType: 'team', targetId: 'sr:team:1' })
      .expect(409);
    expect(res.body.message).toContain('Already in favorites');
  });

  it('GET /favorites — lists user favorites', async () => {
    await ctx.prisma.favorite.create({ data: { userId, targetType: 'player', targetId: 'sr:player:1' } });
    const res = await ctx.agent.get('/favorites').set('Authorization', `Bearer ${userToken}`).expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].targetType).toBe('player');
  });

  it('GET /favorites?targetType=team — filters by type', async () => {
    await ctx.prisma.favorite.create({ data: { userId, targetType: 'team', targetId: 'sr:team:1' } });
    await ctx.prisma.favorite.create({ data: { userId, targetType: 'player', targetId: 'sr:player:1' } });
    const res = await ctx.agent.get('/favorites?targetType=team').set('Authorization', `Bearer ${userToken}`).expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].targetType).toBe('team');
  });

  it('DELETE /favorites/:id — removes a favorite', async () => {
    const fav = await ctx.prisma.favorite.create({ data: { userId, targetType: 'match', targetId: 'sr:match:1' } });
    await ctx.agent.delete(`/favorites/${fav.id}`).set('Authorization', `Bearer ${userToken}`).expect(200);
    const remaining = await ctx.prisma.favorite.count({ where: { userId } });
    expect(remaining).toBe(0);
  });

  it('DELETE /favorites/:id — rejects removing another user favorite', async () => {
    const otherUser = await ctx.prisma.user.create({
      data: { email: 'other@example.com', username: 'other', passwordHash: 'not-used' },
    });
    const fav = await ctx.prisma.favorite.create({ data: { userId: otherUser.id, targetType: 'team', targetId: 'sr:team:1' } });
    await ctx.agent.delete(`/favorites/${fav.id}`).set('Authorization', `Bearer ${userToken}`).expect(404);
  });

  it('GET /favorites — rejects unauthenticated', async () => {
    await ctx.agent.get('/favorites').expect(401);
  });

  it('POST /favorites — bookmarks a published news article', async () => {
    const article = await ctx.prisma.newsArticle.create({
      data: {
        title: 'Favorite this story',
        slug: 'favorite-this-story',
        content: 'Body',
        isPublished: true,
        publishedAt: new Date(),
      },
    });

    const created = await ctx.agent
      .post('/favorites')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ targetType: 'news', targetId: article.slug })
      .expect(201);
    expect(created.body.targetId).toBe(article.id);

    const listed = await ctx.agent
      .get('/favorites?targetType=news&expand=true')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(listed.body.data[0].target.title).toBe('Favorite this story');
  });

  it('POST /favorites — rejects unpublished news articles', async () => {
    const draft = await ctx.prisma.newsArticle.create({
      data: {
        title: 'Draft only',
        slug: 'draft-only',
        content: 'Body',
        isPublished: false,
      },
    });

    await ctx.agent
      .post('/favorites')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ targetType: 'news', targetId: draft.id })
      .expect(400);
  });

  it('favorites and expands tours and tournaments', async () => {
    await ctx.prisma.tour.create({
      data: { id: 'sr:tour:1', name: 'World Cricket Tour' },
    });
    await ctx.prisma.tournament.create({
      data: {
        id: 'sr:tournament:1',
        name: 'International Cup',
        tourId: 'sr:tour:1',
      },
    });

    await ctx.agent
      .post('/favorites')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ targetType: 'tour', targetId: 'sr:tour:1' })
      .expect(201);
    await ctx.agent
      .post('/favorites')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        targetType: 'tournament',
        targetId: 'sr:tournament:1',
      })
      .expect(201);

    const response = await ctx.agent
      .get('/favorites?expand=true')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetType: 'tour',
          target: expect.objectContaining({ name: 'World Cricket Tour' }),
        }),
        expect.objectContaining({
          targetType: 'tournament',
          target: expect.objectContaining({ name: 'International Cup' }),
        }),
      ]),
    );
  });

  it('rejects missing tours and tournaments', async () => {
    await ctx.agent
      .post('/favorites')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ targetType: 'tour', targetId: 'missing-tour' })
      .expect(400);
    await ctx.agent
      .post('/favorites')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ targetType: 'tournament', targetId: 'missing-tournament' })
      .expect(400);
  });
});
