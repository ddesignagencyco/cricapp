import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { SportradarService } from '../sportradar/sportradar.service.js';
import { normalizeHeadToHeadPayload } from './h2h-payload.util.js';

export interface HeadToHeadResult {
  teamAId: string;
  teamBId: string;
  payload: Record<string, unknown>;
}

@Injectable()
export class HeadToHeadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sportradar: SportradarService,
  ) {}

  async get(teamAId: string, teamBId: string): Promise<HeadToHeadResult> {
    const [a, b] = [teamAId, teamBId].sort();
    let row = await this.prisma.headToHead.findUnique({
      where: { teamAId_teamBId: { teamAId: a, teamBId: b } },
    });

    if (!row || !this.payloadHasMeetings(row.payload as Record<string, unknown>)) {
      row = (await this.fetchAndPersist(a, b)) ?? row;
    }

    if (!row) {
      throw new NotFoundException(
        `No head-to-head records found for ${teamAId} vs ${teamBId}`,
      );
    }

    return {
      teamAId: row.teamAId,
      teamBId: row.teamBId,
      payload: normalizeHeadToHeadPayload(row.payload as Record<string, unknown>),
    };
  }

  private payloadHasMeetings(payload: Record<string, unknown>): boolean {
    const normalized = normalizeHeadToHeadPayload(payload);
    const last = normalized.last_meetings;
    const next = normalized.next_meetings;
    return (
      (Array.isArray(last) && last.length > 0) ||
      (Array.isArray(next) && next.length > 0)
    );
  }

  private async fetchAndPersist(teamAId: string, teamBId: string) {
    if (!this.sportradar.isConfigured) return null;
    try {
      const raw = await this.sportradar.fetchTeamVersusTeam(teamAId, teamBId);
      const payload = normalizeHeadToHeadPayload(raw);
      return await this.prisma.headToHead.upsert({
        where: { teamAId_teamBId: { teamAId, teamBId } },
        create: {
          teamAId,
          teamBId,
          payload: payload as Prisma.InputJsonValue,
        },
        update: {
          payload: payload as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      if (err instanceof ServiceUnavailableException) return null;
      throw err;
    }
  }
}
