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
    sortBy?: string;
    sortOrder?: string;
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
    const dir = query.sortOrder === 'desc' ? 'desc' : 'asc';
    const [tours, total] = await Promise.all([
      this.prisma.tour.findMany({
        where,
        orderBy: [{ name: query.sortBy === 'name' || !query.sortBy ? dir : 'asc' }],
        ...(query.sortBy && query.sortBy !== 'name' ? {} : { skip, take: limit }),
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
    let data = tours.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category as Record<string, unknown> | null,
      sport: t.sport as Record<string, unknown> | null,
      tournamentCount: countById.get(String((t.category as { id?: unknown } | null)?.id ?? '')) ?? 0,
    }));
    if (query.sortBy && query.sortBy !== 'name') {
      const mul = dir === 'desc' ? -1 : 1;
      data.sort((a, b) => {
        if (query.sortBy === 'tournaments') {
          return (a.tournamentCount - b.tournamentCount) * mul || a.name.localeCompare(b.name);
        }
        const av =
          query.sortBy === 'country'
            ? String((a.category as { country_code?: string } | null)?.country_code || '')
            : String((a.sport as { name?: string } | null)?.name || 'Cricket');
        const bv =
          query.sortBy === 'country'
            ? String((b.category as { country_code?: string } | null)?.country_code || '')
            : String((b.sport as { name?: string } | null)?.name || 'Cricket');
        return av.localeCompare(bv) * mul || a.name.localeCompare(b.name);
      });
      data = data.slice(skip, skip + limit);
    }
    return createPaginatedResponse(data, total, page, limit);
  }
}