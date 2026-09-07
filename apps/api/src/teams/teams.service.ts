import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface TeamSummary {
  id: string;
  name: string;
  abbr: string;
  country: string | null;
  logoUrl: string | null;
  manager: string | null;
}

export interface PlayerSummaryDto {
  id: string;
  fullName: string;
  shortName: string | null;
  role: string | null;
  nationality: string | null;
}

export interface SportEventRecordSummary {
  kind: string;
  scopeKey: string;
  eventId: string;
  status: string | null;
  scheduled: string | null;
  payload: Record<string, unknown>;
}

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  private toSummary(row: {
    id: string;
    name: string;
    abbr: string;
    country: string | null;
    logoUrl: string | null;
    manager: string | null;
  }): TeamSummary {
    return {
      id: row.id,
      name: row.name,
      abbr: row.abbr,
      country: row.country,
      logoUrl: row.logoUrl,
      manager: row.manager,
    };
  }

  async list(params?: { limit?: number; offset?: number }): Promise<TeamSummary[]> {
    const limit = Math.min(params?.limit ?? 50, 100);
    const offset = params?.offset ?? 0;
    const teams = await this.prisma.team.findMany({
      take: limit,
      skip: offset,
      orderBy: [{ name: 'asc' }],
    });
    return teams.map((t) => this.toSummary(t));
  }

  private async findTeam(idOrAbbr: string) {
    return this.prisma.team.findFirst({
      where: {
        OR: [{ id: idOrAbbr }, { abbr: idOrAbbr }],
      },
    });
  }

  async getProfile(idOrAbbr: string): Promise<TeamSummary> {
    const team = await this.findTeam(idOrAbbr);
    if (!team) {
      throw new NotFoundException(`Team ${idOrAbbr} not found`);
    }
    return this.toSummary(team);
  }

  async getRoster(idOrAbbr: string, params?: { limit?: number; offset?: number }): Promise<PlayerSummaryDto[]> {
    const team = await this.getProfile(idOrAbbr);
    const limit = Math.min(params?.limit ?? 50, 100);
    const offset = params?.offset ?? 0;
    const players = await this.prisma.player.findMany({
      where: { teamId: team.id },
      take: limit,
      skip: offset,
      orderBy: [{ fullName: 'asc' }],
    });
    return players.map((p) => ({
      id: p.id,
      fullName: p.fullName,
      shortName: p.shortName,
      role: p.role,
      nationality: p.nationality,
    }));
  }

  private async getEvents(
    idOrAbbr: string,
    kind: 'team_schedule' | 'team_results',
    params?: { limit?: number; offset?: number },
  ): Promise<SportEventRecordSummary[]> {
    const team = await this.getProfile(idOrAbbr);
    const limit = Math.min(params?.limit ?? 50, 100);
    const offset = params?.offset ?? 0;
    const rows = await this.prisma.sportEventRecord.findMany({
      where: { kind, scopeKey: team.id },
      take: limit,
      skip: offset,
      orderBy: [{ scheduled: 'asc' }],
    });
    return rows.map((r) => ({
      kind: r.kind,
      scopeKey: r.scopeKey,
      eventId: r.eventId,
      status: r.status,
      scheduled: r.scheduled,
      payload: r.payload as Record<string, unknown>,
    }));
  }

  async getSchedule(idOrAbbr: string, params?: { limit?: number; offset?: number }): Promise<SportEventRecordSummary[]> {
    return this.getEvents(idOrAbbr, 'team_schedule', params);
  }

  async getResults(idOrAbbr: string, params?: { limit?: number; offset?: number }): Promise<SportEventRecordSummary[]> {
    return this.getEvents(idOrAbbr, 'team_results', params);
  }
}