import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

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

  async dailySchedule(date: string): Promise<SportEventRecordSummary[]> {
    const rows = await this.prisma.sportEventRecord.findMany({
      where: { kind: 'daily_schedule', scopeKey: date },
      orderBy: [{ scheduled: 'asc' }],
    });
    return rows.map((r) => this.toSummary(r));
  }

  async dailyResults(date: string): Promise<SportEventRecordSummary[]> {
    const rows = await this.prisma.sportEventRecord.findMany({
      where: { kind: 'daily_results', scopeKey: date },
      orderBy: [{ scheduled: 'asc' }],
    });
    return rows.map((r) => this.toSummary(r));
  }
}