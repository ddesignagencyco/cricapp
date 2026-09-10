import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  getPaginationOffset,
  createPaginatedResponse,
} from '../common/pagination/pagination.util.js';

export interface TournamentSummary {
  id: string;
  name: string;
  type: string | null;
  gender: string | null;
  category: Record<string, unknown> | null;
  currentSeason: Record<string, unknown> | null;
  sport: Record<string, unknown> | null;
  tourId: string | null;
  parentId: string | null;
}

export interface TournamentSeasonSummary {
  id: string;
  tournamentId: string;
  name: string | null;
  year: string | null;
  startDate: string | null;
  endDate: string | null;
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
export class TournamentsService {
  constructor(private readonly prisma: PrismaService) {}

  private toSummary(row: {
    id: string;
    name: string;
    type: string | null;
    gender: string | null;
    category: unknown;
    currentSeason: unknown;
    sport: unknown;
    tourId: string | null;
    parentId: string | null;
  }): TournamentSummary {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      gender: row.gender,
      category: row.category as Record<string, unknown> | null,
      currentSeason: row.currentSeason as Record<string, unknown> | null,
      sport: row.sport as Record<string, unknown> | null,
      tourId: row.tourId,
      parentId: row.parentId,
    };
  }

  async list(params?: { q?: string; page?: number; limit?: number; offset?: number }) {
    const { page, limit, skip } = getPaginationOffset(params?.page, params?.limit, params?.offset);

    const where: Record<string, unknown> = {};
    if (params?.q) {
      where.name = { contains: params.q, mode: 'insensitive' };
    }

    const [rows, total] = await Promise.all([
      this.prisma.tournament.findMany({
        where,
        take: limit,
        skip,
        orderBy: [{ name: 'asc' }],
      }),
      this.prisma.tournament.count({ where }),
    ]);

    return createPaginatedResponse(rows.map((t) => this.toSummary(t)), total, page, limit);
  }

  async search(params?: { q?: string; page?: number; limit?: number; offset?: number }) {
    return this.list(params);
  }

  async getById(tournamentId: string): Promise<TournamentSummary> {
    const row = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });
    if (!row) {
      throw new NotFoundException(`Tournament ${tournamentId} not found`);
    }
    return this.toSummary(row);
  }

  async seasons(tournamentId: string, params?: { page?: number; limit?: number; offset?: number }) {
    const { page, limit, skip } = getPaginationOffset(params?.page, params?.limit, params?.offset);
    const where = { tournamentId };

    const [rows, total] = await Promise.all([
      this.prisma.tournamentSeason.findMany({
        where,
        take: limit,
        skip,
        orderBy: [{ startDate: 'desc' }],
      }),
      this.prisma.tournamentSeason.count({ where }),
    ]);

    const mapped = rows.map((s) => ({
      id: s.id,
      tournamentId: s.tournamentId,
      name: s.name,
      year: s.year,
      startDate: s.startDate,
      endDate: s.endDate,
    }));

    return createPaginatedResponse(mapped, total, page, limit);
  }

  async results(tournamentOrSeasonId: string, params?: { page?: number; limit?: number; offset?: number }) {
    const { page, limit, skip } = getPaginationOffset(params?.page, params?.limit, params?.offset);
    const where = { kind: 'tournament_results' as const, scopeKey: tournamentOrSeasonId };

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
}
