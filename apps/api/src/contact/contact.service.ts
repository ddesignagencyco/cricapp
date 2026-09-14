import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  createPaginatedResponse,
  getPaginationOffset,
} from '../common/pagination/pagination.util.js';
import type {
  ContactListQuery,
  CreateContactDto,
  UpdateContactStatusDto,
} from './dto/contact.dto.js';

@Injectable()
export class ContactService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateContactDto) {
    const submission = await this.prisma.contactSubmission.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.trim().toLowerCase(),
        message: dto.message.trim(),
      },
      select: { id: true, createdAt: true },
    });
    return {
      message: 'Your message has been received.',
      submission,
    };
  }

  async list(query: ContactListQuery) {
    const { page, limit, skip } = getPaginationOffset(
      query.page,
      query.limit,
      query.offset,
    );
    const where = query.status ? { status: query.status } : {};
    const [rows, total] = await Promise.all([
      this.prisma.contactSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.contactSubmission.count({ where }),
    ]);
    return createPaginatedResponse(rows, total, page, limit);
  }

  async updateStatus(id: string, dto: UpdateContactStatusDto) {
    const exists = await this.prisma.contactSubmission.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Contact submission not found');
    return this.prisma.contactSubmission.update({
      where: { id },
      data: { status: dto.status },
    });
  }
}
