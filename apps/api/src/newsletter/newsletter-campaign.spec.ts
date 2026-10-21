import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { JwtService } from '@nestjs/jwt';
import {
  cleanDatabase,
  setupTestApp,
  teardownTestApp,
  type TestContext,
} from '../common/test-setup.js';
import { MailerService, type SendMailOptions } from '../mailer/mailer.service.js';
import { NewsletterCampaignService, isoWeek, maskEmail, pktParts, wants } from './newsletter-campaign.service.js';
import { splitPercent } from './newsletter-templates.js';

describe('Newsletter campaigns (integration)', () => {
  let ctx: TestContext;
  let adminToken: string;
  let sent: SendMailOptions[];

  beforeAll(async () => {
    ctx = await setupTestApp();
  });

  afterAll(async () => teardownTestApp(ctx));

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
    sent = [];
    jest.spyOn(ctx.app.get(MailerService), 'sendMail').mockImplementation(async (mail) => {
      sent.push(mail);
    });
    const admin = await ctx.prisma.user.create({
      data: { email: 'admin@example.com', username: 'admin', passwordHash: 'unused', emailVerified: true, isAdmin: true },
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

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const subscriber = (email: string, preferences: Record<string, boolean> = {}) =>
    ctx.prisma.newsletterSubscriber.create({
      data: { email, unsubscribeToken: crypto.randomUUID(), preferences },
    });

  const story = () =>
    ctx.prisma.newsArticle.create({
      data: {
        title: 'Pakistan name new captain - Cricbuzz',
        slug: 'pakistan-name-new-captain',
        summary: 'A new era begins.',
        content: '<p>Story</p>',
        isPublished: true,
        publishedAt: new Date(Date.now() - 3600_000),
      },
    });

  it('shows a masked status and toggles preferences by token', async () => {
    const s = await subscriber('fan@example.com');

    const status = await ctx.agent.get(`/newsletter/subscription/${s.unsubscribeToken}`).expect(200);
    expect(status.body.email).toBe('fa•@example.com');
    expect(status.body.status).toBe('active');
    expect(status.body.preferences.every((p: { enabled: boolean }) => p.enabled)).toBe(true);

    const updated = await ctx.agent
      .put('/newsletter/preferences')
      .send({ token: s.unsubscribeToken, preferences: { daily_digest: false } })
      .expect(200);
    expect(updated.body.preferences.find((p: { type: string }) => p.type === 'daily_digest').enabled).toBe(false);
    expect(updated.body.status).toBe('active');

    // Everything off is an unsubscribe.
    const off = Object.fromEntries(updated.body.preferences.map((p: { type: string }) => [p.type, false]));
    const all = await ctx.agent.put('/newsletter/preferences').send({ token: s.unsubscribeToken, preferences: off }).expect(200);
    expect(all.body.status).toBe('unsubscribed');

    await ctx.agent.post('/newsletter/resubscribe').send({ token: s.unsubscribeToken }).expect(200);
    expect((await ctx.prisma.newsletterSubscriber.findUniqueOrThrow({ where: { id: s.id } })).status).toBe('active');
  });

  it('rejects unknown and malformed tokens', async () => {
    await ctx.agent.get(`/newsletter/subscription/${crypto.randomUUID()}`).expect(404);
    await ctx.agent.get('/newsletter/subscription/not-a-token').expect(400);
    await ctx.agent.post('/newsletter/unsubscribe/one-click?token=nope').expect(400);
  });

  it('unsubscribes with RFC 8058 one-click POST', async () => {
    const s = await subscriber('fan@example.com');
    await ctx.agent
      .post(`/newsletter/unsubscribe/one-click?token=${s.unsubscribeToken}`)
      .type('form')
      .send('List-Unsubscribe=One-Click')
      .expect(200);
    expect((await ctx.prisma.newsletterSubscriber.findUniqueOrThrow({ where: { id: s.id } })).status).toBe('unsubscribed');
  });

  it('records clicks and only redirects to the site itself', async () => {
    const s = await subscriber('fan@example.com');
    const ok = await ctx.agent
      .get('/newsletter/click')
      .query({ token: s.unsubscribeToken, url: 'http://localhost:3000/psl' })
      .expect(302);
    expect(ok.headers.location).toBe('http://localhost:3000/psl');
    expect((await ctx.prisma.newsletterSubscriber.findUniqueOrThrow({ where: { id: s.id } })).lastEngagedAt).toBeTruthy();

    const evil = await ctx.agent.get('/newsletter/click').query({ url: 'https://evil.example/phish' }).expect(302);
    expect(evil.headers.location).toBe('http://localhost:3000');
  });

  it('sends an issue once, honours opt-outs and adds unsubscribe headers', async () => {
    const article = await story();
    await subscriber('one@example.com');
    await subscriber('two@example.com', { breaking_news: false });
    await subscriber('gone@example.com').then((s) =>
      ctx.prisma.newsletterSubscriber.update({ where: { id: s.id }, data: { status: 'unsubscribed' } }),
    );
    const campaigns = ctx.app.get(NewsletterCampaignService);

    const first = await campaigns.send({ type: 'breaking_news', newsId: article.id });
    expect(first).toMatchObject({ eligible: 1, sent: 1, failed: 0 });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('one@example.com');
    expect(sent[0].subject).toBe('🚨 Pakistan name new captain');
    expect(sent[0].headers?.['List-Unsubscribe']).toMatch(/\/api\/newsletter\/unsubscribe\/one-click\?token=/);
    expect(sent[0].headers?.['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    expect(sent[0].html).toContain('Unsubscribe');

    const again = await campaigns.send({ type: 'breaking_news', newsId: article.id });
    expect(again).toMatchObject({ eligible: 0, sent: 0 });
    expect(sent).toHaveLength(1);
    expect(await ctx.prisma.newsletterSend.count({ where: { status: 'sent' } })).toBe(1);
  });

  it('caps newsletters per subscriber per day', async () => {
    const article = await story();
    const s = await subscriber('busy@example.com');
    await ctx.prisma.newsletterSend.createMany({
      data: [
        { subscriberId: s.id, type: 'daily_digest', issueKey: 'a', subject: 'x' },
        { subscriberId: s.id, type: 'psl_update', issueKey: 'b', subject: 'y' },
      ],
    });
    const result = await ctx.app.get(NewsletterCampaignService).send({ type: 'breaking_news', newsId: article.id });
    expect(result).toMatchObject({ eligible: 1, sent: 0, skipped: 1 });
    expect(sent).toHaveLength(0);
  });

  it('lets admins preview and test-send, and nobody else', async () => {
    const article = await story();
    await ctx.agent.post('/admin/newsletter/campaigns/preview').send({ type: 'breaking_news', newsId: article.id }).expect(401);

    const preview = await ctx.agent
      .post('/admin/newsletter/campaigns/preview')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'breaking_news', newsId: article.id })
      .expect(200);
    expect(preview.body.subject).toBe('🚨 Pakistan name new captain');
    expect(preview.body.html).toContain('PakCricZone');

    await ctx.agent
      .post('/admin/newsletter/campaigns/test')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'breaking_news', newsId: article.id })
      .expect(200);
    expect(sent[0].to).toBe('admin@example.com');
    expect(sent[0].subject).toMatch(/^\[TEST\]/);
    expect(await ctx.prisma.newsletterSend.count()).toBe(0);

    await ctx.agent
      .post('/admin/newsletter/campaigns/preview')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'daily_digest' })
      .expect(400);
    await ctx.agent
      .post('/admin/newsletter/campaigns/preview')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'spam' })
      .expect(400);

    const overview = await ctx.agent.get('/admin/newsletter/campaigns').set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(overview.body.autoSend).toBe(false);
    expect(overview.body.types).toHaveLength(6);
  });
});

describe('newsletter helpers', () => {
  it('treats missing preference keys as on', () => {
    expect(wants({}, 'daily_digest')).toBe(true);
    expect(wants({ daily_digest: false }, 'daily_digest')).toBe(false);
    expect(wants(null, 'psl_update')).toBe(true);
  });

  it('rounds win percentages to exactly 100', () => {
    expect(splitPercent(0.6667, 0.3333)).toEqual([67, 33]);
    expect(splitPercent(0.505, 0.505).reduce((a, b) => a + b)).toBe(100);
  });

  it('uses the Pakistan clock for dates and weeks', () => {
    // 20:30 UTC on Saturday is 01:30 PKT on Sunday.
    const d = new Date('2026-10-24T20:30:00Z');
    expect(pktParts(d)).toEqual({ date: '2026-10-25', hour: 1, weekday: 'Sun' });
    expect(isoWeek(d)).toBe('2026-W43');
    expect(maskEmail('ab@x.com')).toBe('ab•@x.com');
  });
});
