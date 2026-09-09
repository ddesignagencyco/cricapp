import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  getPaginationOffset,
  createPaginatedResponse,
} from '../common/pagination/pagination.util.js';

export interface SportEventRecordSummary {
  kind: string;
  scopeKey: string;
  eventId: string;
  status: string | null;
  scheduled: string | null;
  payload: Record<string, unknown>;
}

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  private toSummary(row: {
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

  async dailySchedule(date: string, params?: { page?: number; limit?: number; offset?: number }) {
    const { page, limit, skip } = getPaginationOffset(params?.page, params?.limit, params?.offset);
    const where = { kind: 'daily_schedule' as const, scopeKey: date };

    const [rows, total] = await Promise.all([
      this.prisma.sportEventRecord.findMany({
        where,
        orderBy: [{ scheduled: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.sportEventRecord.count({ where }),
    ]);

    return createPaginatedResponse(rows.map((r) => this.toSummary(r)), total, page, limit);
  }

  async dailyResults(date: string, params?: { page?: number; limit?: number; offset?: number }) {
    const { page, limit, skip } = getPaginationOffset(params?.page, params?.limit, params?.offset);
    const where = { kind: 'daily_results' as const, scopeKey: date };

    const [rows, total] = await Promise.all([
      this.prisma.sportEventRecord.findMany({
        where,
        orderBy: [{ scheduled: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.sportEventRecord.count({ where }),
    ]);

    return createPaginatedResponse(rows.map((r) => this.toSummary(r)), total, page, limit);
  }
}
