import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals';
import { JwtService } from '@nestjs/jwt';
import type request from 'supertest';
import {
  cleanDatabase,
  setupTestApp,
  teardownTestApp,
  type TestContext,
} from '../common/test-setup.js';
import { EMPTY_AD_CONFIG } from './ad.config.js';

describe('SiteSettings ads (integration)', () => {
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

  const put = (body: Record<string, unknown>): request.Test =>
    ctx.agent
      .put('/admin/site-settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body);

  describe('GET /site-settings', () => {
    it('returns house-ad defaults when no row exists', async () => {
      const res = await ctx.agent.get('/site-settings').expect(200);
      expect(res.body.ads).toEqual(EMPTY_AD_CONFIG);
    });

    it('exposes the stored ad config publicly', async () => {
      await put({
        ads: {
          mode: 'adsense',
          clientId: 'pub-1234567890123456',
          defaultSlots: { leaderboard: '1234567890' },
        },
      }).expect(200);

      const res = await ctx.agent.get('/site-settings').expect(200);
      expect(res.body.ads.mode).toBe('adsense');
      expect(res.body.ads.clientId).toBe('pub-1234567890123456');
      expect(res.body.ads.defaultSlots.leaderboard).toBe('1234567890');
      // Untouched sizes still come back as explicit nulls.
      expect(res.body.ads.defaultSlots['half-page']).toBeNull();
    });
  });

  describe('PUT /admin/site-settings', () => {
    it('requires admin auth', async () => {
      await ctx.agent
        .put('/admin/site-settings')
        .send({ ads: { mode: 'adsense' } })
        .expect(401);
    });

    it('stores a full adsense config', async () => {
      const res = await put({
        ads: {
          mode: 'adsense',
          clientId: 'pub-1234567890123456',
          defaultSlots: {
            leaderboard: '1234567890',
            'medium-rectangle': '2345678901',
          },
          placements: {
            'layout-sidebar': { enabled: false, slotId: '3456789012' },
          },
          gamblingAds: true,
        },
      }).expect(200);

      expect(res.body.ads).toEqual({
        mode: 'adsense',
        clientId: 'pub-1234567890123456',
        defaultSlots: {
          ...EMPTY_AD_CONFIG.defaultSlots,
          leaderboard: '1234567890',
          'medium-rectangle': '2345678901',
        },
        placements: {
          'layout-sidebar': { enabled: false, slotId: '3456789012' },
        },
        gamblingAds: true,
      });
    });

    it('merges a partial payload instead of replacing the config', async () => {
      await put({
        ads: {
          mode: 'adsense',
          clientId: 'pub-1234567890123456',
          defaultSlots: { leaderboard: '1234567890', 'medium-rectangle': '2345678901' },
          placements: {
            'layout-sidebar': { enabled: false, slotId: '3456789012' },
            'home-sidebar': { enabled: true, slotId: '4567890123' },
          },
          gamblingAds: true,
        },
      }).expect(200);

      // Toggling one placement must not drop the mode, the other placement,
      // the per-size defaults, or the gambling opt-in.
      const res = await put({
        ads: { placements: { 'layout-sidebar': { enabled: true } } },
      }).expect(200);

      expect(res.body.ads.mode).toBe('adsense');
      expect(res.body.ads.clientId).toBe('pub-1234567890123456');
      expect(res.body.ads.defaultSlots.leaderboard).toBe('1234567890');
      expect(res.body.ads.defaultSlots['medium-rectangle']).toBe('2345678901');
      expect(res.body.ads.gamblingAds).toBe(true);
      expect(res.body.ads.placements['layout-sidebar']).toEqual({
        enabled: true,
        slotId: '3456789012',
      });
      expect(res.body.ads.placements['home-sidebar']).toEqual({
        enabled: true,
        slotId: '4567890123',
      });
    });

    it('keeps a placement ad unit id when only its enabled flag is sent', async () => {
      await put({
        ads: { placements: { 'layout-sidebar': { enabled: false, slotId: '3456789012' } } },
      }).expect(200);

      // Re-enabling sends `{ enabled: true }` with no slotId. A flat merge here
      // would silently wipe the configured ad unit.
      const res = await put({
        ads: { placements: { 'layout-sidebar': { enabled: true } } },
      }).expect(200);

      expect(res.body.ads.placements['layout-sidebar']).toEqual({
        enabled: true,
        slotId: '3456789012',
      });
    });

    it('lets gamblingAds be turned back off', async () => {
      await put({ ads: { gamblingAds: true } }).expect(200);
      const res = await put({ ads: { gamblingAds: false } }).expect(200);
      expect(res.body.ads.gamblingAds).toBe(false);
    });

    it('rejects a malformed publisher id at the validation layer', async () => {
      await put({ ads: { clientId: 'not-a-publisher' } }).expect(400);
    });

    it('drops a malformed slot id rather than rejecting the request', async () => {
      // `defaultSlots` and `placements` are free-form maps, so class-validator
      // does not descend into them (no @ValidateNested). The normalisation
      // layer is the guard for their contents, unlike the top-level `clientId`
      // and `mode` which are validated and rejected with a 400.
      const res = await put({
        ads: {
          defaultSlots: { leaderboard: 'abc' },
          placements: { 'layout-sidebar': { enabled: true, slotId: 'nope' } },
        },
      }).expect(200);

      expect(res.body.ads.defaultSlots.leaderboard).toBeNull();
      expect(res.body.ads.placements['layout-sidebar']).toEqual({
        enabled: true,
        slotId: null,
      });
    });

    it('normalises a ca-prefixed, uppercase publisher id', async () => {
      const res = await put({ ads: { clientId: 'CA-PUB-1234567890123456' } }).expect(200);
      expect(res.body.ads.clientId).toBe('pub-1234567890123456');
    });

    it('accepts the ca-prefixed id AdSense shows in the dashboard', async () => {
      const res = await put({ ads: { clientId: 'ca-pub-1234567890123456' } }).expect(200);
      expect(res.body.ads.clientId).toBe('pub-1234567890123456');
    });

    it('rejects a malformed mode at the validation layer', async () => {
      await put({ ads: { mode: 'nonsense' } }).expect(400);
    });

    it('degrades an unrecognised mode already in the database on read', async () => {
      // Validation rejects a bad mode on the way in, so this only happens if the
      // row was written by hand or by an older build. Reading must not 500.
      await ctx.prisma.siteSettings.create({
        data: { id: 'default', ads: { mode: 'nonsense' } },
      });
      const res = await ctx.agent.get('/site-settings').expect(200);
      expect(res.body.ads.mode).toBe('house');
    });

    it('leaves ads untouched when the field is omitted', async () => {
      await put({ ads: { mode: 'adsense', clientId: 'pub-1234567890123456' } }).expect(200);
      const res = await put({ email: 'hello@example.com' }).expect(200);
      expect(res.body.email).toBe('hello@example.com');
      expect(res.body.ads.mode).toBe('adsense');
      expect(res.body.ads.clientId).toBe('pub-1234567890123456');
    });

    it('persists the config on the singleton default row', async () => {
      await put({ ads: { mode: 'adsense' } }).expect(200);
      const rows = await ctx.prisma.siteSettings.findMany();
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe('default');
    });
  });
});
