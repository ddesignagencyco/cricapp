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
    category?: string;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const { page, limit, skip } = getPaginationOffset(
      query.page,
      query.limit,
      query.offset,
    );
    const q = query.q?.trim().toLowerCase() || '';
    const categoryFilter = query.category?.trim().toLowerCase() || '';

    const allTours = await this.prisma.tour.findMany({
      orderBy: [{ name: 'asc' }],
    });

    const catNameOf = (t: (typeof allTours)[number]): string => {
      const c = t.category as { name?: unknown } | null;
      return typeof c?.name === 'string' && c.name.trim() ? c.name.trim() : 'International';
    };

    const baseFiltered = allTours.filter((t) => {
      if (!q) return true;
      const c = t.category as { name?: unknown; country_code?: unknown } | null;
      const s = t.sport as { name?: unknown } | null;
      return (
        t.name.toLowerCase().includes(q) ||
        String(c?.name ?? '').toLowerCase().includes(q) ||
        String(c?.country_code ?? '').toLowerCase().includes(q) ||
        String(s?.name ?? '').toLowerCase().includes(q)
      );
    });

    const categoryCounts = new Map<string, number>();
    for (const t of baseFiltered) {
      const cat = catNameOf(t);
      categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
    }

    const filtered = categoryFilter
      ? baseFiltered.filter((t) => catNameOf(t).toLowerCase() === categoryFilter)
      : baseFiltered;

    const categoryIds = filtered
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

    const dir = query.sortOrder === 'desc' ? -1 : 1;
    const mapped: TourSummary[] = filtered.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category as Record<string, unknown> | null,
      sport: t.sport as Record<string, unknown> | null,
      tournamentCount: countById.get(String((t.category as { id?: unknown } | null)?.id ?? '')) ?? 0,
    }));

    mapped.sort((a, b) => {
      if (query.sortBy === 'tournaments') {
        return (a.tournamentCount - b.tournamentCount) * dir || a.name.localeCompare(b.name);
      }
      if (query.sortBy === 'country') {
        const av = String((a.category as { country_code?: string } | null)?.country_code || '');
        const bv = String((b.category as { country_code?: string } | null)?.country_code || '');
        return av.localeCompare(bv) * dir || a.name.localeCompare(b.name);
      }
      if (query.sortBy === 'sport') {
        const av = String((a.sport as { name?: string } | null)?.name || 'Cricket');
        const bv = String((b.sport as { name?: string } | null)?.name || 'Cricket');
        return av.localeCompare(bv) * dir || a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name) * dir;
    });

    const total = mapped.length;
    const pageRows = mapped.slice(skip, skip + limit);
    return {
      ...createPaginatedResponse(pageRows, total, page, limit),
      facets: {
        categories: [...categoryCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([key, count]) => ({ key, count })),
      },
    };
  }
}