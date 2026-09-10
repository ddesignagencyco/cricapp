import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  getPaginationOffset,
  createPaginatedResponse,
} from '../common/pagination/pagination.util.js';
import type { CreateStreamDto, UpdateStreamDto, StreamListQuery } from './dto/streams.dto.js';

export interface LiveStreamSummary {
  id: string;
  title: string;
  matchId: string | null;
  streamUrl: string;
  provider: string | null;
  thumbnailUrl: string | null;
  status: string;
  scheduledAt: Date | null;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class StreamsService {
  constructor(private readonly prisma: PrismaService) {}

  private toSummary(row: any): LiveStreamSummary {
    return {
      id: row.id,
      title: row.title,
      matchId: row.matchId,
      streamUrl: row.streamUrl,
      provider: row.provider,
      thumbnailUrl: row.thumbnailUrl,
      status: row.status,
      scheduledAt: row.scheduledAt,
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      createdAt: row.createdAt,
    };
  }

  async list(query: StreamListQuery) {
    const { page, limit, skip } = getPaginationOffset(query.page, query.limit, query.offset);

    const where: any = {};
    if (query.status) where.status = query.status;

    const [rows, total] = await Promise.all([
      this.prisma.liveStream.findMany({
        where,
        orderBy: { scheduledAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.liveStream.count({ where }),
    ]);

    return createPaginatedResponse(rows.map((r) => this.toSummary(r)), total, page, limit);
  }

  async getById(id: string) {
    const row = await this.prisma.liveStream.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Stream ${id} not found`);
    return this.toSummary(row);
  }

  async create(dto: CreateStreamDto) {
    const row = await this.prisma.liveStream.create({
      data: {
        title: dto.title,
        matchId: dto.matchId,
        streamUrl: dto.streamUrl,
        provider: dto.provider,
        thumbnailUrl: dto.thumbnailUrl,
        status: dto.status ?? 'upcoming',
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      },
    });
    return this.toSummary(row);
  }

  async update(id: string, dto: UpdateStreamDto) {
    const existing = await this.prisma.liveStream.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Stream ${id} not found`);

    const data: any = { ...dto };
    if (dto.scheduledAt) data.scheduledAt = new Date(dto.scheduledAt);
    if (dto.status === 'live' && existing.status !== 'live') data.startedAt = new Date();
    if (dto.status === 'ended' && existing.status !== 'ended') data.endedAt = new Date();

    const row = await this.prisma.liveStream.update({ where: { id }, data });
    return this.toSummary(row);
  }

  async remove(id: string) {
    const existing = await this.prisma.liveStream.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Stream ${id} not found`);
    await this.prisma.liveStream.delete({ where: { id } });
    return { deleted: true };
  }
}
