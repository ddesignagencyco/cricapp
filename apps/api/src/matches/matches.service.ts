import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { SportradarService } from '../sportradar/sportradar.service.js';
import {
  MATCH_STATUS,
  redisKeys,
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

export type MatchSummary = Pick<
  CanonicalMatch,
  | 'matchId'
  | 'status'
  | 'teams'
  | 'teamNames'
  | 'teamScores'
  | 'tournament'
  | 'venue'
  | 'scheduled'
  | 'currentInnings'
  | 'lastEvent'
  | 'displayScore'
  | 'matchStatus'
>;

@Injectable()
export class MatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly sportradar: SportradarService,
  ) {}

  private asStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.map(String) : [];
  }

  private buildTeamsField(row: Match): CanonicalMatch['teams'] {
    const abbrs = this.asStringArray(row.teams);
    const names = this.asStringArray(row.teamNames);
    const scores = row.teamScores as TeamScores | null;
    if (!scores?.home && !scores?.away) {
      return abbrs;
    }
    return {
      home: {
        code: scores?.home?.code || abbrs[0] || '',
        name: scores?.home?.name || names[0] || '',
        score: scores?.home?.score || '',
        overs: scores?.home?.overs || '',
      },
      away: {
        code: scores?.away?.code || abbrs[1] || '',
        name: scores?.away?.name || names[1] || '',
        score: scores?.away?.score || '',
        overs: scores?.away?.overs || '',
      },
    };
  }

  private toSummary(row: Match): MatchSummary {
    return {
      matchId: row.matchId,
      status: row.status as CanonicalMatch['status'],
      teams: this.buildTeamsField(row),
      teamNames: this.asStringArray(row.teamNames),
      teamScores: (row.teamScores as TeamScores | null) ?? null,
      tournament: row.tournament,
      venue: row.venue,
      scheduled: row.scheduled,
      currentInnings: row.currentInnings as unknown as CurrentInnings | null,
      lastEvent: row.lastEvent as unknown as LastEvent,
      displayScore: row.displayScore,
      matchStatus: row.matchStatus,
    };
  }

  async list(params: {
    q?: string;
    status?: string;
    tournament?: string;
    page?: number;
    limit?: number;
    offset?: number;
  }) {
    const { page, limit, skip } = getPaginationOffset(params.page, params.limit, params.offset);

    if (params.q?.trim()) {
      return this.search(params);
    }

    const where: Record<string, unknown> = {};
    if (params.status) where.status = params.status;
    if (params.tournament) where.tournament = { contains: params.tournament, mode: 'insensitive' };

    const [rows, total] = await Promise.all([
      this.prisma.match.findMany({
        where,
        orderBy: [{ scheduled: 'asc' }],
        take: limit,
        skip,
      }),
      this.prisma.match.count({ where }),
    ]);

    return createPaginatedResponse(rows.map((r) => this.toSummary(r)), total, page, limit);
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

    const [rows, countRows] = await Promise.all([
      this.prisma.$queryRaw<Match[]>(
        Prisma.sql`
          SELECT *
          FROM matches
          WHERE (
            tournament ILIKE ${pattern}
            OR venue ILIKE ${pattern}
            OR display_score ILIKE ${pattern}
            OR team_names::text ILIKE ${pattern}
            OR teams::text ILIKE ${pattern}
          )
          ${statusClause}
          ORDER BY scheduled ASC NULLS LAST
          LIMIT ${limit} OFFSET ${skip}
        `,
      ),
      this.prisma.$queryRaw<Array<{ count: bigint }>>(
        Prisma.sql`
          SELECT COUNT(*)::bigint AS count
          FROM matches
          WHERE (
            tournament ILIKE ${pattern}
            OR venue ILIKE ${pattern}
            OR display_score ILIKE ${pattern}
            OR team_names::text ILIKE ${pattern}
            OR teams::text ILIKE ${pattern}
          )
          ${statusClause}
        `,
      ),
    ]);

    const total = Number(countRows[0]?.count ?? 0);
    return createPaginatedResponse(rows.map((r) => this.toSummary(r)), total, page, limit);
  }

  async listLive() {
    const [rows, liveIds] = await Promise.all([
      this.prisma.match.findMany({
        where: { status: MATCH_STATUS.LIVE },
        orderBy: [{ scheduled: 'asc' }],
      }),
      this.redis.smembers(redisKeys.liveMatches()),
    ]);
    const summaries = rows.map((r) => this.toSummary(r));

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
      const summary = this.toSummary(row);
      if (cached) {
        return {
          ...cached,
          teams: summary.teams,
          teamScores: summary.teamScores,
        };
      }
      return summary;
    }

    if (cached) return cached as MatchSummary;

    throw new NotFoundException(`Match ${matchId} not found`);
  }

  async getTimeline(matchId: string): Promise<{ matchId: string; payload: Record<string, unknown> }> {
    const row = await this.prisma.matchTimeline.findUnique({
      where: { matchId },
    });

    if (this.sportradar.isConfigured) {
      try {
        const fresh = await this.sportradar.fetchMatchTimeline(matchId);
        await this.prisma.matchTimeline.upsert({
          where: { matchId },
          create: {
            matchId,
            payload: fresh as Prisma.InputJsonValue,
          },
          update: {
            payload: fresh as Prisma.InputJsonValue,
          },
        });
        return { matchId, payload: fresh };
      } catch (err) {
        if (row) {
          return {
            matchId: row.matchId,
            payload: row.payload as Record<string, unknown>,
          };
        }
        if (err instanceof ServiceUnavailableException) throw err;
        throw new NotFoundException(`Timeline for match ${matchId} not found`);
      }
    }

    if (!row) {
      throw new NotFoundException(`Timeline for match ${matchId} not found`);
    }

    return {
      matchId: row.matchId,
      payload: row.payload as Record<string, unknown>,
    };
  }
}
