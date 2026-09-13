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

  async function loginCookie() {
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { email: signupPayload.email },
    });
    await ctx.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });
    const response = await ctx.agent.post('/auth/login').send({
      email: signupPayload.email,
      password: signupPayload.password,
    }).expect(200);
    const setCookie = response.headers['set-cookie'];
    return {
      response,
      cookie: (Array.isArray(setCookie) ? setCookie[0] : setCookie).split(';')[0],
    };
  }

  it('POST /auth/signup — creates a new account', async () => {
    const res = await ctx.agent.post('/auth/signup').send(signupPayload).expect(201);
    expect(res.body.access_token).toBeUndefined();
    expect(res.body.message).toContain('verify');
    expect(res.body.user.email).toBe(signupPayload.email);
    expect(res.body.user.emailVerified).toBe(false);
  });

  it('POST /auth/signup — rejects duplicate email', async () => {
    await ctx.agent.post('/auth/signup').send(signupPayload).expect(201);
    const res = await ctx.agent.post('/auth/signup').send(signupPayload).expect(409);
    expect(res.body.message).toContain('Email already registered');
  });

  it('POST /auth/login — rejects valid credentials until email is verified', async () => {
    await ctx.agent.post('/auth/signup').send(signupPayload).expect(201);
    const res = await ctx.agent.post('/auth/login').send({
      email: signupPayload.email,
      password: signupPayload.password,
    }).expect(403);
    expect(res.body.message).toContain('not verified');
  });

  it('POST /auth/login — sets an HttpOnly cookie for a verified account', async () => {
    await ctx.agent.post('/auth/signup').send(signupPayload).expect(201);
    const { response } = await loginCookie();
    expect(response.body.access_token).toBeUndefined();
    expect(response.body.user.username).toBe(signupPayload.username);
    expect(response.headers['set-cookie'][0]).toContain('cricapp_access_token=');
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
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
    const { cookie } = await loginCookie();
    const res = await ctx.agent
      .get('/auth/me')
      .set('Cookie', cookie)
      .expect(200);
    expect(res.body.email).toBe(signupPayload.email);
    expect(res.body.id).toBe(signup.body.user.id);
  });

  it('GET /auth/me — rejects unauthenticated request', async () => {
    await ctx.agent.get('/auth/me').expect(401);
  });

  it('PATCH /auth/me — updates profile fields', async () => {
    await ctx.agent.post('/auth/signup').send(signupPayload).expect(201);
    const { cookie } = await loginCookie();
    const res = await ctx.agent
      .patch('/auth/me')
      .set('Cookie', cookie)
      .send({ displayName: 'Updated Name', avatarUrl: 'https://cdn.example.com/a.jpg' })
      .expect(200);
    expect(res.body.displayName).toBe('Updated Name');
    expect(res.body.avatarUrl).toBe('https://cdn.example.com/a.jpg');
  });

  it('POST /auth/logout — clears the authentication cookie', async () => {
    const res = await ctx.agent.post('/auth/logout').expect(200);
    expect(res.headers['set-cookie'][0]).toContain('cricapp_access_token=');
    expect(res.headers['set-cookie'][0]).toContain('Expires=');
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

  it('POST /auth/reset-password — rejects the removed OTP-only contract', async () => {
    await ctx.agent.post('/auth/reset-password').send({
      tokenId: '00000000-0000-0000-0000-000000000000',
      code: '4829',
      password: 'newpassword123',
    }).expect(400);
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
