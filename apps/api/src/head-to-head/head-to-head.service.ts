import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface HeadToHeadResult {
  teamAId: string;
  teamBId: string;
  payload: Record<string, unknown>;
}

@Injectable()
export class HeadToHeadService {
  constructor(private readonly prisma: PrismaService) {}

  async get(teamAId: string, teamBId: string): Promise<HeadToHeadResult> {
    const [a, b] = [teamAId, teamBId].sort();
    const row = await this.prisma.headToHead.findUnique({
      where: { teamAId_teamBId: { teamAId: a, teamBId: b } },
    });
    if (!row) {
      throw new NotFoundException(
        `No head-to-head records found for ${teamAId} vs ${teamBId}`,
      );
    }
    return {
      teamAId: row.teamAId,
      teamBId: row.teamBId,
      payload: row.payload as Record<string, unknown>,
    };
  }
}