import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
  constructor(private readonly prisma: PrismaService) {}

  async search(params?: { q?: string; team?: string; page?: number; limit?: number; offset?: number }) {
    const { page, limit, skip } = getPaginationOffset(params?.page, params?.limit, params?.offset);

    const where: any = {};
    if (params?.q) {
      where.OR = [
        { fullName: { contains: params.q, mode: 'insensitive' } },
        { shortName: { contains: params.q, mode: 'insensitive' } },
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
          team: { select: { id: true, name: true, abbr: true } },
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
      team,
      recentMatches: recent,
    };
  }
}
