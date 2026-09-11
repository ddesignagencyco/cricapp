import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { setupTestApp, teardownTestApp, cleanDatabase, type TestContext } from '../common/test-setup.js';

describe('AuthModule (integration)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestApp();
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
  });

  const signupPayload = {
    email: 'test@example.com',
    username: 'testuser',
    password: 'password123',
    displayName: 'Test User',
  };

  it('POST /auth/signup — creates a new account', async () => {
    const res = await ctx.agent.post('/auth/signup').send(signupPayload).expect(201);
    expect(res.body.access_token).toBeDefined();
    expect(res.body.user.email).toBe(signupPayload.email);
    expect(res.body.user.emailVerified).toBe(false);
  });

  it('POST /auth/signup — rejects duplicate email', async () => {
    await ctx.agent.post('/auth/signup').send(signupPayload).expect(201);
    const res = await ctx.agent.post('/auth/signup').send(signupPayload).expect(409);
    expect(res.body.message).toContain('Email already registered');
  });

  it('POST /auth/login — returns token for valid credentials', async () => {
    await ctx.agent.post('/auth/signup').send(signupPayload).expect(201);
    const res = await ctx.agent.post('/auth/login').send({
      email: signupPayload.email,
      password: signupPayload.password,
    }).expect(200);
    expect(res.body.access_token).toBeDefined();
    expect(res.body.user.username).toBe(signupPayload.username);
  });

  it('POST /auth/login — rejects invalid credentials', async () => {
    const res = await ctx.agent.post('/auth/login').send({
      email: 'nobody@example.com',
      password: 'wrong',
    }).expect(401);
    expect(res.body.message).toContain('Invalid credentials');
  });

  it('GET /auth/me — returns profile for authenticated user', async () => {
    const signup = await ctx.agent.post('/auth/signup').send(signupPayload).expect(201);
    const res = await ctx.agent
      .get('/auth/me')
      .set('Authorization', `Bearer ${signup.body.access_token}`)
      .expect(200);
    expect(res.body.email).toBe(signupPayload.email);
    expect(res.body.id).toBe(signup.body.user.id);
  });

  it('GET /auth/me — rejects unauthenticated request', async () => {
    await ctx.agent.get('/auth/me').expect(401);
  });

  it('PATCH /auth/me — updates profile fields', async () => {
    const signup = await ctx.agent.post('/auth/signup').send(signupPayload).expect(201);
    const res = await ctx.agent
      .patch('/auth/me')
      .set('Authorization', `Bearer ${signup.body.access_token}`)
      .send({ displayName: 'Updated Name', avatarUrl: 'https://cdn.example.com/a.jpg' })
      .expect(200);
    expect(res.body.displayName).toBe('Updated Name');
    expect(res.body.avatarUrl).toBe('https://cdn.example.com/a.jpg');
  });

  it('POST /auth/forgot-password — returns generic message for unknown email', async () => {
    const res = await ctx.agent.post('/auth/forgot-password').send({ email: 'missing@example.com' }).expect(200);
    expect(res.body.message).toContain('If an account exists');
  });

  it('POST /auth/forgot-password — returns generic message for known email', async () => {
    await ctx.agent.post('/auth/signup').send(signupPayload).expect(201);
    const res = await ctx.agent.post('/auth/forgot-password').send({ email: signupPayload.email }).expect(200);
    expect(res.body.message).toContain('If an account exists');
  });

  it('POST /auth/reset-password — rejects invalid token', async () => {
    const res = await ctx.agent.post('/auth/reset-password').send({
      tokenId: '00000000-0000-0000-0000-000000000000',
      token: 'invalid-token',
      password: 'newpassword123',
    }).expect(400);
    expect(res.body.message).toContain('Invalid or expired token');
  });

  it('POST /auth/verify-email — rejects invalid token', async () => {
    const res = await ctx.agent.post('/auth/verify-email').send({
      tokenId: '00000000-0000-0000-0000-000000000000',
      token: 'invalid-token',
    }).expect(400);
    expect(res.body.message).toContain('Invalid or expired verification token');
  });

  it('POST /auth/resend-verification — returns generic message for unknown email', async () => {
    const res = await ctx.agent.post('/auth/resend-verification').send({ email: 'missing@example.com' }).expect(200);
    expect(res.body.message).toContain('If an account exists');
  });
});
