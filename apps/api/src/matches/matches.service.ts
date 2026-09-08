import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import {
  MATCH_STATUS,
  redisKeys,
  type CanonicalMatch,
  type CurrentInnings,
  type LastEvent,
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
  ) {}

  private toSummary(row: Match): MatchSummary {
    return {
      matchId: row.matchId,
      status: row.status as CanonicalMatch['status'],
      teams: row.teams as unknown as string[],
      teamNames: row.teamNames as unknown as string[],
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
    status?: string;
    tournament?: string;
    page?: number;
    limit?: number;
    offset?: number;
  }) {
    const { page, limit, skip } = getPaginationOffset(params.page, params.limit, params.offset);

    const where: any = {};
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

  async listLive() {
    const liveIds = await this.redis.smembers(redisKeys.liveMatches());
    let summaries: MatchSummary[] = [];
    if (liveIds.length > 0) {
      summaries = await this.getMany(liveIds);
    }
    if (summaries.length === 0) {
      const rows = await this.prisma.match.findMany({
        where: { status: MATCH_STATUS.LIVE },
        orderBy: [{ scheduled: 'asc' }],
      });
      summaries = rows.map((r) => this.toSummary(r));
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
    const cached = await this.redis.get<MatchSummary>(
      redisKeys.matchState(matchId),
    );
    if (cached) return cached;

    const row = await this.prisma.match.findUnique({
      where: { matchId },
    });
    if (!row) {
      throw new NotFoundException(`Match ${matchId} not found`);
    }
    return this.toSummary(row);
  }

  async getTimeline(matchId: string): Promise<{ matchId: string; payload: Record<string, unknown> }> {
    const row = await this.prisma.matchTimeline.findUnique({
      where: { matchId },
    });
    if (!row) {
      throw new NotFoundException(`Timeline for match ${matchId} not found`);
    }
    return {
      matchId: row.matchId,
      payload: row.payload as Record<string, unknown>,
    };
  }
}
