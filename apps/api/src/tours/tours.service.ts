import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  createPaginatedResponse,
  getPaginationOffset,
  type PaginatedResponse,
} from '../common/pagination/pagination.util.js';

export interface TourSummary {
  id: string;
  name: string;
  category: Record<string, unknown> | null;
  sport: Record<string, unknown> | null;
  /** Tournaments filed under this tour's category (tournaments.tour_id is not populated). */
  tournamentCount: number;
}

@Injectable()
export class ToursService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: {
    page?: number;
    limit?: number;
    offset?: number;
    q?: string;
  }): Promise<PaginatedResponse<TourSummary>> {
    const { page, limit, skip } = getPaginationOffset(
      query.page,
      query.limit,
      query.offset,
    );
    const q = query.q?.trim();
    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { category: { path: ['country_code'], string_contains: q.toUpperCase() } },
          ],
        }
      : {};
    const [tours, total] = await Promise.all([
      this.prisma.tour.findMany({
        where,
        orderBy: [{ name: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.tour.count({ where }),
    ]);
    const categoryIds = tours
      .map((t) => (t.category as { id?: unknown } | null)?.id)
      .filter((id): id is string => typeof id === 'string');
    const counts = categoryIds.length
      ? await this.prisma.$queryRawUnsafe<{ id: string; n: number }[]>(
          `SELECT category->>'id' AS id, count(*)::int AS n FROM tournaments
            WHERE category->>'id' = ANY($1::text[]) GROUP BY 1`,
          categoryIds,
        )
      : [];
    const countById = new Map(counts.map((c) => [c.id, c.n]));
    const data = tours.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category as Record<string, unknown> | null,
      sport: t.sport as Record<string, unknown> | null,
      tournamentCount: countById.get(String((t.category as { id?: unknown } | null)?.id ?? '')) ?? 0,
    }));
    return createPaginatedResponse(data, total, page, limit);
  }
}