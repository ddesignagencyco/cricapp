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

  async list(): Promise<TeamSummary[]> {
    const teams = await this.prisma.team.findMany({
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

  async getRoster(idOrAbbr: string): Promise<PlayerSummaryDto[]> {
    const team = await this.getProfile(idOrAbbr);
    const players = await this.prisma.player.findMany({
      where: { teamId: team.id },
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
  ): Promise<SportEventRecordSummary[]> {
    const team = await this.getProfile(idOrAbbr);
    const rows = await this.prisma.sportEventRecord.findMany({
      where: { kind, scopeKey: team.id },
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

  async getSchedule(idOrAbbr: string): Promise<SportEventRecordSummary[]> {
    return this.getEvents(idOrAbbr, 'team_schedule');
  }

  async getResults(idOrAbbr: string): Promise<SportEventRecordSummary[]> {
    return this.getEvents(idOrAbbr, 'team_results');
  }
}