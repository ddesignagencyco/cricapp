import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { redisKeys } from '@cricapp/shared-types';
import type { PslStanding, PslFixture } from '@prisma/client';
import {
  DEFAULT_PSL_SEASON_ID,
  PSL_SEASONS_LIST,
  resolveSeason,
  type PslSeason,
} from './psl.constants.js';

export interface PslLeaderGroup {
  category: string;
  stat: string;
  entries: {
    rank: number;
    playerId: string;
    playerName: string;
    teamAbbr: string | null;
    teamName: string | null;
    value: number;
  }[];
}

interface PslSquadPlayer {
  playerId: string;
  playerName: string;
  playerShortName: string | null;
  role: string | null;
  battingStyle: string | null;
  bowlingStyle: string | null;
  nationality: string | null;
  dateOfBirth: string | null;
  jerseyNumber: number | null;
}

export interface PslSquad {
  teamId: string;
  teamName: string;
  teamAbbr: string;
  manager: string | null;
  players: PslSquadPlayer[];
}

@Injectable()
export class PslService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  seasons(): PslSeason[] {
    return PSL_SEASONS_LIST;
  }

  async standings(season?: string): Promise<PslStanding[]> {
    const seasonId = resolveSeason(season).id;
    const cached = await this.redis.get<PslStanding[]>(
      redisKeys.pslStandings(seasonId),
    );
    if (cached) return cached;
    return this.prisma.pslStanding.findMany({
      where: { seasonId },
      orderBy: [{ rank: 'asc' }],
    });
  }

  async fixtures(season?: string): Promise<PslFixture[]> {
    const seasonId = resolveSeason(season).id;
    const cached = await this.redis.get<PslFixture[]>(
      redisKeys.pslFixtures(seasonId),
    );
    if (cached) return cached;
    return this.prisma.pslFixture.findMany({
      where: { seasonId },
      orderBy: [{ scheduled: 'asc' }],
    });
  }

  async leaders(season?: string): Promise<PslLeaderGroup[]> {
    const seasonId = resolveSeason(season).id;
    const cached = await this.redis.get<PslLeaderGroup[]>(
      redisKeys.pslLeaders(seasonId),
    );
    if (cached) return cached;
    return this.leadersFromDb(seasonId);
  }

  private async leadersFromDb(seasonId: string): Promise<PslLeaderGroup[]> {
    const rows = await this.prisma.pslLeader.findMany({
      where: { seasonId },
      orderBy: [{ category: 'asc' }, { stat: 'asc' }, { rank: 'asc' }],
    });
    const groups = new Map<string, PslLeaderGroup>();
    for (const row of rows) {
      const key = `${row.category}:${row.stat}`;
      if (!groups.has(key)) {
        groups.set(key, { category: row.category, stat: row.stat, entries: [] });
      }
      groups.get(key)!.entries.push({
        rank: row.rank,
        playerId: row.playerId,
        playerName: row.playerName,
        teamAbbr: row.teamAbbr,
        teamName: row.teamName,
        value: row.value,
      });
    }
    return [...groups.values()];
  }

  async squads(season?: string): Promise<PslSquad[]> {
    const seasonId = resolveSeason(season).id;
    const cached = await this.redis.get<PslSquad[]>(
      redisKeys.pslSquads(seasonId),
    );
    if (cached) return cached;
    return this.squadsFromDb(seasonId);
  }

  private async squadsFromDb(seasonId: string): Promise<PslSquad[]> {
    // Squads are stored via the shared teams/players tables. Enumerate the
    // teams that belong to the season (from standings) and load their rosters.
    const standings = await this.prisma.pslStanding.findMany({
      where: { seasonId },
    });
    const teams = await this.prisma.team.findMany({
      where: { id: { in: standings.map((s) => s.teamId) } },
      orderBy: [{ name: 'asc' }],
    });
    const squads: PslSquad[] = [];
    for (const team of teams) {
      const stand = standings.find((s) => s.teamId === team.id);
      const players = await this.prisma.player.findMany({
        where: { teamId: team.id },
        orderBy: [{ fullName: 'asc' }],
      });
      squads.push({
        teamId: team.id,
        teamName: team.name,
        teamAbbr: stand?.teamAbbr ?? team.abbr,
        manager: null,
        players: players.map((p) => ({
          playerId: p.id,
          playerName: p.fullName,
          playerShortName: p.shortName,
          role: p.role,
          battingStyle: p.battingStyle,
          bowlingStyle: p.bowlingStyle,
          nationality: p.nationality,
          dateOfBirth: p.birth,
          jerseyNumber: null,
        })),
      });
    }
    return squads;
  }

  defaultSeasonId(): string {
    return DEFAULT_PSL_SEASON_ID;
  }
}
