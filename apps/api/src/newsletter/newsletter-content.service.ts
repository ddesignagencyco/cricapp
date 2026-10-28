import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  DigestContent,
  FixtureRow,
  LeaderRow,
  PreviewContent,
  PslContent,
  ResultRow,
  StandingRow,
  Story,
} from './newsletter-templates.js';

type MatchRow = {
  match_id: string;
  team_names: unknown;
  team_scores: unknown;
  tournament: string | null;
  scheduled: string | null;
  venue: string | null;
  result_text: string | null;
  winner_id: string | null;
};

type ScoreSide = { id?: string; name?: string; score?: string; overs?: string };

/** A fixture or result with the team names kept, so favourite-team filtering can use them. */
export type Tagged<T> = T & { teamNames: string[] };

const PSL_PATTERN = '%pakistan super league%';
/** Tournaments worth a newsletter slot besides Pakistan and the PSL. */
const NOTABLE = /icc|world cup|asia cup|champions trophy|\btour\b|test|odi|t20i|premier league|big bash|the hundred|super smash|caribbean|sa20|ilt20|major league/i;

/** Qualifiers and associate events: real cricket, but not newsletter material. */
const MINOR = /qualifier|sub regional|challenge league|regional final|t10|ecs |european cricket/i;

/**
 * Reads the stories, results, fixtures and tables newsletters are built from.
 * Every fact in a newsletter comes from here — templates never invent content.
 */
@Injectable()
export class NewsletterContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  get appUrl(): string {
    return this.config.get<string>('APP_URL', 'http://localhost:3000').replace(/\/$/, '');
  }

  /* ─── News ─── */

  async stories(since: Date, limit: number, opts: { categorySlug?: string } = {}): Promise<Story[]> {
    const rows = await this.prisma.newsArticle.findMany({
      where: {
        isPublished: true,
        language: 'en',
        publishedAt: { gte: since, lte: new Date() },
        ...(opts.categorySlug ? { category: { slug: opts.categorySlug } } : {}),
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: { title: true, slug: true, id: true, summary: true, publishedAt: true, category: { select: { name: true } } },
    });
    return rows.map((r) => ({
      title: cleanTitle(r.title),
      url: `${this.appUrl}${r.slug ? `/cricket-news/${r.slug}` : `/news/${r.id}`}`,
      category: r.category?.name ?? null,
      summary: r.summary ? stripHtml(r.summary).slice(0, 220) : null,
      publishedAt: r.publishedAt,
    }));
  }

  async story(newsId: string): Promise<Story | null> {
    const r = await this.prisma.newsArticle.findFirst({
      where: { OR: [{ id: newsId }, { slug: newsId }], isPublished: true },
      select: { title: true, slug: true, id: true, summary: true, publishedAt: true, category: { select: { name: true } } },
    });
    if (!r) return null;
    return {
      title: cleanTitle(r.title),
      url: `${this.appUrl}${r.slug ? `/cricket-news/${r.slug}` : `/news/${r.id}`}`,
      category: r.category?.name ?? null,
      summary: r.summary ? stripHtml(r.summary).slice(0, 300) : null,
      publishedAt: r.publishedAt,
    };
  }

  /* ─── Matches ─── */

  /** Completed Pakistan, PSL and major matches in the window, Pakistan first. */
  async results(since: Date, until: Date, limit: number): Promise<Tagged<ResultRow>[]> {
    const rows = await this.prisma.$queryRawUnsafe<MatchRow[]>(
      `SELECT match_id, team_names, team_scores, tournament, scheduled, venue, result_text, winner_id
         FROM matches
        WHERE status = 'completed' AND scheduled >= $1 AND scheduled < $2
        ORDER BY scheduled DESC LIMIT 300`,
      since.toISOString(),
      until.toISOString(),
    );
    return rankMatches(rows).slice(0, limit).map((r) => this.toResult(r));
  }

  /** Upcoming Pakistan, PSL and major fixtures in the window, soonest first within each priority. */
  async fixtures(since: Date, until: Date, limit: number): Promise<Tagged<FixtureRow>[]> {
    const rows = await this.prisma.$queryRawUnsafe<MatchRow[]>(
      `SELECT match_id, team_names, team_scores, tournament, scheduled, venue, result_text, winner_id
         FROM matches
        WHERE status = 'upcoming' AND scheduled >= $1 AND scheduled < $2
        ORDER BY scheduled ASC LIMIT 300`,
      since.toISOString(),
      until.toISOString(),
    );
    return rankMatches(rows)
      .slice(0, limit)
      .sort((a, b) => String(a.scheduled).localeCompare(String(b.scheduled)))
      .map((r) => this.toFixture(r));
  }

  /** Pakistan and PSL matches that start inside the window: the match-preview candidates. */
  async previewCandidates(since: Date, until: Date): Promise<string[]> {
    const rows = await this.prisma.$queryRawUnsafe<{ match_id: string }[]>(
      `SELECT match_id FROM matches
        WHERE status = 'upcoming' AND scheduled >= $1 AND scheduled < $2
          AND (team_names::text ILIKE '%pakistan%' OR tournament ILIKE $3)
        ORDER BY scheduled ASC`,
      since.toISOString(),
      until.toISOString(),
      PSL_PATTERN,
    );
    return rows.map((r) => r.match_id);
  }

  async preview(matchId: string): Promise<PreviewContent | null> {
    const [row] = await this.prisma.$queryRawUnsafe<MatchRow[]>(
      `SELECT match_id, team_names, team_scores, tournament, scheduled, venue, result_text, winner_id
         FROM matches WHERE match_id = $1`,
      matchId,
    );
    if (!row?.scheduled) return null;
    const fixture = this.toFixture(row);
    const [home, away] = fixture.teamNames;

    const run = await this.prisma.predictionRun.findFirst({
      where: { matchId, stage: 'pre_match', result: { isNot: null } },
      orderBy: { createdAt: 'desc' },
      select: { result: { select: { homeWinProb: true, awayWinProb: true, confidence: true } } },
    });

    const h2hRows =
      home && away
        ? await this.prisma.$queryRawUnsafe<MatchRow[]>(
            `SELECT match_id, team_names, team_scores, tournament, scheduled, venue, result_text, winner_id
               FROM matches
              WHERE status = 'completed' AND team_names::jsonb @> $1::jsonb
              ORDER BY scheduled DESC LIMIT 3`,
            JSON.stringify([home, away]),
          )
        : [];

    const stories = await this.prisma.newsArticle.findMany({
      where: { isPublished: true, language: 'en', linkedMatches: { some: { matchId } } },
      orderBy: { publishedAt: 'desc' },
      take: 3,
      select: { title: true, slug: true, id: true, publishedAt: true, category: { select: { name: true } } },
    }).catch(() => []);

    return {
      fixture,
      prediction: run?.result
        ? { homePct: run.result.homeWinProb, awayPct: run.result.awayWinProb, confidence: run.result.confidence }
        : null,
      headToHead: h2hRows.map((r) => this.toResult(r)),
      stories: stories.map((s) => ({
        title: cleanTitle(s.title),
        url: `${this.appUrl}${s.slug ? `/cricket-news/${s.slug}` : `/news/${s.id}`}`,
        category: s.category?.name ?? null,
        publishedAt: s.publishedAt,
      })),
    };
  }

  /* ─── Digests ─── */

  async digest(now: Date, windowHours: number, opts: { stories: number; fixturesHours: number }): Promise<DigestContent & { results: Tagged<ResultRow>[]; fixtures: Tagged<FixtureRow>[] }> {
    const since = new Date(now.getTime() - windowHours * 3600_000);
    const [stories, pakistanStories, results, fixtures] = await Promise.all([
      this.stories(since, opts.stories),
      this.stories(since, 6, { categorySlug: 'pakistan-cricket' }),
      this.results(since, now, 8),
      this.fixtures(now, new Date(now.getTime() + opts.fixturesHours * 3600_000), 6),
    ]);
    const shown = new Set(stories.map((s) => s.url));
    return {
      date: now,
      stories,
      pakistanStories: pakistanStories.filter((s) => !shown.has(s.url)).slice(0, 3),
      results,
      fixtures,
    };
  }

  /* ─── PSL ─── */

  /** Whether the PSL is in season: a PSL match within three days either side of now. */
  async pslActive(now: Date): Promise<boolean> {
    const [row] = await this.prisma.$queryRawUnsafe<{ n: number }[]>(
      `SELECT count(*)::int AS n FROM matches
        WHERE tournament ILIKE $1 AND scheduled >= $2 AND scheduled < $3`,
      PSL_PATTERN,
      new Date(now.getTime() - 3 * 86400_000).toISOString(),
      new Date(now.getTime() + 3 * 86400_000).toISOString(),
    );
    return (row?.n ?? 0) > 0;
  }

  async psl(now: Date): Promise<PslContent | null> {
    const latest = await this.prisma.pslStanding.findFirst({ orderBy: { updatedAt: 'desc' }, select: { seasonId: true } });
    if (!latest) return null;
    const seasonId = latest.seasonId;
    const [standings, runs, wickets, label, results, fixtures] = await Promise.all([
      this.prisma.pslStanding.findMany({ where: { seasonId }, orderBy: { rank: 'asc' } }),
      this.prisma.pslLeader.findMany({ where: { seasonId, category: 'batting', stat: 'top_runs' }, orderBy: { rank: 'asc' }, take: 3 }),
      this.prisma.pslLeader.findMany({ where: { seasonId, category: 'bowling', stat: 'top_wickets' }, orderBy: { rank: 'asc' }, take: 3 }),
      this.prisma.$queryRawUnsafe<{ tournament: string }[]>(
        `SELECT tournament FROM matches WHERE tournament ILIKE $1 ORDER BY scheduled DESC LIMIT 1`,
        PSL_PATTERN,
      ),
      this.pslMatches('completed', new Date(now.getTime() - 4 * 86400_000), now),
      this.pslMatches('upcoming', now, new Date(now.getTime() + 5 * 86400_000)),
    ]);
    const leader = (l: { rank: number; playerName: string; teamAbbr: string | null; teamName: string | null; value: number }): LeaderRow => ({
      rank: l.rank,
      player: displayName(l.playerName),
      team: l.teamName ?? l.teamAbbr,
      value: Math.round(l.value),
    });
    return {
      seasonLabel: label[0]?.tournament ?? 'Pakistan Super League',
      standings: standings.map(
        (s): StandingRow => ({ rank: s.rank, team: s.teamName, played: s.played, won: s.won, lost: s.lost, nrr: s.netRunRate, points: s.points }),
      ),
      topRuns: runs.map(leader),
      topWickets: wickets.map(leader),
      results,
      fixtures,
    };
  }

  private async pslMatches(status: 'completed', since: Date, until: Date): Promise<ResultRow[]>;
  private async pslMatches(status: 'upcoming', since: Date, until: Date): Promise<FixtureRow[]>;
  private async pslMatches(status: 'completed' | 'upcoming', since: Date, until: Date): Promise<ResultRow[] | FixtureRow[]> {
    const rows = await this.prisma.$queryRawUnsafe<MatchRow[]>(
      `SELECT match_id, team_names, team_scores, tournament, scheduled, venue, result_text, winner_id
         FROM matches
        WHERE status = $1 AND tournament ILIKE $2 AND scheduled >= $3 AND scheduled < $4
        ORDER BY scheduled ${status === 'completed' ? 'DESC' : 'ASC'} LIMIT 4`,
      status,
      PSL_PATTERN,
      since.toISOString(),
      until.toISOString(),
    );
    return status === 'completed' ? rows.map((r) => this.toResult(r)) : rows.map((r) => this.toFixture(r));
  }

  /* ─── Favourites ─── */

  /** Team names each linked user has favourited, keyed by user id. */
  async favouriteTeams(userIds: string[]): Promise<Map<string, string[]>> {
    const out = new Map<string, string[]>();
    if (!userIds.length) return out;
    const favs = await this.prisma.favorite.findMany({
      where: { userId: { in: userIds }, targetType: 'team' },
      select: { userId: true, targetId: true },
    });
    if (!favs.length) return out;
    const ids = [...new Set(favs.map((f) => f.targetId))];
    const teams = await this.prisma.team.findMany({
      where: { OR: [{ id: { in: ids } }, { abbr: { in: ids } }] },
      select: { id: true, abbr: true, name: true },
    });
    const nameOf = new Map<string, string>();
    for (const t of teams) {
      nameOf.set(t.id, t.name);
      if (t.abbr) nameOf.set(t.abbr, t.name);
    }
    for (const f of favs) {
      const name = nameOf.get(f.targetId);
      if (!name) continue;
      const list = out.get(f.userId) ?? [];
      if (!list.includes(name)) list.push(name);
      out.set(f.userId, list);
    }
    return out;
  }

  /* ─── Mapping ─── */

  private toResult(r: MatchRow): Tagged<ResultRow> {
    const names = asNames(r.team_names);
    const scores = (r.team_scores ?? {}) as { home?: ScoreSide; away?: ScoreSide };
    const side = (s: ScoreSide | undefined, fallback: string) => ({
      name: s?.name || fallback,
      score: s?.score ? `${s.score}${s.overs ? ` (${s.overs})` : ''}` : null,
    });
    const winner =
      r.winner_id && scores.home?.id === r.winner_id ? 'home' : r.winner_id && scores.away?.id === r.winner_id ? 'away' : null;
    return {
      tournament: r.tournament,
      home: side(scores.home, names[0] ?? 'TBC'),
      away: side(scores.away, names[1] ?? 'TBC'),
      result: r.result_text,
      winner,
      url: `${this.appUrl}/matches/${encodeURIComponent(r.match_id)}`,
      teamNames: names,
    };
  }

  private toFixture(r: MatchRow): Tagged<FixtureRow> {
    const names = asNames(r.team_names);
    return {
      tournament: r.tournament,
      home: names[0] ?? 'TBC',
      away: names[1] ?? 'TBC',
      startsAt: new Date(r.scheduled ?? Date.now()),
      venue: r.venue,
      url: `${this.appUrl}/matches/${encodeURIComponent(r.match_id)}`,
      teamNames: names,
    };
  }
}

function asNames(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function priority(r: MatchRow): number {
  const names = asNames(r.team_names).join(' ');
  const tournament = r.tournament ?? '';
  if (/pakistan/i.test(names) || /pakistan super league/i.test(tournament)) return 0;
  if (MINOR.test(tournament)) return 2;
  if (NOTABLE.test(tournament)) return 1;
  return 2;
}

/** Pakistan and PSL first, then major cricket; minor leagues are left out. */
function rankMatches(rows: MatchRow[]): MatchRow[] {
  return rows
    .map((r) => ({ r, p: priority(r) }))
    .filter((x) => x.p < 2)
    .sort((a, b) => a.p - b.p)
    .map((x) => x.r);
}

/** Sportradar writes "Khan, Yasir"; readers expect "Yasir Khan". */
function displayName(name: string): string {
  const [last, first] = name.split(',').map((p) => p.trim());
  return first ? `${first} ${last}` : name;
}

/** RSS titles end in " - Cricbuzz" / " - ICC"; the source is noise in a headline list. */
function cleanTitle(title: string): string {
  return title.replace(/\s+[-–|]\s+(icc|cricbuzz|espncricinfo|sky sports|dunya news|geo (?:news|super)|dawn|the express tribune|bbc sport|pcb)\s*$/i, '').trim();
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
}
