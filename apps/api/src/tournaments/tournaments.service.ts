import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

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

  async list(): Promise<TournamentSummary[]> {
    const rows = await this.prisma.tournament.findMany({
      orderBy: [{ name: 'asc' }],
    });
    return rows.map((t) => this.toSummary(t));
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

  async seasons(tournamentId: string): Promise<TournamentSeasonSummary[]> {
    const rows = await this.prisma.tournamentSeason.findMany({
      where: { tournamentId },
      orderBy: [{ startDate: 'desc' }],
    });
    return rows.map((s) => ({
      id: s.id,
      tournamentId: s.tournamentId,
      name: s.name,
      year: s.year,
      startDate: s.startDate,
      endDate: s.endDate,
    }));
  }

  async results(tournamentOrSeasonId: string): Promise<SportEventRecordSummary[]> {
    const rows = await this.prisma.sportEventRecord.findMany({
      where: { kind: 'tournament_results', scopeKey: tournamentOrSeasonId },
      orderBy: [{ scheduled: 'asc' }],
    });
    return rows.map((r) => this.toSportEvent(r));
  }

  private toSportEvent(row: {
    kind: string;
    scopeKey: string;
    eventId: string;
    status: string | null;
    scheduled: string | null;
    payload: unknown;
  }): SportEventRecordSummary {
    return {
      kind: row.kind,
      scopeKey: row.scopeKey,
      eventId: row.eventId,
      status: row.status,
      scheduled: row.scheduled,
      payload: row.payload as Record<string, unknown>,
    };
  }
}