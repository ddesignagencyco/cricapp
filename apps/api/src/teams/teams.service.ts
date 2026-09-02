import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface TeamSummary {
  id: string;
  name: string;
  abbr: string;
  country: string | null;
  logoUrl: string | null;
}

export interface PlayerSummaryDto {
  id: string;
  fullName: string;
  shortName: string | null;
  role: string | null;
  nationality: string | null;
}

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<TeamSummary[]> {
    const teams = await this.prisma.team.findMany({
      orderBy: [{ name: 'asc' }],
    });
    return teams.map((t) => ({
      id: t.id,
      name: t.name,
      abbr: t.abbr,
      country: t.country,
      logoUrl: t.logoUrl,
    }));
  }

  async getProfile(idOrAbbr: string): Promise<TeamSummary> {
    const team = await this.prisma.team.findFirst({
      where: {
        OR: [{ id: idOrAbbr }, { abbr: idOrAbbr }],
      },
    });
    if (!team) {
      throw new NotFoundException(`Team ${idOrAbbr} not found`);
    }
    return {
      id: team.id,
      name: team.name,
      abbr: team.abbr,
      country: team.country,
      logoUrl: team.logoUrl,
    };
  }

  async getRoster(idOrAbbr: string): Promise<PlayerSummaryDto[]> {
    const team = await this.getProfile(idOrAbbr);
    const players = await this.prisma.player.findMany({
      where: { teamId: team.id },
      orderBy: [{ fullName: 'asc' }],
    });
    return players.map((p) => ({
      id: p.id,
      fullName: p.fullName,
      shortName: p.shortName,
      role: p.role,
      nationality: p.nationality,
    }));
  }
}
