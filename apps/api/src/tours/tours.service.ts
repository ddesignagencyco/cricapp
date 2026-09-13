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
}

@Injectable()
export class ToursService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: {
    page?: number;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<TourSummary>> {
    const { page, limit, skip } = getPaginationOffset(
      query.page,
      query.limit,
      query.offset,
    );
    const [tours, total] = await Promise.all([
      this.prisma.tour.findMany({
        orderBy: [{ name: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.tour.count(),
    ]);
    const data = tours.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category as Record<string, unknown> | null,
      sport: t.sport as Record<string, unknown> | null,
    }));
    return createPaginatedResponse(data, total, page, limit);
  }
}