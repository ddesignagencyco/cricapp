import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  getPaginationOffset,
  createPaginatedResponse,
} from '../common/pagination/pagination.util.js';
import { teamKindFromProfile } from './team-kind.util.js';
import {
  mapEnrichedSportEventRecord,
  type EnrichedSportEventRecord,
} from '../common/sport-event-record.mapper.js';

export interface TeamSummary {
  id: string;
  name: string;
  abbr: string;
  country: string | null;
  logoUrl: string | null;
  manager: string | null;
  /** Present on GET /teams list and team profile when derivable from stored profile. */
  gender?: 'male' | 'female' | null;
  ageGroup?: 'senior' | 'u19' | 'u23' | 'masters' | null;
  category?: string | null;
  kindLabel?: string | null;
}

export interface PlayerSummaryDto {
  id: string;
  fullName: string;
  shortName: string | null;
  role: string | null;
  nationality: string | null;
}

export type SportEventRecordSummary = EnrichedSportEventRecord;

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  private toSummary(
    row: {
      id: string;
      name: string;
      abbr: string;
      country: string | null;
      logoUrl: string | null;
      manager: string | null;
    },
    profile?: { teamInfo: unknown } | null,
  ): TeamSummary {
    const kind = teamKindFromProfile(profile?.teamInfo, null);
    return {
      id: row.id,
      name: row.name,
      abbr: row.abbr,
      country: row.country,
      logoUrl: row.logoUrl,
      manager: row.manager,
      ...kind,
    };
  }

  async list(params?: { q?: string; page?: number; limit?: number; offset?: number }) {
    const { page, limit, skip } = getPaginationOffset(params?.page, params?.limit, params?.offset);

    const where: Record<string, unknown> = {};
    if (params?.q) {
      where.OR = [
        { name: { contains: params.q, mode: 'insensitive' } },
        { abbr: { contains: params.q, mode: 'insensitive' } },
        { country: { contains: params.q, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.team.findMany({
        where,
        take: limit,
        skip,
        orderBy: [{ name: 'asc' }],
      }),
      this.prisma.team.count({ where }),
    ]);

    const ids = rows.map((t) => t.id);
    const profiles =
      ids.length > 0
        ? await this.prisma.teamProfile.findMany({ where: { teamId: { in: ids } } })
        : [];
    const profileById = new Map(profiles.map((p) => [p.teamId, p]));

    return createPaginatedResponse(
      rows.map((t) => this.toSummary(t, profileById.get(t.id))),
      total,
      page,
      limit,
    );
  }

  async search(params?: { q?: string; page?: number; limit?: number; offset?: number }) {
    return this.list(params);
  }

  private async findTeam(idOrAbbr: string) {
    try {
      idOrAbbr = decodeURIComponent(idOrAbbr);
    } catch {
      /* keep raw id */
    }
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
    const profile = await this.prisma.teamProfile.findUnique({ where: { teamId: team.id } });
    return this.toSummary(team, profile);
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

    const mapped = rows.map((r) => mapEnrichedSportEventRecord(r));

    return createPaginatedResponse(mapped, total, page, limit);
  }

  async getSchedule(idOrAbbr: string, params?: { page?: number; limit?: number; offset?: number }) {
    return this.getEvents(idOrAbbr, 'team_schedule', params);
  }

  async getResults(idOrAbbr: string, params?: { page?: number; limit?: number; offset?: number }) {
    return this.getEvents(idOrAbbr, 'team_results', params);
  }
}
