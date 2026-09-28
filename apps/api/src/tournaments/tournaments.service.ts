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
  groups: Record<string, unknown>[] | null;
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
    groups: unknown;
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
      groups: (row.groups as Record<string, unknown>[] | null) ?? null,
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

  /**
   * Tournament Detail endpoint — /tournaments/{tournament_or_season_id}/info.json.
   * Serves the raw Sportradar payload stored by the ingestion pipeline; falls
   * back to composing a payload from the tournaments row when no raw payload
   * has been stored yet.
   */
  async info(tournamentOrSeasonId: string): Promise<Record<string, unknown>> {
    const [asTournament, asSeason] = await Promise.all([
      this.prisma.tournament.findUnique({ where: { id: tournamentOrSeasonId } }),
      this.prisma.tournamentSeason.findUnique({
        where: { id: tournamentOrSeasonId },
        select: { tournamentId: true },
      }),
    ]);
    const tournamentId = asTournament?.id ?? asSeason?.tournamentId;
    if (!tournamentId) {
      throw new NotFoundException(
        `Tournament or season ${tournamentOrSeasonId} not found`,
      );
    }

    const stored = await this.prisma.tournamentInfo.findUnique({
      where: { tournamentId },
    });
    if (stored) {
      return stored.payload as Record<string, unknown>;
    }

    const tournament = asTournament ?? (await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    }));
    if (!tournament) {
      throw new NotFoundException(`Tournament ${tournamentId} not found`);
    }
    const currentSeason = tournament.currentSeason as Record<string, unknown> | null;
    return {
      generated_at: new Date().toISOString(),
      tournament: {
        id: tournament.id,
        name: tournament.name,
        type: tournament.type,
        gender: tournament.gender,
        category: tournament.category,
        current_season: currentSeason,
        sport: tournament.sport,
        tour_id: tournament.tourId,
        parent_id: tournament.parentId,
      },
      groups: tournament.groups,
    };
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
