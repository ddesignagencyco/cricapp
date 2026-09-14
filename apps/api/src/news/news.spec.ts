import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { JwtService } from '@nestjs/jwt';
import { setupTestApp, teardownTestApp, cleanDatabase, type TestContext } from '../common/test-setup.js';

describe('NewsModule (integration)', () => {
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
    // Create admin user and get token
    const admin = await ctx.prisma.user.create({
      data: {
        email: 'admin@example.com',
        username: 'admin',
        passwordHash: 'not-used',
        isAdmin: true,
      },
    });
    adminToken = ctx.app.get(JwtService).sign({ sub: admin.id, email: admin.email, username: admin.username, isAdmin: true });
  });

  it('GET /news — returns empty paginated list', async () => {
    const res = await ctx.agent.get('/news').expect(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.totalRecords).toBe(0);
  });

  it('POST /news — admin can create article', async () => {
    const res = await ctx.agent
      .post('/news')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Test Article',
        summary: 'A test summary',
        content: 'Full content here',
        author: 'Tester',
        isPublished: true,
      })
      .expect(201);
    expect(res.body.title).toBe('Test Article');
    expect(res.body.slug).toBe('test-article');
  });

  it('POST /news — rejects titles longer than 50 words', async () => {
    const title = Array.from({ length: 51 }, (_, i) => `word${i}`).join(' ');
    const res = await ctx.agent
      .post('/news')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title, content: 'Body' })
      .expect(400);
    expect(res.body.message).toContain('50 words');
  });

  it('supports category CRUD by SEO slug', async () => {
    const created = await ctx.agent
      .post('/news/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Pakistan Super League', slug: 'psl' })
      .expect(201);
    expect(created.body.slug).toBe('psl');

    await ctx.agent.get('/news/categories/psl').expect(200);

    const updated = await ctx.agent
      .patch('/news/categories/psl')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'PSL' })
      .expect(200);
    expect(updated.body.name).toBe('PSL');

    await ctx.agent
      .delete(`/news/categories/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('GET /news/:slug — returns article by slug', async () => {
    const create = await ctx.agent
      .post('/news')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Slug Test', content: 'Body', isPublished: true })
      .expect(201);

    const res = await ctx.agent.get(`/news/${create.body.slug}`).expect(200);
    expect(res.body.title).toBe('Slug Test');
  });

  it('generates and resolves a Unicode slug for an Urdu title', async () => {
    const title = 'پاکستان نے شاندار فتح حاصل کی';
    const created = await ctx.agent
      .post('/news')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title, content: 'مکمل خبر', language: 'ur', isPublished: true })
      .expect(201);

    expect(created.body.slug).toBe('پاکستان-نے-شاندار-فتح-حاصل-کی');
    const response = await ctx.agent
      .get(`/news/${encodeURIComponent(created.body.slug)}`)
      .expect(200);
    expect(response.body.title).toBe(title);
  });

  it('PATCH /news/:id — admin can update article', async () => {
    const create = await ctx.agent
      .post('/news')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Old Title', content: 'Body', isPublished: true })
      .expect(201);

    const res = await ctx.agent
      .patch(`/news/${create.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'New Title' })
      .expect(200);
    expect(res.body.title).toBe('New Title');
  });

  it('DELETE /news/:id — admin can delete article', async () => {
    const create = await ctx.agent
      .post('/news')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'To Delete', content: 'Body', isPublished: true })
      .expect(201);

    await ctx.agent
      .delete(`/news/${create.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await ctx.agent.get(`/news/${create.body.id}`).expect(404);
  });

  it('GET /news — hides unpublished drafts from public list', async () => {
    await ctx.agent
      .post('/news')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Draft Article', content: 'Body', isPublished: false })
      .expect(201);

    const res = await ctx.agent.get('/news').expect(200);
    expect(res.body.data).toEqual([]);
  });

  it('GET /admin/news — includes drafts for admin', async () => {
    await ctx.agent
      .post('/news')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Draft Article', content: 'Body', isPublished: false })
      .expect(201);

    const res = await ctx.agent
      .get('/admin/news')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('POST /news — rejects non-admin', async () => {
    const user = await ctx.prisma.user.create({
      data: { email: 'user@example.com', username: 'user', passwordHash: 'not-used', isAdmin: false },
    });
    const userToken = ctx.app.get(JwtService).sign({ sub: user.id, email: user.email, username: user.username, isAdmin: false });

    await ctx.agent
      .post('/news')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Hack', content: 'Body' })
      .expect(403);
  });

  it('exposes public author profiles with their published articles', async () => {
    const author = await ctx.agent
      .post('/admin/authors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ayesha Malik', bio: 'Cricket writer' })
      .expect(201);

    await ctx.agent
      .post('/news')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Bylined report',
        content: 'Body',
        authorId: author.body.id,
        isPublished: true,
      })
      .expect(201);

    const list = await ctx.agent.get('/authors').expect(200);
    expect(list.body[0].articleCount).toBe(1);

    const profile = await ctx.agent
      .get('/authors/ayesha-malik')
      .expect(200);
    expect(profile.body.author.name).toBe('Ayesha Malik');
    expect(profile.body.articles.data[0].title).toBe('Bylined report');

    const byId = await ctx.agent
      .get(`/authors/${author.body.id}`)
      .expect(200);
    expect(byId.body.articles.meta.totalRecords).toBe(1);

    const listed = await ctx.agent
      .get(`/news?authorId=${author.body.id}`)
      .expect(200);
    expect(listed.body.meta.totalRecords).toBe(1);
    expect(listed.body.data[0].authorId).toBe(author.body.id);
  });

  it('POST /news — rejects invalid linked entity ids', async () => {
    const res = await ctx.agent
      .post('/news')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Linked article',
        content: 'Body',
        playerIds: ['string'],
        teamIds: ['string'],
      })
      .expect(400);
    expect(res.body.message).toContain('player');
  });

  it('stores linked native Urdu content and returns hreflang and JSON-LD', async () => {
    const english = await ctx.agent
      .post('/news')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Pakistan win final',
        content: 'English body',
        language: 'en',
        pushNotificationTitle: 'Pakistan win',
        pushNotificationBody: 'Open for the full report',
        socialCopy: 'Pakistan are champions.',
        isPublished: true,
      })
      .expect(201);
    expect(english.body.pushNotificationTitle).toBe('Pakistan win');

    const urdu = await ctx.agent
      .post(`/news/${english.body.id}/translations`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'پاکستان نے فائنل جیت لیا',
        content: 'اردو خبر کا مکمل متن',
        language: 'ur',
        isPublished: true,
      })
      .expect(201);
    expect(urdu.body.translationGroupId).toBeTruthy();

    const seo = await ctx.agent
      .get(`/news/${english.body.slug}/seo`)
      .expect(200);
    expect(seo.body.jsonLd['@type']).toBe('NewsArticle');
    expect(seo.body.hreflang.map((item: any) => item.language)).toEqual([
      'en',
      'ur',
    ]);

    const publicArticle = await ctx.agent
      .get(`/news/${english.body.slug}`)
      .expect(200);
    expect(publicArticle.body.pushNotificationTitle).toBeUndefined();
  });

  it('serves a Google News sitemap', async () => {
    await ctx.agent
      .post('/news')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Fresh sitemap story',
        content: 'Body',
        isPublished: true,
      })
      .expect(201);

    const response = await ctx.agent
      .get('/news/google-news-sitemap.xml')
      .expect('Content-Type', /xml/)
      .expect(200);
    expect(response.text).toContain('<news:title>Fresh sitemap story</news:title>');
  });

  it('provides admin-managed editorial policy pages', async () => {
    await ctx.agent
      .put('/admin/editorial-pages/editorial-policy')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Editorial Policy',
        content: 'Our editorial standards.',
      })
      .expect(200);

    const page = await ctx.agent
      .get('/editorial-pages/editorial-policy')
      .expect(200);
    expect(page.body.content).toBe('Our editorial standards.');
  });
});
