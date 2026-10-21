import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { MailerService } from '../mailer/mailer.service.js';
import { NewsletterContentService, type Tagged } from './newsletter-content.service.js';
import {
  NEWSLETTER_TYPES,
  NEWSLETTER_TYPE_INFO,
  renderBreakingNews,
  renderDailyDigest,
  renderMatchPreview,
  renderPslUpdate,
  renderReengagement,
  renderWeeklyRoundup,
  type FixtureRow,
  type NewsletterType,
  type Recipient,
  type RenderedNewsletter,
  type ResultRow,
} from './newsletter-templates.js';

export type CampaignInput = { type: NewsletterType; matchId?: string; newsId?: string };

type Subscriber = {
  id: string;
  email: string;
  userId: string | null;
  unsubscribeToken: string;
  preferences: Prisma.JsonValue;
  lastEngagedAt: Date | null;
  subscribedAt: Date;
};

/** One issue of a newsletter: its key, and how to render it for a given subscriber. */
type Issue = {
  type: NewsletterType;
  issueKey: string;
  render: (r: Recipient) => RenderedNewsletter;
  /** The subscribers this issue is for (re-engagement narrows the list). */
  audience?: (s: Subscriber) => boolean;
  /** Favourite-team content source, when the type shows it. */
  favourites?: { results: Tagged<ResultRow>[]; fixtures: Tagged<FixtureRow>[] };
};

export type CampaignResult = {
  type: NewsletterType;
  issueKey: string;
  subject: string;
  eligible: number;
  sent: number;
  skipped: number;
  failed: number;
};

const TZ = 'Asia/Karachi';
const LOCK_KEY = 'newsletter:scheduler:lock';
const TICK_MS = 5 * 60_000;

/**
 * Builds and delivers newsletter campaigns.
 *
 * Safety rules, enforced here for every send path (scheduler, admin, tests):
 * - the (subscriber, type, issue) unique key means nobody gets the same issue twice;
 * - at most NEWSLETTER_MAX_PER_DAY newsletters per subscriber per 24 hours;
 * - at most NEWSLETTER_DAILY_LIMIT sends per 24 hours overall (Gmail SMTP allows ~500);
 * - subscribers who switched a type off never get it;
 * - every email carries List-Unsubscribe and List-Unsubscribe-Post (one-click) headers.
 *
 * Scheduled sending runs only when NEWSLETTER_AUTO_SEND=true; otherwise an admin sends.
 */
@Injectable()
export class NewsletterCampaignService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NewsletterCampaignService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly mailer: MailerService,
    private readonly content: NewsletterContentService,
    private readonly config: ConfigService,
  ) {}

  /* ─── Config ─── */

  get autoSend(): boolean {
    return String(this.config.get('NEWSLETTER_AUTO_SEND', 'false')).toLowerCase() === 'true';
  }

  private num(key: string, fallback: number): number {
    const v = Number(this.config.get(key, fallback));
    return Number.isFinite(v) && v >= 0 ? v : fallback;
  }

  private get apiUrl(): string {
    return this.config.get<string>('API_PUBLIC_URL', 'http://localhost:3001').replace(/\/$/, '');
  }

  /* ─── Scheduler ─── */

  onModuleInit() {
    if (!this.autoSend || process.env.NODE_ENV === 'test') return;
    this.logger.log('Newsletter auto-send is ON; checking the schedule every 5 minutes.');
    this.timer = setInterval(() => void this.tick(), TICK_MS);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** One scheduler pass. A Redis lock keeps a second API instance from sending too. */
  async tick(now = new Date()): Promise<CampaignResult[]> {
    if (this.running) return [];
    const got = await this.redis.cached.set(LOCK_KEY, String(process.pid), 'EX', 20 * 60, 'NX').catch(() => null);
    if (got !== 'OK') return [];
    this.running = true;
    try {
      const due = await this.dueCampaigns(now);
      const results: CampaignResult[] = [];
      for (const input of due) {
        try {
          const result = await this.send(input, now);
          if (result) results.push(result);
        } catch (error) {
          this.logger.error(`Scheduled ${input.type} failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      return results;
    } finally {
      this.running = false;
      await this.redis.cached.del(LOCK_KEY).catch(() => null);
    }
  }

  /** Which campaigns the schedule says are due right now (PKT clock). */
  async dueCampaigns(now: Date): Promise<CampaignInput[]> {
    const pkt = pktParts(now);
    const due: CampaignInput[] = [];

    // Daily digest from 08:00 PKT, Monday–Saturday (Sunday has the weekly roundup).
    if (pkt.hour >= 8 && pkt.weekday !== 'Sun') due.push({ type: 'daily_digest' });
    // Weekly roundup on Sunday from 10:00 PKT.
    if (pkt.hour >= 10 && pkt.weekday === 'Sun') due.push({ type: 'weekly_roundup' });
    // PSL update on Tuesdays and Fridays from 12:00 PKT, in season only.
    if (pkt.hour >= 12 && (pkt.weekday === 'Tue' || pkt.weekday === 'Fri') && (await this.content.pslActive(now))) {
      due.push({ type: 'psl_update' });
    }
    // Match previews for Pakistan/PSL matches starting in 45 minutes to 3 hours.
    const previews = await this.content.previewCandidates(
      new Date(now.getTime() + 45 * 60_000),
      new Date(now.getTime() + 3 * 3600_000),
    );
    for (const matchId of previews) due.push({ type: 'match_preview', matchId });
    // Re-engagement on Wednesdays from 18:00 PKT.
    if (pkt.hour >= 18 && pkt.weekday === 'Wed') due.push({ type: 'reengagement' });
    return due;
  }

  /* ─── Building ─── */

  /** Builds an issue, or explains why there is nothing worth sending. */
  async build(input: CampaignInput, now = new Date()): Promise<Issue> {
    const pkt = pktParts(now);
    switch (input.type) {
      case 'daily_digest': {
        const c = await this.content.digest(now, 24, { stories: 5, fixturesHours: 24 });
        const minStories = this.num('NEWSLETTER_DIGEST_MIN_STORIES', 3);
        if (c.stories.length < minStories) {
          throw new BadRequestException(`Only ${c.stories.length} stories in the last 24 hours; the digest needs ${minStories}.`);
        }
        return { type: input.type, issueKey: pkt.date, render: (r) => renderDailyDigest(c, r, now), favourites: c };
      }
      case 'weekly_roundup': {
        const c = await this.content.digest(now, 7 * 24, { stories: 7, fixturesHours: 7 * 24 });
        if (c.stories.length < 3) throw new BadRequestException('Fewer than 3 stories this week.');
        const weekLabel = `${fmtDay(new Date(now.getTime() - 6 * 86400_000))} – ${fmtDay(now)}`;
        return {
          type: input.type,
          issueKey: isoWeek(now),
          render: (r) => renderWeeklyRoundup({ ...c, weekLabel }, r, now),
          favourites: c,
        };
      }
      case 'match_preview': {
        if (!input.matchId) throw new BadRequestException('matchId is required for a match preview.');
        const c = await this.content.preview(input.matchId);
        if (!c) throw new NotFoundException(`Match ${input.matchId} was not found or has no start time.`);
        return { type: input.type, issueKey: input.matchId, render: (r) => renderMatchPreview(c, r, now) };
      }
      case 'psl_update': {
        const c = await this.content.psl(now);
        if (!c || !c.standings.length) throw new BadRequestException('No PSL table is available yet.');
        return { type: input.type, issueKey: pkt.date, render: (r) => renderPslUpdate(c, r) };
      }
      case 'breaking_news': {
        if (!input.newsId) throw new BadRequestException('newsId is required for breaking news.');
        const story = await this.content.story(input.newsId);
        if (!story) throw new NotFoundException('That story was not found or is not published.');
        const related = (await this.content.stories(new Date(now.getTime() - 48 * 3600_000), 4)).filter((s) => s.url !== story.url);
        return { type: input.type, issueKey: input.newsId, render: (r) => renderBreakingNews({ story, related }, r, now) };
      }
      case 'reengagement': {
        const [stories, fixtures] = await Promise.all([
          this.content.stories(new Date(now.getTime() - 14 * 86400_000), 5),
          this.content.fixtures(now, new Date(now.getTime() + 7 * 86400_000), 3),
        ]);
        if (!stories.length) throw new BadRequestException('No recent stories to re-engage with.');
        const quietSince = new Date(now.getTime() - this.num('NEWSLETTER_REENGAGE_AFTER_DAYS', 45) * 86400_000);
        return {
          type: input.type,
          // Monthly issue: nobody gets more than one re-engagement email a month.
          issueKey: pkt.date.slice(0, 7),
          render: (r) => renderReengagement({ stories, fixtures }, r, now),
          audience: (s) => s.subscribedAt < quietSince && (!s.lastEngagedAt || s.lastEngagedAt < quietSince),
        };
      }
    }
  }

  /** Per-subscriber links: unsubscribe, preferences, click tracking, favourite teams. */
  private recipient(s: Subscriber, issue: Issue, favouriteTeams?: string[]): Recipient {
    const appUrl = this.content.appUrl;
    const token = s.unsubscribeToken;
    const track = String(this.config.get('NEWSLETTER_TRACK_CLICKS', 'true')).toLowerCase() !== 'false';
    const link = (url: string) =>
      track
        ? `${this.apiUrl}/api/newsletter/click?token=${token}&type=${issue.type}&url=${encodeURIComponent(url)}`
        : url;
    let favourites: Recipient['favourites'];
    if (favouriteTeams?.length && issue.favourites) {
      const mine = (names: string[]) => names.some((n) => favouriteTeams.includes(n));
      favourites = {
        teams: favouriteTeams,
        results: issue.favourites.results.filter((r) => mine(r.teamNames)),
        fixtures: issue.favourites.fixtures.filter((f) => mine(f.teamNames)),
      };
    }
    return {
      appUrl,
      unsubscribeUrl: `${appUrl}/newsletter/unsubscribe?token=${token}`,
      preferencesUrl: `${appUrl}/newsletter/unsubscribe?token=${token}&manage=1`,
      link,
      favourites,
    };
  }

  private headers(s: Subscriber): Record<string, string> {
    const oneClick = `${this.apiUrl}/api/newsletter/unsubscribe/one-click?token=${s.unsubscribeToken}`;
    return {
      'List-Unsubscribe': `<${oneClick}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      'X-PakCricZone-Campaign': 'newsletter',
    };
  }

  /* ─── Preview / test ─── */

  async preview(input: CampaignInput, now = new Date()): Promise<RenderedNewsletter & { issueKey: string }> {
    const issue = await this.build(input, now);
    const sample: Subscriber = {
      id: 'preview',
      email: 'preview@example.com',
      userId: null,
      unsubscribeToken: '00000000-0000-0000-0000-000000000000',
      preferences: {},
      lastEngagedAt: null,
      subscribedAt: now,
    };
    return { ...issue.render(this.recipient(sample, issue)), issueKey: issue.issueKey };
  }

  /** Sends one issue to a single address, marked [TEST]; it is not logged as a real send. */
  async sendTest(input: CampaignInput, to: string, now = new Date()) {
    const issue = await this.build(input, now);
    const existing = await this.prisma.newsletterSubscriber.findUnique({ where: { email: to.toLowerCase() } });
    const sub: Subscriber = existing ?? {
      id: 'test',
      email: to,
      userId: null,
      unsubscribeToken: '00000000-0000-0000-0000-000000000000',
      preferences: {},
      lastEngagedAt: null,
      subscribedAt: now,
    };
    const mail = issue.render(this.recipient(sub, issue));
    await this.mailer.sendMail({ to, subject: `[TEST] ${mail.subject}`, html: mail.html, text: mail.text, headers: this.headers(sub) });
    return { to, subject: `[TEST] ${mail.subject}`, issueKey: issue.issueKey };
  }

  /* ─── Sending ─── */

  /**
   * Sends an issue to every eligible active subscriber. Returns null when the issue has
   * nothing worth sending (e.g. a quiet news day) and the caller is the scheduler.
   */
  async send(input: CampaignInput, now = new Date(), opts: { throwIfEmpty?: boolean } = {}): Promise<CampaignResult | null> {
    let issue: Issue;
    try {
      issue = await this.build(input, now);
    } catch (error) {
      if (opts.throwIfEmpty) throw error;
      this.logger.debug(`Skipping ${input.type}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }

    const subscribers = await this.prisma.newsletterSubscriber.findMany({
      where: { status: 'active' },
      select: { id: true, email: true, userId: true, unsubscribeToken: true, preferences: true, lastEngagedAt: true, subscribedAt: true },
      orderBy: { subscribedAt: 'asc' },
    });
    const already = new Set(
      (
        await this.prisma.newsletterSend.findMany({
          where: { type: issue.type, issueKey: issue.issueKey },
          select: { subscriberId: true },
        })
      ).map((r) => r.subscriberId),
    );
    const eligible = subscribers.filter(
      (s) => !already.has(s.id) && wants(s.preferences, issue.type) && (!issue.audience || issue.audience(s)),
    );

    const dayAgo = new Date(now.getTime() - 24 * 3600_000);
    const perDayCap = this.num('NEWSLETTER_MAX_PER_DAY', 2);
    const recent = await this.prisma.newsletterSend.groupBy({
      by: ['subscriberId'],
      where: { sentAt: { gte: dayAgo }, status: 'sent', subscriberId: { in: eligible.map((s) => s.id) } },
      _count: { _all: true },
    });
    const sentToday = new Map(recent.map((r) => [r.subscriberId, r._count._all]));
    let budget =
      this.num('NEWSLETTER_DAILY_LIMIT', 450) -
      (await this.prisma.newsletterSend.count({ where: { sentAt: { gte: dayAgo }, status: 'sent' } }));
    const delay = this.num('NEWSLETTER_SEND_DELAY_MS', 1500);
    const favourites = issue.favourites
      ? await this.content.favouriteTeams(eligible.flatMap((s) => (s.userId ? [s.userId] : [])))
      : new Map<string, string[]>();

    const result: CampaignResult = { type: issue.type, issueKey: issue.issueKey, subject: '', eligible: eligible.length, sent: 0, skipped: 0, failed: 0 };
    for (const s of eligible) {
      if ((sentToday.get(s.id) ?? 0) >= perDayCap || budget <= 0) {
        result.skipped++;
        continue;
      }
      const mail = issue.render(this.recipient(s, issue, s.userId ? favourites.get(s.userId) : undefined));
      result.subject ||= mail.subject;
      // Claim the (subscriber, type, issue) slot first: a parallel sender loses the race here.
      try {
        await this.prisma.newsletterSend.create({
          data: { subscriberId: s.id, type: issue.type, issueKey: issue.issueKey, subject: mail.subject, status: 'sending' },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          result.skipped++;
          continue;
        }
        throw error;
      }
      try {
        await this.mailer.sendMail({ to: s.email, subject: mail.subject, html: mail.html, text: mail.text, headers: this.headers(s) });
        await this.prisma.$transaction([
          this.prisma.newsletterSend.update({
            where: { subscriberId_type_issueKey: { subscriberId: s.id, type: issue.type, issueKey: issue.issueKey } },
            data: { status: 'sent', sentAt: new Date() },
          }),
          this.prisma.newsletterSubscriber.update({ where: { id: s.id }, data: { lastSentAt: new Date() } }),
        ]);
        result.sent++;
        budget--;
      } catch (error) {
        result.failed++;
        await this.prisma.newsletterSend
          .update({
            where: { subscriberId_type_issueKey: { subscriberId: s.id, type: issue.type, issueKey: issue.issueKey } },
            data: { status: 'failed', error: (error instanceof Error ? error.message : String(error)).slice(0, 1000) },
          })
          .catch(() => null);
        this.logger.warn(`Newsletter ${issue.type} to ${s.email} failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      if (delay) await new Promise((r) => setTimeout(r, delay));
    }
    if (result.eligible) {
      this.logger.log(
        `Newsletter ${issue.type} ${issue.issueKey}: sent ${result.sent}, skipped ${result.skipped}, failed ${result.failed}`,
      );
    }
    return result;
  }

  /* ─── Admin views ─── */

  async overview() {
    const [active, unsubscribed, recent] = await Promise.all([
      this.prisma.newsletterSubscriber.count({ where: { status: 'active' } }),
      this.prisma.newsletterSubscriber.count({ where: { status: 'unsubscribed' } }),
      this.prisma.newsletterSend.groupBy({
        by: ['type', 'issueKey', 'status'],
        _count: { _all: true },
        _max: { sentAt: true, subject: true },
        orderBy: { _max: { sentAt: 'desc' } },
        take: 60,
      }),
    ]);
    const campaigns = new Map<string, { type: string; issueKey: string; subject: string | null; lastSentAt: Date | null; sent: number; failed: number }>();
    for (const row of recent) {
      const key = `${row.type}|${row.issueKey}`;
      const entry = campaigns.get(key) ?? { type: row.type, issueKey: row.issueKey, subject: row._max.subject, lastSentAt: row._max.sentAt, sent: 0, failed: 0 };
      if (row.status === 'sent') entry.sent += row._count._all;
      if (row.status === 'failed') entry.failed += row._count._all;
      campaigns.set(key, entry);
    }
    return {
      autoSend: this.autoSend,
      subscribers: { active, unsubscribed },
      types: NEWSLETTER_TYPES.map((type) => ({ type, ...NEWSLETTER_TYPE_INFO[type], automatic: type !== 'breaking_news' })),
      recentCampaigns: [...campaigns.values()].slice(0, 30),
    };
  }

  /* ─── Subscriber self-service ─── */

  async publicStatus(token: string) {
    const s = await this.prisma.newsletterSubscriber.findUnique({ where: { unsubscribeToken: token } });
    if (!s) throw new NotFoundException('This link is not valid any more.');
    return {
      email: maskEmail(s.email),
      status: s.status,
      preferences: NEWSLETTER_TYPES.map((type) => ({ type, ...NEWSLETTER_TYPE_INFO[type], enabled: wants(s.preferences, type) })),
    };
  }

  async updatePreferences(token: string, preferences: Record<string, boolean>) {
    const s = await this.prisma.newsletterSubscriber.findUnique({ where: { unsubscribeToken: token } });
    if (!s) throw new NotFoundException('This link is not valid any more.');
    const next: Record<string, boolean> = {};
    for (const type of NEWSLETTER_TYPES) {
      const value = preferences[type];
      next[type] = typeof value === 'boolean' ? value : wants(s.preferences, type);
    }
    const anyOn = Object.values(next).some(Boolean);
    await this.prisma.newsletterSubscriber.update({
      where: { id: s.id },
      data: {
        preferences: next,
        // Turning everything off is an unsubscribe; turning something back on resubscribes.
        ...(anyOn
          ? s.status !== 'active'
            ? { status: 'active', unsubscribedAt: null, subscribedAt: new Date() }
            : {}
          : { status: 'unsubscribed', unsubscribedAt: new Date() }),
      },
    });
    return this.publicStatus(token);
  }

  async resubscribe(token: string) {
    const updated = await this.prisma.newsletterSubscriber.updateMany({
      where: { unsubscribeToken: token, status: 'unsubscribed' },
      data: { status: 'active', unsubscribedAt: null, subscribedAt: new Date() },
    });
    if (!updated.count) {
      const exists = await this.prisma.newsletterSubscriber.count({ where: { unsubscribeToken: token } });
      if (!exists) throw new NotFoundException('This link is not valid any more.');
    }
    return { message: 'Welcome back! You are subscribed again.' };
  }

  /** Records a click and returns where to send the reader; only this site's own URLs. */
  async click(token: string | undefined, url: string | undefined): Promise<string> {
    const appUrl = this.content.appUrl;
    let target = appUrl;
    if (url) {
      try {
        const parsed = new URL(url);
        if (parsed.origin === new URL(appUrl).origin) target = parsed.toString();
      } catch {
        // Fall back to the home page for anything that is not a URL.
      }
    }
    if (token && /^[0-9a-f-]{36}$/i.test(token)) {
      await this.prisma.newsletterSubscriber
        .updateMany({ where: { unsubscribeToken: token }, data: { lastEngagedAt: new Date() } })
        .catch(() => null);
    }
    return target;
  }
}

/* ─── Helpers ─── */

/** Missing keys mean "on": new types reach existing subscribers unless they opt out. */
export function wants(preferences: Prisma.JsonValue, type: NewsletterType): boolean {
  if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) return true;
  return (preferences as Record<string, unknown>)[type] !== false;
}

export function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!domain) return email;
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${'•'.repeat(Math.max(1, name.length - visible.length))}@${domain}`;
}

export function pktParts(date: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
      weekday: 'short',
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    weekday: parts.weekday as string,
  };
}

function fmtDay(date: Date): string {
  return date.toLocaleDateString('en-GB', { timeZone: TZ, day: 'numeric', month: 'short' });
}

/** ISO week in PKT, e.g. "2026-W43". */
export function isoWeek(date: Date): string {
  const { date: ymd } = pktParts(date);
  const d = new Date(`${ymd}T00:00:00Z`);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
