import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  getPaginationOffset,
  createPaginatedResponse,
} from '../common/pagination/pagination.util.js';
import type { CreateNewsDto, UpdateNewsDto, NewsListQuery } from './dto/news.dto.js';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export interface NewsArticleSummary {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  imageUrl: string | null;
  author: string | null;
  source: string | null;
  categoryId: string | null;
  tags: string[] | null;
  publishedAt: Date | null;
  isPublished: boolean;
  createdAt: Date;
  category: { id: string; name: string; slug: string } | null;
}

@Injectable()
export class NewsService {
  constructor(private readonly prisma: PrismaService) {}

  private toSummary(row: any): NewsArticleSummary {
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      summary: row.summary,
      content: row.content,
      imageUrl: row.imageUrl,
      author: row.author,
      source: row.source,
      categoryId: row.categoryId,
      tags: row.tags as string[] | null,
      publishedAt: row.publishedAt,
      isPublished: row.isPublished,
      createdAt: row.createdAt,
      category: row.category
        ? { id: row.category.id, name: row.category.name, slug: row.category.slug }
        : null,
    };
  }

  async list(query: NewsListQuery) {
    const { page, limit, skip } = getPaginationOffset(query.page, query.limit, query.offset);

    const where: any = {};
    if (query.category) {
      where.category = { slug: query.category };
    }
    if (query.tag) {
      where.tags = { path: [query.tag], not: null };
    }
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { summary: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.newsArticle.findMany({
        where,
        include: { category: true },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.newsArticle.count({ where }),
    ]);

    return createPaginatedResponse(rows.map((r) => this.toSummary(r)), total, page, limit);
  }

  async getByIdOrSlug(idOrSlug: string) {
    const row = await this.prisma.newsArticle.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: { category: true },
    });
    if (!row) throw new NotFoundException(`Article ${idOrSlug} not found`);
    return this.toSummary(row);
  }

  private async validateCategory(categoryId?: string) {
    if (!categoryId) return;
    const category = await this.prisma.newsCategory.findUnique({ where: { id: categoryId } });
    if (!category) throw new BadRequestException(`Category ${categoryId} does not exist`);
  }

  async create(dto: CreateNewsDto, _userId: string) {
    const slug = slugify(dto.title);
    const existing = await this.prisma.newsArticle.findUnique({ where: { slug } });
    if (existing) throw new BadRequestException('An article with this title already exists');

    await this.validateCategory(dto.categoryId);

    const publishedAt = dto.isPublished ? new Date() : null;

    const row = await this.prisma.newsArticle.create({
      data: {
        title: dto.title,
        slug,
        summary: dto.summary,
        content: dto.content,
        imageUrl: dto.imageUrl,
        author: dto.author,
        source: dto.source,
        categoryId: dto.categoryId,
        tags: dto.tags ?? [],
        isPublished: dto.isPublished ?? false,
        publishedAt,
      },
      include: { category: true },
    });
    return this.toSummary(row);
  }

  async update(id: string, dto: UpdateNewsDto) {
    const existing = await this.prisma.newsArticle.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Article ${id} not found`);

    await this.validateCategory(dto.categoryId);

    const data: any = { ...dto };
    if (dto.title) data.slug = slugify(dto.title);
    if (dto.isPublished && !existing.isPublished) data.publishedAt = new Date();

    const row = await this.prisma.newsArticle.update({
      where: { id },
      data,
      include: { category: true },
    });
    return this.toSummary(row);
  }

  async remove(id: string) {
    const existing = await this.prisma.newsArticle.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Article ${id} not found`);
    await this.prisma.newsArticle.delete({ where: { id } });
    return { deleted: true };
  }

  async listCategories() {
    return this.prisma.newsCategory.findMany({ orderBy: { name: 'asc' } });
  }

  async createCategory(name: string) {
    const slug = slugify(name);
    const existing = await this.prisma.newsCategory.findFirst({
      where: { OR: [{ name }, { slug }] },
    });
    if (existing) throw new BadRequestException(`Category '${name}' already exists`);
    return this.prisma.newsCategory.create({ data: { name, slug } });
  }
}
