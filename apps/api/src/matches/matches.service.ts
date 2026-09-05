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
    limit?: number;
    offset?: number;
  }): Promise<MatchSummary[]> {
    const status = params.status;
    const limit = Math.min(params.limit ?? 50, 100);
    const offset = params.offset ?? 0;

    const rows = await this.prisma.match.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(params.tournament
          ? { tournament: { contains: params.tournament, mode: 'insensitive' } }
          : {}),
      },
      orderBy: [{ scheduled: 'asc' }],
      take: limit,
      skip: offset,
    });

    return rows.map((r) => this.toSummary(r));
  }

  async listLive(): Promise<MatchSummary[]> {
    // Prefer the live set in Redis (cheap) but fall back to Postgres.
    const liveIds = await this.redis.smembers(redisKeys.liveMatches());
    let summaries: MatchSummary[] = [];
    if (liveIds.length > 0) {
      summaries = await this.getMany(liveIds);
    }
    if (summaries.length === 0) {
      summaries = await this.list({ status: MATCH_STATUS.LIVE });
    }
    return summaries;
  }

  async getMany(matchIds: string[]): Promise<MatchSummary[]> {
    if (matchIds.length === 0) return [];
    const rows = await this.prisma.match.findMany({
      where: { matchId: { in: matchIds } },
    });
    return rows.map((r) => this.toSummary(r));
  }

  async getById(matchId: string): Promise<MatchSummary> {
    // Live cache first for hot reads.
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
