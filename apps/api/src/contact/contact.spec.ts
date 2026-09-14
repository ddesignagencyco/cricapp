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

describe('ContactModule (integration)', () => {
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

  it('requires name, email and message', async () => {
    await ctx.agent
      .post('/contact')
      .send({ name: 'A', email: 'invalid', message: 'x' })
      .expect(400);
  });

  it('stores a submission and lets an admin resolve it', async () => {
    const created = await ctx.agent
      .post('/contact')
      .send({
        name: 'Ali Khan',
        email: 'ALI@example.com',
        message: 'Please contact me about CricApp.',
      })
      .expect(201);

    const list = await ctx.agent
      .get('/admin/contact-submissions?status=new')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(list.body.meta.totalRecords).toBe(1);
    expect(list.body.data[0].email).toBe('ali@example.com');

    const updated = await ctx.agent
      .patch(
        `/admin/contact-submissions/${created.body.submission.id}/status`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'resolved' })
      .expect(200);
    expect(updated.body.status).toBe('resolved');
  });
});
