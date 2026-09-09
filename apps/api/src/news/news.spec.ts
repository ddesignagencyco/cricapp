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

  it('GET /news/:slug — returns article by slug', async () => {
    const create = await ctx.agent
      .post('/news')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Slug Test', content: 'Body', isPublished: true })
      .expect(201);

    const res = await ctx.agent.get(`/news/${create.body.slug}`).expect(200);
    expect(res.body.title).toBe('Slug Test');
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
});
