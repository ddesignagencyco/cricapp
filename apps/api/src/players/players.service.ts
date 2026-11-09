import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { RedisService } from '../redis/redis.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  getPaginationOffset,
  createPaginatedResponse,
} from '../common/pagination/pagination.util.js';
import type { TeamSummary } from '../teams/teams.service.js';

export interface PlayerProfileDto {
  id: string;
  fullName: string;
  shortName: string | null;
  role: string | null;
  battingStyle: string | null;
  bowlingStyle: string | null;
  birth: string | null;
  nationality: string | null;
  profileUrl: string | null;
  countryCode: string | null;
  jerseyNumber: number | null;
  height: number | null;
  providerProfile: Record<string, unknown> | null;
  /** True while the full provider profile has been requested but is not stored yet. */
  profilePending: boolean;
  team: TeamSummary | null;
  recentMatches: Array<{
    matchId: string;
    status: string;
    teams: string[];
    teamNames: string[];
    tournament: string | null;
    displayScore: string | null;
    scheduled: string | null;
  }>;
}

@Injectable()
export class PlayersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Ask the ingestion service for this player's full profile. Opening a page is what makes a
   * profile worth a provider request, so the queue is driven by page views; ingestion drains it
   * within seconds and under a daily cap. `profile:backoff:*` keeps a player that failed (or was
   * just fetched) from being queued again for hours.
   */
  private async requestFullProfile(playerId: string): Promise<void> {
    if (!playerId.startsWith('cb:player:')) return;
    try {
      if (await this.redis.cached.exists(`profile:backoff:${playerId}`)) return;
      await this.redis.cached.zadd('profile:wanted', 'NX', Date.now(), playerId);
    } catch {
      // The queue is a convenience; a Redis hiccup must never fail the page.
    }
  }

  async search(params?: { q?: string; team?: string; page?: number; limit?: number; offset?: number }) {
    const { page, limit, skip } = getPaginationOffset(params?.page, params?.limit, params?.offset);

    const where: any = {};
    if (params?.q) {
      where.OR = [
        { fullName: { contains: params.q, mode: 'insensitive' } },
        { shortName: { contains: params.q, mode: 'insensitive' } },
        { nationality: { contains: params.q, mode: 'insensitive' } },
        { role: { contains: params.q, mode: 'insensitive' } },
      ];
    }
    if (params?.team) {
      where.team = { abbr: params.team };
    }

    const [rows, total] = await Promise.all([
      this.prisma.player.findMany({
        where,
        take: limit,
        skip,
        orderBy: [{ fullName: 'asc' }],
        select: {
          id: true,
          fullName: true,
          shortName: true,
          role: true,
          nationality: true,
          birth: true,
          // The list cards render the photo and style badges, so they must come with the row;
          // without them the directory shows initials for every player.
          profileUrl: true,
          battingStyle: true,
          bowlingStyle: true,
          team: { select: { id: true, name: true, abbr: true, logoUrl: true } },
        },
      }),
      this.prisma.player.count({ where }),
    ]);

    return createPaginatedResponse(rows, total, page, limit);
  }

  async getProfile(playerId: string, opts: { recent?: number } = {}): Promise<PlayerProfileDto> {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      include: { team: true },
    });
    if (!player) {
      throw new NotFoundException(`Player ${playerId} not found`);
    }
    const profile = await this.prisma.playerProfile.findUnique({
      where: { playerId },
    });
    const profilePending = !profile && playerId.startsWith('cb:player:');
    if (profilePending) await this.requestFullProfile(playerId);

    let team: TeamSummary | null = null;
    if (player.team) {
      team = {
        id: player.team.id,
        name: player.team.name,
        abbr: player.team.abbr,
        country: player.team.country,
        logoUrl: player.team.logoUrl,
        manager: player.team.manager,
      };
    }

    const recent: PlayerProfileDto['recentMatches'] = [];
    if (team && (opts.recent ?? 0) > 0) {
      const rows = await this.prisma.$queryRaw<Array<Record<string, unknown>>>(
        Prisma.sql`
          SELECT match_id, status, teams, team_names, tournament, display_score, scheduled
          FROM matches
          WHERE teams @> ${JSON.stringify([team.abbr])}::jsonb
          ORDER BY scheduled DESC NULLS LAST
          LIMIT ${opts.recent}
        `,
      );
      for (const r of rows) {
        recent.push({
          matchId: String(r['match_id']),
          status: String(r['status']),
          teams: (r['teams'] as unknown as string[]) ?? [],
          teamNames: (r['team_names'] as unknown as string[]) ?? [],
          tournament: r['tournament'] ? String(r['tournament']) : null,
          displayScore: r['display_score'] ? String(r['display_score']) : null,
          scheduled: r['scheduled'] ? String(r['scheduled']) : null,
        });
      }
    }

    return {
      id: player.id,
      fullName: player.fullName,
      shortName: player.shortName,
      role: player.role,
      battingStyle: player.battingStyle,
      bowlingStyle: player.bowlingStyle,
      birth: player.birth,
      nationality: player.nationality,
      profileUrl: player.profileUrl,
      countryCode: player.countryCode ?? null,
      jerseyNumber: player.jerseyNumber ?? null,
      height: player.height ?? null,
      providerProfile: profile
        ? (profile.payload as Record<string, unknown>)
        : null,
      profilePending,
      team,
      recentMatches: recent,
    };
  }
}
