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

  async list(params?: {
    q?: string;
    format?: string;
    country?: string;
    status?: 'active' | 'upcoming' | 'recent';
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
    offset?: number;
  }) {
    const { page, limit, skip } = getPaginationOffset(params?.page, params?.limit, params?.offset);

    const allRows = await this.prisma.tournament.findMany({
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });

    const todayIso = new Date().toISOString().slice(0, 10);
    const currentYear = Number(todayIso.slice(0, 4));
    const q = params?.q?.trim().toLowerCase() || '';
    const formatFilter = params?.format?.trim().toUpperCase() || '';
    const countryFilter = params?.country?.trim().toLowerCase() || '';

    const seasonDates = (row: (typeof allRows)[number]) => {
      const s = (row.currentSeason ?? null) as Record<string, unknown> | null;
      const start = String(s?.startDate ?? s?.start_date ?? '').slice(0, 10);
      const end = String(s?.endDate ?? s?.end_date ?? '').slice(0, 10);
      const yearRaw = String(s?.year ?? '');
      const yearMatch = yearRaw.match(/\d{4}/) ?? row.name.match(/\b(20\d{2})\b/);
      const year = yearMatch ? Number(yearMatch[0]) : 0;
      return { start, end, year };
    };

    const categoryLabel = (row: (typeof allRows)[number]): string => {
      const c = (row.category ?? null) as Record<string, unknown> | null;
      const name = typeof c?.name === 'string' && c.name.trim() ? c.name.trim() : '';
      return name || 'International';
    };

    const categoryCode = (row: (typeof allRows)[number]): string => {
      const c = (row.category ?? null) as Record<string, unknown> | null;
      return typeof c?.country_code === 'string' ? c.country_code.trim().toLowerCase() : '';
    };

    // Base filter (search + status) for computing global facets across all pages
    const baseFiltered = allRows.filter((row) => {
      if (q && !row.name.toLowerCase().includes(q) && !categoryLabel(row).toLowerCase().includes(q)) {
        return false;
      }
      if (params?.status) {
        const { start, end, year } = seasonDates(row);
        if (params.status === 'active') {
          // Exclude past seasons that already ended before today, or old years with no end date
          if (end && end < todayIso) return false;
          if (!end && year > 0 && year < currentYear) return false;
          if (!end && !start && year === 0) return false;
        } else if (params.status === 'upcoming') {
          if (!start || start <= todayIso) return false;
        } else if (params.status === 'recent') {
          if (year > 0 && year < currentYear) return false;
        }
      }
      return true;
    });

    const formatCounts = new Map<string, number>();
    const categoryCounts = new Map<string, number>();
    for (const row of baseFiltered) {
      const fmt = (row.type || 'Other').toUpperCase();
      formatCounts.set(fmt, (formatCounts.get(fmt) || 0) + 1);
      const cat = categoryLabel(row);
      categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
    }

    const filtered = baseFiltered.filter((row) => {
      if (formatFilter && (row.type || 'Other').toUpperCase() !== formatFilter) return false;
      if (countryFilter) {
        const cat = categoryLabel(row).toLowerCase();
        const code = categoryCode(row);
        if (cat !== countryFilter && code !== countryFilter) return false;
      }
      return true;
    });

    const dir = params?.sortOrder === 'desc' ? -1 : 1;
    filtered.sort((a, b) => {
      if (params?.sortBy === 'latest') {
        const da = seasonDates(a);
        const db = seasonDates(b);
        const rank = (d: { start: string; end: string; year: number }) => {
          // 0 = currently live/ongoing, 1 = upcoming, 2 = recent current-year, 3 = older
          if (d.start && d.end && d.start <= todayIso && d.end >= todayIso) return 0;
          if (d.start && d.start > todayIso) return 1;
          if (d.year >= currentYear) return 2;
          return 3;
        };
        const ra = rank(da);
        const rb = rank(db);
        if (ra !== rb) return ra - rb;
        if (ra === 1) {
          // Soonest upcoming first
          return da.start.localeCompare(db.start) || a.name.localeCompare(b.name);
        }
        const keyA = da.end || da.start || `${da.year}`;
        const keyB = db.end || db.start || `${db.year}`;
        if (keyA !== keyB) return keyB.localeCompare(keyA);
        return a.name.localeCompare(b.name);
      }
      if (params?.sortBy === 'type') {
        const ta = a.type || '\uffff';
        const tb = b.type || '\uffff';
        return ta.localeCompare(tb) * dir || a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name) * dir || a.id.localeCompare(b.id);
    });

    const total = filtered.length;
    const pageRows = filtered.slice(skip, skip + limit);

    return {
      ...createPaginatedResponse(pageRows.map((t) => this.toSummary(t)), total, page, limit),
      facets: {
        formats: [...formatCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([key, count]) => ({ key, count })),
        categories: [...categoryCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([key, count]) => ({ key, count })),
      },
    };
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
