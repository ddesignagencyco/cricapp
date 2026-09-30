import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { JwtService } from '@nestjs/jwt';
import type request from 'supertest';
import {
  cleanDatabase,
  setupTestApp,
  teardownTestApp,
  type TestContext,
} from '../common/test-setup.js';

/**
 * HTTP-level coverage for the AdSense admin routes: guards, query validation and
 * the unconfigured path. Configured behaviour is covered in
 * `adsense.service.spec.ts`, which stubs the upstream fetch.
 */
const ROUTES = [
  '/admin/adsense/status',
  '/admin/adsense/ad-units',
  '/admin/adsense/policy-issues',
  '/admin/adsense/reports',
] as const;

describe('AdSense admin API (integration)', () => {
  let ctx: TestContext;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    ctx = await setupTestApp();
  });

  afterAll(async () => teardownTestApp(ctx));

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
    const sign = (user: { id: string; email: string; username: string; isAdmin: boolean }): string =>
      ctx.app.get(JwtService).sign({
        sub: user.id,
        email: user.email,
        username: user.username,
        isAdmin: user.isAdmin,
        isSuperAdmin: false,
        emailVerified: true,
      });

    const admin = await ctx.prisma.user.create({
      data: {
        email: 'admin@example.com',
        username: 'admin',
        passwordHash: 'unused',
        emailVerified: true,
        isAdmin: true,
      },
    });
    const user = await ctx.prisma.user.create({
      data: {
        email: 'user@example.com',
        username: 'user',
        passwordHash: 'unused',
        emailVerified: true,
        isAdmin: false,
      },
    });
    adminToken = sign(admin);
    userToken = sign(user);
  });

  const asAdmin = (route: string): request.Test =>
    ctx.agent.get(route).set('Authorization', `Bearer ${adminToken}`);

  describe('guards', () => {
    it.each(ROUTES)('rejects %s without a token', async (route) => {
      await ctx.agent.get(route).expect(401);
    });

    it.each(ROUTES)('rejects %s for a signed-in non-admin', async (route) => {
      await ctx.agent.get(route).set('Authorization', `Bearer ${userToken}`).expect(403);
    });
  });

  describe('GET /admin/adsense/status', () => {
    it('reports unconfigured without calling AdSense', async () => {
      const res = await asAdmin('/admin/adsense/status').expect(200);
      expect(res.body).toEqual({
        configured: false,
        authMode: 'none',
        accountId: null,
        adClientId: null,
        publisherId: null,
      });
    });
  });

  describe('unconfigured', () => {
    it.each([
      ['/admin/adsense/ad-units', ''],
      ['/admin/adsense/policy-issues', ''],
      ['/admin/adsense/reports', '?dateRange=LAST_7_DAYS'],
    ])('answers %s with 503 naming the missing variables', async (route, query) => {
      const res = await asAdmin(route + query).expect(503);
      expect(String(res.body.message)).toContain('ADSENSE_SERVICE_ACCOUNT');
    });
  });

  describe('query validation', () => {
    it('rejects an unknown dimension', async () => {
      await asAdmin('/admin/adsense/reports?dimensions=NOT_A_DIMENSION').expect(400);
    });

    it('rejects an unknown metric', async () => {
      await asAdmin('/admin/adsense/reports?metrics=NOT_A_METRIC').expect(400);
    });

    it('accepts a comma-separated metric list', async () => {
      // Reaches the service, so it fails on configuration rather than validation.
      await asAdmin('/admin/adsense/reports?metrics=CLICKS,IMPRESSIONS').expect(503);
    });

    it('rejects an unknown date range', async () => {
      await asAdmin('/admin/adsense/reports?dateRange=LAST_DECADE').expect(400);
    });

    it('requires startDate and endDate together', async () => {
      const res = await asAdmin('/admin/adsense/reports?startDate=2026-08-01').expect(400);
      expect(JSON.stringify(res.body)).toContain('together');
    });

    it('rejects a malformed startDate', async () => {
      await asAdmin('/admin/adsense/reports?startDate=01-08-2026&endDate=2026-08-31').expect(400);
    });

    it('rejects a limit above the row cap', async () => {
      await asAdmin('/admin/adsense/reports?limit=10001').expect(400);
    });
  });

  describe('ad-units query', () => {
    it('accepts includeArchived as a boolean-ish value', async () => {
      await asAdmin('/admin/adsense/ad-units?includeArchived=true').expect(503);
      await asAdmin('/admin/adsense/ad-units?includeArchived=1').expect(503);
    });
  });
});
