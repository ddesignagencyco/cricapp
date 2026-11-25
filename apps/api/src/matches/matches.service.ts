import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { SportradarService } from '../sportradar/sportradar.service.js';
import {
  MATCH_STATUS,
  redisKeys,
  timelineRevision,
  timelineEventsSince,
  reconcileTimelineStatus,
  type CanonicalMatch,
  type CurrentInnings,
  type LastEvent,
  type TeamScores,
} from '@cricapp/shared-types';
import type { Match } from '../generated/prisma/client.js';
import {
  createPaginatedResponse,
  getPaginationOffset,
} from '../common/pagination/pagination.util.js';

import {
  resultTextFromPayload,
  teamScoresFromSportEventPayload,
} from './match-summary-enrich.util.js';
import { sportEventStatusFromPayload } from '../common/sport-event-status.util.js';
import { isLiveTimelineBehindMatch } from './timeline-stale.util.js';
import { dedupeTimelineEvents } from './timeline-events.util.js';
import { incrCounter, type StaleNotRefreshedReason } from '../common/metrics.util.js';

export type MatchSummary = Pick<
  CanonicalMatch,
  | 'matchId'
  | 'status'
  | 'teams'
  | 'teamNames'
  | 'teamScores'
  | 'tournament'
  | 'tournamentId'
  | 'venue'
  | 'scheduled'
  | 'currentInnings'
  | 'lastEvent'
  | 'displayScore'
  | 'matchStatus'
  | 'result'
  | 'winnerId'
  | 'tossWonBy'
  | 'tossDecision'
  | 'currentInning'
  | 'periodScores'
  | 'displayOvers'
  | 'revision'
  | 'updatedAt'
>;

/**
 * The one order the matches list is ever served in.
 *
 * `scheduled ASC` on its own opened the page on the oldest fixtures in the table — a
 * reader arriving at `/matches` was shown matches from two years ago, because a finished
 * match from 2023 sorts before anything scheduled for today. Flipping to `DESC` trades
 * one wrong order for another: the default view would open on results nobody came for.
 *
 * So the order is by how much a reader wants the row:
 *
 *   1. live now        — nothing else is more relevant
 *   2. upcoming        — soonest first, which is what a fixture list is for
 *   3. everything else — newest first, so the most recent result is at the top
 *
 * Two details that are load-bearing rather than cosmetic:
 *
 * - `match_id ASC` last. Without a total tiebreak two rows with the same status and the
 *   same `scheduled` have no defined order, and an unstable order makes `LIMIT`/`OFFSET`
 *   paging repeat a row on one page and skip it on the next.
 * - `NULLS LAST` on every `scheduled` key. A fixture with no start time is still a fixture
 *   a reader wants to see; it just cannot be placed in time. Postgres already defaults to
 *   `NULLS LAST` for `ASC` but to `NULLS FIRST` for `DESC`, so the `DESC` key states it.
 *
 * Prisma's `orderBy` cannot express a `CASE`, so the list and the search both run through
 * this rather than each writing their own.
 *
 * ## Why fixtures are soonest-first but results are newest-first
 *
 * They are opposite on purpose. A result list is read by recency, so the newest result
 * belongs at the top. A fixture list is read by urgency, and the next match is the one
 * with the *smallest* future date, so ascending is the order that puts it first.
 *
 * ## The overdue bucket
 *
 * Ascending fixtures has one failure mode: a row still marked `upcoming` whose start time
 * has already gone. Nothing re-polls those — measured, 19 of 46 rows in one database were
 * `upcoming` with a start time up to two months past — and sorted ascending they take the
 * top of the list, so the page opened on matches from August while the fixtures a reader
 * could actually attend sat below them.
 *
 * The bucket is `upcoming` only. A live match has *always* got a start time in the past,
 * so including `live` here would push every in-play match below the future fixtures and
 * invert the one rule that matters most.
 *
 * The real fix is ingestion re-checking those rows. Until it does, they are sorted below
 * the genuine fixtures rather than above them, which is what a reader would expect, and
 * the `status` on the row keeps saying what it says rather than being quietly rewritten
 * here to hide the problem.
 *
 * ## Why `now` is passed in rather than read from the database
 *
 * `scheduled` is `TEXT`. Every value ingestion writes is ISO 8601, but "ISO 8601" covers
 * two different suffixes — `2026-10-05T14:00:00+00:00` and `2026-10-05T14:00:00Z` are the
 * same instant written two ways, and comparing them as text gives an arbitrary answer at
 * the one second where the two forms differ.
 *
 * So the comparison truncates to `left(scheduled, 19)` — the `YYYY-MM-DDTHH:MM:SS` part,
 * which is byte-identical in both forms — on both sides. `now` is then formatted to the
 * same shape and passed as a bound parameter, which keeps the whole clause free of casts:
 * casting the column would throw on any value the provider ever writes in another shape,
 * taking the entire list down over one bad row.
 *
 * This is only safe because no stored offset is non-UTC. If one ever is, `left(..., 19)`
 * compares it as if it were UTC and the row lands in the wrong bucket. The durable fix is a
 * real `timestamptz` column; that is a migration and out of scope here, and it is written
 * up in the handoff rather than done quietly.
 */
function matchListOrder(now: string): Prisma.Sql {
  return Prisma.sql`
    ORDER BY
      CASE status
        WHEN 'live' THEN 0
        WHEN 'upcoming' THEN 1
        ELSE 2
      END ASC,
      CASE
        WHEN status = 'upcoming'
          AND scheduled IS NOT NULL
          AND left(scheduled, 19) < left(${now}, 19)
        THEN 1
        ELSE 0
      END ASC,
      CASE WHEN status IN ('live', 'upcoming') THEN scheduled END ASC NULLS LAST,
      scheduled DESC NULLS LAST,
      match_id ASC
  `;
}

/** The current time in the exact shape `matches.scheduled` is stored in. */
function scheduledNow(): string {
  return `${new Date().toISOString().slice(0, 19)}+00:00`;
}

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly sportradar: SportradarService,
  ) {}

  private asStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.map(String) : [];
  }

  private buildTeamsField(row: Match, scoresOverride?: TeamScores | null): CanonicalMatch['teams'] {
    const abbrs = this.asStringArray(row.teams);
    const names = this.asStringArray(row.teamNames);
    const scores = scoresOverride ?? (row.teamScores as TeamScores | null);
    if (!scores?.home && !scores?.away) {
      return abbrs;
    }
    return {
      home: {
        id: scores?.home?.id || '',
        code: scores?.home?.code || abbrs[0] || '',
        name: scores?.home?.name || names[0] || '',
        score: scores?.home?.score || '',
        overs: scores?.home?.overs || '',
        oversBalls: scores?.home?.oversBalls ?? null,
      },
      away: {
        id: scores?.away?.id || '',
        code: scores?.away?.code || abbrs[1] || '',
        name: scores?.away?.name || names[1] || '',
        score: scores?.away?.score || '',
        overs: scores?.away?.overs || '',
        oversBalls: scores?.away?.oversBalls ?? null,
      },
    };
  }

  /** Revision + updatedAt for one match, derived from the stored timeline row. */
  private async revisionMeta(matchId: string): Promise<{ revision: number | null; updatedAt: string | null }> {
    const row = await this.prisma.matchTimeline.findUnique({ where: { matchId } });
    if (!row) return { revision: null, updatedAt: null };
    let revision: number | null = null;
    try {
      revision = timelineRevision(row.payload as Record<string, unknown>);
    } catch {
      revision = null;
    }
    return { revision, updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null };
  }

  private async revisionMetaFor(matchIds: string[]): Promise<Map<string, { revision: number | null; updatedAt: string | null }>> {
    if (matchIds.length === 0) return new Map();
    const rows = await this.prisma.matchTimeline.findMany({
      where: { matchId: { in: matchIds } },
      select: { matchId: true, payload: true, updatedAt: true },
    });
    const map = new Map();
    for (const r of rows) {
      let revision: number | null = null;
      try {
        revision = timelineRevision(r.payload as Record<string, unknown>);
      } catch {
        revision = null;
      }
      map.set(r.matchId, { revision, updatedAt: r.updatedAt ? r.updatedAt.toISOString() : null });
    }
    return map;
  }

  private toSummary(row: Match, overrides?: Partial<MatchSummary>): MatchSummary {
    return {
      matchId: row.matchId,
      status: row.status as CanonicalMatch['status'],
      teams: overrides?.teams ?? this.buildTeamsField(row),
      teamNames: this.asStringArray(row.teamNames),
      teamScores: overrides?.teamScores ?? (row.teamScores as TeamScores | null) ?? null,
      tournament: row.tournament,
      tournamentId: overrides?.tournamentId ?? row.tournamentId ?? null,
      venue: row.venue,
      scheduled: row.scheduled,
      currentInnings: row.currentInnings as unknown as CurrentInnings | null,
      lastEvent: row.lastEvent as unknown as LastEvent,
      displayScore: row.displayScore,
      matchStatus: row.matchStatus,
      result: overrides?.result ?? row.resultText ?? null,
      winnerId: overrides?.winnerId ?? row.winnerId ?? null,
      tossWonBy: overrides?.tossWonBy ?? row.tossWonBy ?? null,
      tossDecision: overrides?.tossDecision ?? row.tossDecision ?? null,
      currentInning: overrides?.currentInning ?? row.currentInning ?? null,
      periodScores: (overrides?.periodScores ?? row.periodScores) as unknown[] | null,
      displayOvers: overrides?.displayOvers ?? row.displayOvers ?? null,
      revision: overrides?.revision ?? null,
      updatedAt: overrides?.updatedAt ?? null,
    };
  }

  /** Redis live snapshots for a page of matches, keyed by match id. */
  private async cachedStates(matchIds: string[]): Promise<Map<string, CanonicalMatch>> {
    const map = new Map<string, CanonicalMatch>();
    if (matchIds.length === 0) return map;
    const raws = await this.redis.cached.mget(...matchIds.map((id) => redisKeys.matchState(id)));
    raws.forEach((raw, i) => {
      if (!raw) return;
      try {
        map.set(matchIds[i], JSON.parse(raw) as CanonicalMatch);
      } catch {
        // A malformed snapshot is ignored; the DB summary is still served.
      }
    });
    return map;
  }

  private oversToBalls(overs: number | null | undefined): number | null {
    if (overs == null || !Number.isFinite(overs) || overs < 0) return null;
    const whole = Math.floor(overs);
    const balls = Math.round((overs - whole) * 10);
    return whole * 6 + Math.min(balls, 5);
  }

  private parseRunsFromScore(displayScore: string | null | undefined, currentInnings?: CurrentInnings | null): number | null {
    if (currentInnings?.runs != null && Number.isFinite(currentInnings.runs)) {
      return currentInnings.runs;
    }
    const m = String(displayScore ?? '').match(/(\d+)\s*\/\s*\d+\s*$/);
    return m ? Number(m[1]) : null;
  }

  /**
   * Compare two live snapshots by (currentInning, oversToBalls, runs).
   * Returns > 0 if `candidate` is strictly ahead of `baseline`, < 0 if behind, 0 if tied/incomparable.
   */
  private compareLiveProgress(
    baseline: { currentInning?: number | null; displayOvers?: number | null; displayScore?: string | null; currentInnings?: CurrentInnings | null },
    candidate: { currentInning?: number | null; displayOvers?: number | null; displayScore?: string | null; currentInnings?: CurrentInnings | null },
  ): number {
    const baseInning = baseline.currentInning ?? null;
    const candInning = candidate.currentInning ?? null;
    if (baseInning != null && candInning != null && candInning !== baseInning) {
      return candInning > baseInning ? 1 : -1;
    }
    const baseBalls = this.oversToBalls(baseline.displayOvers);
    const candBalls = this.oversToBalls(candidate.displayOvers);
    if (candBalls != null && baseBalls == null) return 1;
    if (candBalls == null && baseBalls != null) return -1;
    if (candBalls != null && baseBalls != null && candBalls !== baseBalls) {
      return candBalls > baseBalls ? 1 : -1;
    }
    const baseRuns = this.parseRunsFromScore(baseline.displayScore, baseline.currentInnings);
    const candRuns = this.parseRunsFromScore(candidate.displayScore, candidate.currentInnings);
    if (candRuns != null && baseRuns != null && candRuns !== baseRuns) {
      return candRuns > baseRuns ? 1 : -1;
    }
    return 0;
  }

  /**
   * A row summary overlaid with its Redis live snapshot, preferring whichever source is
   * further ahead by (currentInning, overs, runs) so a card can never go backwards.
   *
   * The ingestion worker writes the match row and the Redis snapshot from the same poll.
   * The detail endpoint has always read the snapshot; the list endpoints did not, which is
   * how a card could sit at 194/5 (row) while the match page showed 284/8 (snapshot).
   */
  private overlayCached(
    summary: MatchSummary,
    row: Match,
    cached: CanonicalMatch | null | undefined,
  ): MatchSummary {
    if (!cached) return summary;
    // Never let a stale live snapshot override a completed/cancelled DB row.
    if (
      (summary.status === MATCH_STATUS.COMPLETED || String(summary.status) === MATCH_STATUS.CANCELLED) &&
      cached.status === MATCH_STATUS.LIVE
    ) {
      return summary;
    }
    // (Inning, overs, runs) decide freshness; on a tie the later write wins.
    const progress = this.compareLiveProgress(summary, cached);
    const cachedAt = cached.updatedAt ? Date.parse(cached.updatedAt) : Number.NaN;
    const preferCached =
      progress > 0 ||
      (progress === 0 &&
        cached.displayOvers != null &&
        Number.isFinite(cachedAt) &&
        cachedAt > row.updatedAt.getTime());
    const pick = <T>(
      fromRow: T | null | undefined,
      fromCached: T | null | undefined,
    ): T | null =>
      preferCached ? (fromCached ?? fromRow ?? null) : (fromRow ?? fromCached ?? null);
    const teamScores = pick(summary.teamScores, cached.teamScores) as TeamScores | null;
    return {
      ...summary,
      displayScore: pick(summary.displayScore, cached.displayScore),
      displayOvers: pick(summary.displayOvers, cached.displayOvers),
      currentInnings: pick(summary.currentInnings, cached.currentInnings),
      currentInning: pick(summary.currentInning, cached.currentInning),
      lastEvent: pick(summary.lastEvent, cached.lastEvent) ?? summary.lastEvent,
      matchStatus: pick(summary.matchStatus, cached.matchStatus),
      winnerId: pick(summary.winnerId, cached.winnerId),
      tossWonBy: pick(summary.tossWonBy, cached.tossWonBy),
      tossDecision: pick(summary.tossDecision, cached.tossDecision),
      periodScores: pick(summary.periodScores, cached.periodScores),
      teamScores,
      teams: teamScores ? this.buildTeamsField(row, teamScores) : summary.teams,
      revision: summary.revision ?? cached.revision ?? null,
      updatedAt: summary.updatedAt ?? cached.updatedAt ?? null,
    };
  }

  private async enrichFromStoredSummary(row: Match): Promise<Partial<MatchSummary>> {
    const needsScores = !row.teamScores;
    const needsResult = !row.resultText;
    const needsStatus = !row.winnerId && !row.tossWonBy;
    if (!needsScores && !needsResult && !needsStatus) return {};

    const record = await this.prisma.sportEventRecord.findFirst({
      where: {
        eventId: row.matchId,
        kind: { in: ['match_summary', 'daily_results', 'team_results', 'daily_schedule'] },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });
    const payload = record?.payload as Record<string, unknown> | undefined;
    if (!payload) return {};

    const statusView = sportEventStatusFromPayload(payload);
    return {
      ...(needsScores
        ? { teamScores: teamScoresFromSportEventPayload(payload) ?? undefined }
        : {}),
      ...(needsResult ? { result: resultTextFromPayload(payload) ?? undefined } : {}),
      ...(statusView
        ? {
            winnerId: statusView.winnerId ?? undefined,
            tossWonBy: statusView.tossWonBy ?? undefined,
            tossDecision: statusView.tossDecision ?? undefined,
            currentInning: statusView.currentInning ?? undefined,
            periodScores: statusView.periodScores ?? undefined,
            displayOvers: statusView.displayOvers ?? undefined,
            displayScore: statusView.displayScore ?? undefined,
          }
        : {}),
    };
  }

  async list(params: {
    q?: string;
    status?: string;
    tournament?: string;
    tournamentId?: string;
    page?: number;
    limit?: number;
    offset?: number;
  }) {
    const { page, limit, skip } = getPaginationOffset(params.page, params.limit, params.offset);

    if (params.q?.trim()) {
      return this.search(params);
    }

    const statusClause = params.status
      ? Prisma.sql`AND status = ${params.status}`
      : Prisma.empty;
    const tournamentClause = params.tournament
      ? Prisma.sql`AND tournament ILIKE ${`%${params.tournament}%`}`
      : Prisma.empty;
    // The exact filter the name-based one could never be. `tournament ILIKE %name%`
    // matches on a substring, so "Global T20" also returned "Global T20 Canada 2024" and
    // a series page could list another competition's fixtures. `tournament_id` is a column
    // and cannot match more than one competition.
    const tournamentIdClause = params.tournamentId
      ? Prisma.sql`AND tournament_id = ${params.tournamentId}`
      : Prisma.empty;

    // Only the *order* needs raw SQL, so only the order comes from raw SQL.
    //
    // Prisma's `orderBy` cannot express a `CASE`, so the ordering has to be written by
    // hand. There is no need for the rows themselves to come from it too: this query
    // returns one column with a name we chose, and Prisma then reads the page by id and
    // keeps its own field mapping. A `SELECT *` raw query would hand back whatever the
    // driver called each column and leave `toSummary` reading `undefined` off a row that
    // is actually fine — a failure that looks like missing data rather than like a bug.
    const [idRows, countRows] = await Promise.all([
      this.prisma.$queryRaw<Array<{ match_id: string }>>(
        Prisma.sql`
          SELECT match_id
          FROM matches
          WHERE TRUE
          ${statusClause}
          ${tournamentClause}
          ${tournamentIdClause}
          ${matchListOrder(scheduledNow())}
          LIMIT ${limit} OFFSET ${skip}
        `,
      ),
      this.prisma.$queryRaw<Array<{ count: bigint }>>(
        Prisma.sql`
          SELECT COUNT(*)::bigint AS count
          FROM matches
          WHERE TRUE
          ${statusClause}
          ${tournamentClause}
          ${tournamentIdClause}
        `,
      ),
    ]);

    const order = idRows.map((r) => r.match_id);
    const rows = order.length
      ? await this.prisma.match.findMany({ where: { matchId: { in: order } } })
      : [];
    // `findMany` has no idea what the order was, so it is reapplied here.
    const byId = new Map(rows.map((r) => [r.matchId, r]));
    const ordered = order
      .map((id) => byId.get(id))
      .filter((r): r is Match => r !== undefined);

    const caches = await this.cachedStates(ordered.map((r) => r.matchId));
    const total = Number(countRows[0]?.count ?? 0);
    return createPaginatedResponse(
      ordered.map((r) => this.overlayCached(this.toSummary(r), r, caches.get(r.matchId))),
      total,
      page,
      limit,
    );
  }

  async search(params: {
    q?: string;
    status?: string;
    page?: number;
    limit?: number;
    offset?: number;
  }) {
    const { page, limit, skip } = getPaginationOffset(params.page, params.limit, params.offset);
    const pattern = `%${params.q?.trim() ?? ''}%`;

    const statusClause = params.status
      ? Prisma.sql`AND status = ${params.status}`
      : Prisma.empty;

    const searchClause = Prisma.sql`
      WHERE (
        tournament ILIKE ${pattern}
        OR venue ILIKE ${pattern}
        OR display_score ILIKE ${pattern}
        OR team_names::text ILIKE ${pattern}
        OR teams::text ILIKE ${pattern}
      )
      ${statusClause}
    `;

    // Same shape as `list`, and for the same reason: a raw `SELECT *` does not come back
    // with Prisma's field names, so `toSummary` would read `matchId` off a row that only
    // ever had `match_id` and hand back a page of summaries with nothing filled in. Only
    // the matching ids are selected; Prisma reads the rows.
    const [idRows, countRows] = await Promise.all([
      this.prisma.$queryRaw<Array<{ match_id: string }>>(
        Prisma.sql`
          SELECT match_id
          FROM matches
          ${searchClause}
          ${matchListOrder(scheduledNow())}
          LIMIT ${limit} OFFSET ${skip}
        `,
      ),
      this.prisma.$queryRaw<Array<{ count: bigint }>>(
        Prisma.sql`
          SELECT COUNT(*)::bigint AS count
          FROM matches
          ${searchClause}
        `,
      ),
    ]);

    const order = idRows.map((r) => r.match_id);
    const rows = order.length
      ? await this.prisma.match.findMany({ where: { matchId: { in: order } } })
      : [];
    const byId = new Map(rows.map((r) => [r.matchId, r]));
    const ordered = order
      .map((id) => byId.get(id))
      .filter((r): r is Match => r !== undefined);

    const caches = await this.cachedStates(ordered.map((r) => r.matchId));
    const total = Number(countRows[0]?.count ?? 0);
    return createPaginatedResponse(
      ordered.map((r) => this.overlayCached(this.toSummary(r), r, caches.get(r.matchId))),
      total,
      page,
      limit,
    );
  }

  /**
   * Live matches only, soonest start first.
   *
   * Deliberately not on `matchListOrder`. Every row here shares one status, so the
   * status grouping that clause exists for would collapse to a constant and do nothing.
   * The only ordering a set of in-play matches has is by when each one started, and that
   * is what `scheduled ASC` already gave. The `matchId` tiebreak is added so two matches
   * kicking off at the same instant come back in a fixed order rather than the database's.
   */
  async listLive() {
    const [rows, liveIds] = await Promise.all([
      this.prisma.match.findMany({
        where: { status: MATCH_STATUS.LIVE },
        orderBy: [{ scheduled: 'asc' }, { matchId: 'asc' }],
      }),
      this.redis.smembers(redisKeys.liveMatches()),
    ]);
    const summaries = await Promise.all(
      rows.map(async (r) => {
        const patch = await this.enrichFromStoredSummary(r);
        const summary = this.toSummary(r, patch);
        if (patch.teamScores) {
          return { ...summary, teams: this.buildTeamsField(r, patch.teamScores) };
        }
        return summary;
      }),
    );
    const revisionMap = await this.revisionMetaFor(rows.map((r) => r.matchId));
    const caches = await this.cachedStates(rows.map((r) => r.matchId));
    for (const s of summaries) {
      const meta = revisionMap.get(s.matchId);
      if (meta) {
        s.revision = meta.revision;
        s.updatedAt = meta.updatedAt;
      }
    }
    const rowsById = new Map(rows.map((r) => [r.matchId, r]));
    const live = summaries.map((s) =>
      this.overlayCached(s, rowsById.get(s.matchId)!, caches.get(s.matchId)),
    );

    const authoritativeIds = new Set(rows.map((row) => row.matchId));
    const staleIds = liveIds.filter((id) => !authoritativeIds.has(id));
    if (staleIds.length > 0) {
      await this.redis.cached.srem(redisKeys.liveMatches(), ...staleIds);
    }
    return { data: live };
  }

  async getMany(matchIds: string[]): Promise<MatchSummary[]> {
    if (matchIds.length === 0) return [];
    const rows = await this.prisma.match.findMany({
      where: { matchId: { in: matchIds } },
    });
    const caches = await this.cachedStates(rows.map((r) => r.matchId));
    return rows.map((r) => this.overlayCached(this.toSummary(r), r, caches.get(r.matchId)));
  }

  async getById(matchId: string): Promise<MatchSummary> {
    const [cached, row] = await Promise.all([
      this.redis.get<CanonicalMatch>(redisKeys.matchState(matchId)),
      this.prisma.match.findUnique({ where: { matchId } }),
    ]);

    if (row) {
      const patch = await this.enrichFromStoredSummary(row);
      const meta = await this.revisionMeta(matchId);
      const summary = this.toSummary(row, { ...patch, revision: meta.revision, updatedAt: meta.updatedAt });
      const mergedScores = patch.teamScores ?? summary.teamScores;
      const mergedTeams = mergedScores
        ? this.buildTeamsField(row, mergedScores)
        : summary.teams;
      if (cached) {
        return this.overlayCached(summary, row, cached);
      }
      return { ...summary, teams: mergedTeams, teamScores: mergedScores };
    }

    if (cached) {
      const meta = await this.revisionMeta(matchId);
      return {
        ...(cached as MatchSummary),
        revision: meta.revision ?? cached.revision ?? null,
        updatedAt: meta.updatedAt ?? cached.updatedAt ?? null,
      };
    }

    throw new NotFoundException(`Match ${matchId} not found`);
  }

  private static readonly LIVE_TIMELINE_REFRESH_MIN_AGE_MS = 30_000;

  /**
   * One page of deliveries: the newest `overs` overs, or the ones before the
   * `before` cursor ("<inning>:<over>"). Built from the same timeline the
   * timeline endpoint serves, so it obeys the same storage and upstream rules,
   * but answers with a few kilobytes instead of the whole match.
   */
  async getCommentaryPage(
    matchId: string,
    overs: number,
    before: string | null,
  ): Promise<{ matchId: string; revision: number | null; events: Record<string, unknown>[]; hasMore: boolean; before: string | null }> {
    const { payload, revision } = await this.getTimeline(matchId, null);
    const wrapper = payload.sport_event_timeline as Record<string, unknown> | undefined;
    const all = ((wrapper?.timeline ?? payload.timeline ?? []) as Record<string, unknown>[]).filter(
      (e) => typeof e.over_number === 'number' && typeof e.inning === 'number',
    );
    const key = (e: Record<string, unknown>) => (e.inning as number) * 10_000 + (e.over_number as number);
    const [bi, bo] = (before ?? '').split(':').map(Number);
    const limit = Number.isFinite(bi) && Number.isFinite(bo) ? bi * 10_000 + bo : Number.POSITIVE_INFINITY;
    const keys = [...new Set(all.map(key))].filter((k) => k < limit).sort((a, b) => a - b);
    const page = new Set(keys.slice(-overs));
    const oldest = keys.length > overs ? keys[keys.length - overs] : null;
    return {
      matchId,
      revision,
      events: all.filter((e) => page.has(key(e))),
      hasMore: oldest != null,
      before: oldest != null ? `${Math.floor(oldest / 10_000)}:${oldest % 10_000}` : null,
    };
  }

  private async upsertTimelinePayload(
    matchId: string,
    fresh: Record<string, unknown>,
  ): Promise<{ matchId: string; payload: Record<string, unknown> }> {
    const payload = reconcileTimelineStatus(dedupeTimelineEvents(fresh));
    await this.prisma.matchTimeline.upsert({
      where: { matchId },
      create: {
        matchId,
        payload: payload as Prisma.InputJsonValue,
      },
      update: {
        payload: payload as Prisma.InputJsonValue,
      },
    });
    return { matchId, payload };
  }

  buildTimelineResponse(
    matchId: string,
    row: { matchId: string; payload: unknown; updatedAt: Date } | null,
    storedPayload: Record<string, unknown> | undefined,
    since: number | null,
  ): { matchId: string; revision: number | null; updatedAt: string | null; complete: boolean; noNewEvents?: boolean; payload: Record<string, unknown> } | null {
    if (!storedPayload) return null;
    const reconciled = reconcileTimelineStatus(storedPayload);
    const revision = timelineRevision(reconciled);

    // Client already has everything up to `since` — nothing new to send.
    if (since != null && revision != null && since >= revision) {
      return {
        matchId,
        revision,
        updatedAt: row?.updatedAt ? row.updatedAt.toISOString() : null,
        complete: false,
        noNewEvents: true,
        payload: { sport_event_timeline: { timeline: [] } },
      };
    }

    if (since != null && since > 0) {
      const newEvents = timelineEventsSince(reconciled, since);
      const wrapper = reconciled.sport_event_timeline as Record<string, unknown> | undefined;
      const delta: Record<string, unknown> =
        wrapper && typeof wrapper === 'object'
          ? { ...reconciled, sport_event_timeline: { ...wrapper, timeline: newEvents } }
          : { ...reconciled, timeline: newEvents };
      return {
        matchId,
        revision,
        updatedAt: row?.updatedAt ? row.updatedAt.toISOString() : null,
        complete: false,
        payload: delta,
      };
    }

    return {
      matchId,
      revision,
      updatedAt: row?.updatedAt ? row.updatedAt.toISOString() : null,
      complete: true,
      payload: reconciled,
    };
  }

  /**
   * Fold a freshly fetched live timeline back into the match row.
   *
   * The timeline endpoint can refresh on demand while the worker is not following the
   * match. Without this the page advanced (284/8) but the row — and therefore every list
   * card — stayed at the score from the last poll (194/5). The cached live snapshot is
   * dropped so the next read takes the just-written row rather than the old score.
   */
  private async syncSummaryFromTimeline(
    matchRow: Match,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const status = sportEventStatusFromPayload(payload);
    const teamScores = teamScoresFromSportEventPayload(payload);
    if (!status && !teamScores) return;

    const data: Prisma.MatchUpdateInput = {};
    if (status?.displayScore != null) data.displayScore = status.displayScore;
    if (status?.displayOvers != null) data.displayOvers = status.displayOvers;
    if (status?.currentInning != null) data.currentInning = status.currentInning;
    if (status?.periodScores != null) {
      data.periodScores = status.periodScores as Prisma.InputJsonValue;
    }
    if (status?.matchResultText != null) data.resultText = status.matchResultText;
    if (teamScores) {
      data.teamScores = teamScores as unknown as Prisma.InputJsonValue;
      data.teams = this.buildTeamsField(matchRow, teamScores) as unknown as Prisma.InputJsonValue;
    }
    if (status?.displayScore != null) {
      const pair = String(status.displayScore).match(/(\d+)\/(\d+)\s*$/);
      if (pair) {
        const prev = (matchRow.currentInnings as Record<string, unknown>) ?? {};
        const runs = Number(pair[1]);
        const wickets = Number(pair[2]);
        const overs = status.displayOvers != null ? Number(status.displayOvers) : prev.overs;
        const balls = typeof overs === 'number' ? Math.floor(overs) * 6 + Math.round((overs % 1) * 10) : null;
        const runRate = balls && balls > 0 ? Math.round((runs / balls) * 600) / 100 : prev.runRate;
        data.currentInnings = { ...prev, runs, wickets, overs, runRate } as Prisma.InputJsonValue;
      }
    }
    try {
      await this.prisma.match.update({ where: { matchId: matchRow.matchId }, data });
      await this.redis.cached.del(redisKeys.matchState(matchRow.matchId));
    } catch (err) {
      this.logger.warn('timeline write-back failed', {
        matchId: matchRow.matchId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private logStaleNotRefreshed(
    matchId: string,
    reason: StaleNotRefreshedReason,
    ageMs: number,
    matchRow: Match,
    storedPayload: Record<string, unknown>,
  ): void {
    const stored = sportEventStatusFromPayload(storedPayload);
    this.logger.warn('timeline stale, not refreshed', {
      matchId,
      reason,
      ageMs,
      status: matchRow.status,
      matchOvers: matchRow.displayOvers,
      matchScore: matchRow.displayScore,
      storedOvers: stored?.displayOvers ?? null,
      storedScore: stored?.displayScore ?? null,
    });
    incrCounter(this.redis.cached, 'timeline_stale_not_refreshed_total', { reason });
  }

  async getTimeline(
    matchId: string,
    since?: number | null,
  ): Promise<{
    matchId: string;
    revision: number | null;
    updatedAt: string | null;
    complete: boolean;
    noNewEvents?: boolean;
    payload: Record<string, unknown>;
  }> {
    const [row, matchRow] = await Promise.all([
      this.prisma.matchTimeline.findUnique({ where: { matchId } }),
      this.prisma.match.findUnique({ where: { matchId } }),
    ]);

    const storedPayload = row?.payload as Record<string, unknown> | undefined;

    if (storedPayload && matchRow) {
      const timelineStatus = sportEventStatusFromPayload(storedPayload);
      if (
        timelineStatus &&
        this.compareLiveProgress(
          {
            currentInning: matchRow.currentInning,
            displayOvers: matchRow.displayOvers,
            displayScore: matchRow.displayScore,
          },
          {
            currentInning: timelineStatus.currentInning,
            displayOvers: timelineStatus.displayOvers,
            displayScore: timelineStatus.displayScore,
          },
        ) > 0
      ) {
        await this.syncSummaryFromTimeline(matchRow, storedPayload);
      }

      const stale = isLiveTimelineBehindMatch(
        {
          status: matchRow.status,
          displayScore: matchRow.displayScore,
          displayOvers: matchRow.displayOvers,
        },
        storedPayload,
      );
      const ageMs = row ? Date.now() - row.updatedAt.getTime() : Number.POSITIVE_INFINITY;
      if (stale) {
        let reason: 'not_configured' | 'too_recent' | null = null;
        if (!this.sportradar.isConfigured) {
          reason = 'not_configured';
        } else if (ageMs < MatchesService.LIVE_TIMELINE_REFRESH_MIN_AGE_MS) {
          reason = 'too_recent';
        } else {
          try {
            const fresh = await this.sportradar.fetchMatchTimeline(matchId);
            await this.upsertTimelinePayload(matchId, fresh);
            await this.syncSummaryFromTimeline(matchRow, dedupeTimelineEvents(fresh));
            return this.buildTimelineResponse(matchId, null, dedupeTimelineEvents(fresh), since ?? null)!;
          } catch (err) {
            if (err instanceof ServiceUnavailableException) throw err;
            this.logStaleNotRefreshed(matchId, 'fetch_failed', ageMs, matchRow, storedPayload);
          }
        }
        if (reason) {
          this.logStaleNotRefreshed(matchId, reason, ageMs, matchRow, storedPayload);
        }
      }
      return this.buildTimelineResponse(matchId, row, storedPayload, since ?? null)!;
    }

    if (storedPayload) {
      return this.buildTimelineResponse(matchId, row, storedPayload, since ?? null)!;
    }

    // Nothing stored and not even shaped like a provider match id: answer 404 without
    // spending an upstream request (Sportradar 404s are also mapped to 404 below).
    if (!this.sportradar.isConfigured || (!matchRow && !/^sr:match:\d+$/.test(matchId))) {
      throw new NotFoundException(`Timeline for match ${matchId} not found`);
    }

    if (matchRow?.status === MATCH_STATUS.LIVE) {
      // Live match without a stored row: fetch and persist while it is live.
      try {
        const fresh = await this.sportradar.fetchMatchTimeline(matchId);
        await this.upsertTimelinePayload(matchId, fresh);
        await this.syncSummaryFromTimeline(matchRow, dedupeTimelineEvents(fresh));
        return this.buildTimelineResponse(matchId, null, dedupeTimelineEvents(fresh), since ?? null)!;
      } catch (err) {
        if (err instanceof ServiceUnavailableException) throw err;
        throw new NotFoundException(`Timeline for match ${matchId} not found`);
      }
    }

    // A finished match's timeline no longer changes: store it on first fetch,
    // the same one-shot row the ingestion backfill writes, so later requests
    // never go upstream again (repeat fetches here were hitting Sportradar's
    // rate limit and surfacing as 503s).
    if (matchRow?.status === MATCH_STATUS.COMPLETED) {
      try {
        const fresh = await this.sportradar.fetchMatchTimeline(matchId);
        await this.upsertTimelinePayload(matchId, fresh);
        return this.buildTimelineResponse(matchId, null, dedupeTimelineEvents(fresh), since ?? null)!;
      } catch (err) {
        if (err instanceof ServiceUnavailableException) throw err;
        throw new NotFoundException(`Timeline for match ${matchId} not found`);
      }
    }

    // Upcoming and cancelled matches have no ball-by-ball yet: answer without
    // spending an upstream call. Their timeline is fetched once the match goes
    // live (and stored by the branches above).
    if (matchRow) {
      throw new NotFoundException(`Timeline for match ${matchId} not found`);
    }

    // A provider id we hold no row for: serve one fresh fetch without writing.
    try {
      const fresh = await this.sportradar.fetchMatchTimeline(matchId);
      return this.buildTimelineResponse(matchId, null, dedupeTimelineEvents(fresh), since ?? null)!;
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      throw new NotFoundException(`Timeline for match ${matchId} not found`);
    }
  }
}
