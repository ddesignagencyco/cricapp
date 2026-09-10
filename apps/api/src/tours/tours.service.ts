import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface TourSummary {
  id: string;
  name: string;
  category: Record<string, unknown> | null;
  sport: Record<string, unknown> | null;
}

@Injectable()
export class ToursService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<TourSummary[]> {
    const tours = await this.prisma.tour.findMany({
      orderBy: [{ name: 'asc' }],
    });
    return tours.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category as Record<string, unknown> | null,
      sport: t.sport as Record<string, unknown> | null,
    }));
  }
}