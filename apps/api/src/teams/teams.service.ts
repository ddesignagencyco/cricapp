import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  getPaginationOffset,
  createPaginatedResponse,
} from '../common/pagination/pagination.util.js';

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

  async list(params?: { page?: number; limit?: number; offset?: number }) {
    const { page, limit, skip } = getPaginationOffset(params?.page, params?.limit, params?.offset);

    const [rows, total] = await Promise.all([
      this.prisma.team.findMany({
        take: limit,
        skip,
        orderBy: [{ name: 'asc' }],
      }),
      this.prisma.team.count(),
    ]);

    return createPaginatedResponse(rows.map((t) => this.toSummary(t)), total, page, limit);
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

  async getRoster(idOrAbbr: string, params?: { page?: number; limit?: number; offset?: number }) {
    const team = await this.getProfile(idOrAbbr);
    const { page, limit, skip } = getPaginationOffset(params?.page, params?.limit, params?.offset);

    const [rows, total] = await Promise.all([
      this.prisma.player.findMany({
        where: { teamId: team.id },
        take: limit,
        skip,
        orderBy: [{ fullName: 'asc' }],
      }),
      this.prisma.player.count({ where: { teamId: team.id } }),
    ]);

    const mapped = rows.map((p) => ({
      id: p.id,
      fullName: p.fullName,
      shortName: p.shortName,
      role: p.role,
      nationality: p.nationality,
    }));

    return createPaginatedResponse(mapped, total, page, limit);
  }

  private async getEvents(
    idOrAbbr: string,
    kind: 'team_schedule' | 'team_results',
    params?: { page?: number; limit?: number; offset?: number },
  ) {
    const team = await this.getProfile(idOrAbbr);
    const { page, limit, skip } = getPaginationOffset(params?.page, params?.limit, params?.offset);
    const where = { kind, scopeKey: team.id };

    const [rows, total] = await Promise.all([
      this.prisma.sportEventRecord.findMany({
        where,
        take: limit,
        skip,
        orderBy: [{ scheduled: 'asc' }],
      }),
      this.prisma.sportEventRecord.count({ where }),
    ]);

    const mapped = rows.map((r) => ({
      kind: r.kind,
      scopeKey: r.scopeKey,
      eventId: r.eventId,
      status: r.status,
      scheduled: r.scheduled,
      payload: r.payload as Record<string, unknown>,
    }));

    return createPaginatedResponse(mapped, total, page, limit);
  }

  async getSchedule(idOrAbbr: string, params?: { page?: number; limit?: number; offset?: number }) {
    return this.getEvents(idOrAbbr, 'team_schedule', params);
  }

  async getResults(idOrAbbr: string, params?: { page?: number; limit?: number; offset?: number }) {
    return this.getEvents(idOrAbbr, 'team_results', params);
  }
}
