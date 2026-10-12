import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
import type { Match } from '@prisma/client';
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

    const total = Number(countRows[0]?.count ?? 0);
    return createPaginatedResponse(ordered.map((r) => this.toSummary(r)), total, page, limit);
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

    const total = Number(countRows[0]?.count ?? 0);
    return createPaginatedResponse(ordered.map((r) => this.toSummary(r)), total, page, limit);
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
    for (const s of summaries) {
      const meta = revisionMap.get(s.matchId);
      if (meta) {
        s.revision = meta.revision;
        s.updatedAt = meta.updatedAt;
      }
    }

    const authoritativeIds = new Set(rows.map((row) => row.matchId));
    const staleIds = liveIds.filter((id) => !authoritativeIds.has(id));
    if (staleIds.length > 0) {
      await this.redis.cached.srem(redisKeys.liveMatches(), ...staleIds);
    }
    return { data: summaries };
  }

  async getMany(matchIds: string[]): Promise<MatchSummary[]> {
    if (matchIds.length === 0) return [];
    const rows = await this.prisma.match.findMany({
      where: { matchId: { in: matchIds } },
    });
    return rows.map((r) => this.toSummary(r));
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
        return {
          ...cached,
          teams: mergedTeams,
          teamScores: mergedScores,
          result: summary.result,
          revision: meta.revision ?? (typeof cached.revision === 'number' ? cached.revision : null),
          updatedAt: meta.updatedAt ?? cached.updatedAt ?? null,
        };
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

    if (!this.sportradar.isConfigured) {
      throw new NotFoundException(`Timeline for match ${matchId} not found`);
    }

    if (matchRow?.status === MATCH_STATUS.LIVE) {
      // Live match without a stored row: fetch and persist while it is live.
      try {
        const fresh = await this.sportradar.fetchMatchTimeline(matchId);
        await this.upsertTimelinePayload(matchId, fresh);
        return this.buildTimelineResponse(matchId, null, dedupeTimelineEvents(fresh), since ?? null)!;
      } catch (err) {
        if (err instanceof ServiceUnavailableException) throw err;
        throw new NotFoundException(`Timeline for match ${matchId} not found`);
      }
    }

    // Non-live match with no stored row: serve a fresh fetch WITHOUT writing,
    // so completed/upcoming pages populate without growing or rewriting the
    // table. The ingestion backfill (finished matches only) persists the
    // one-shot history row and freezes it thereafter.
    try {
      const fresh = await this.sportradar.fetchMatchTimeline(matchId);
      return this.buildTimelineResponse(matchId, null, dedupeTimelineEvents(fresh), since ?? null)!;
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      throw new NotFoundException(`Timeline for match ${matchId} not found`);
    }
  }
}
