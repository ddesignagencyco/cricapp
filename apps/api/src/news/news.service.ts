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
import type {
  CreateNewsDto,
  UpdateNewsDto,
  NewsListQuery,
  CreateAuthorDto,
  UpdateAuthorDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/news.dto.js';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const articleInclude = {
  category: true,
  authorRef: true,
  linkedPlayers: { select: { playerId: true } },
  linkedTeams: { select: { teamId: true } },
  linkedMatches: { select: { matchId: true } },
  linkedSeries: { select: { tournamentId: true } },
} as const;

@Injectable()
export class NewsService {
  constructor(private readonly prisma: PrismaService) {}

  private validateTitle(title: string): void {
    const wordCount = title.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount === 0 || wordCount > 50) {
      throw new BadRequestException('Article title must contain between 1 and 50 words');
    }
  }

  private toSummary(row: any) {
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      summary: row.summary,
      content: row.content,
      imageUrl: row.imageUrl,
      author: row.author,
      authorId: row.authorId,
      source: row.source,
      categoryId: row.categoryId,
      language: row.language ?? 'en',
      metaTitle: row.metaTitle,
      metaDescription: row.metaDescription,
      canonicalUrl: row.canonicalUrl,
      publishedAt: row.publishedAt,
      isPublished: row.isPublished,
      createdAt: row.createdAt,
      category: row.category
        ? { id: row.category.id, name: row.category.name, slug: row.category.slug }
        : null,
      authorRef: row.authorRef
        ? {
            id: row.authorRef.id,
            name: row.authorRef.name,
            slug: row.authorRef.slug,
            bio: row.authorRef.bio,
            avatarUrl: row.authorRef.avatarUrl,
          }
        : null,
      playerIds: row.linkedPlayers?.map((p: { playerId: string }) => p.playerId) ?? [],
      teamIds: row.linkedTeams?.map((t: { teamId: string }) => t.teamId) ?? [],
      matchIds: row.linkedMatches?.map((m: { matchId: string }) => m.matchId) ?? [],
      seriesIds: row.linkedSeries?.map((s: { tournamentId: string }) => s.tournamentId) ?? [],
    };
  }

  private buildWhere(query: NewsListQuery, opts?: { includeUnpublished?: boolean }) {
    const where: Record<string, unknown> = {};
    if (!opts?.includeUnpublished) {
      where.isPublished = true;
    }
    if (query.category) {
      where.category = { slug: query.category };
    }
    if (query.language) {
      where.language = query.language;
    }
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { summary: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.playerId) {
      where.linkedPlayers = { some: { playerId: query.playerId } };
    }
    if (query.teamId) {
      where.linkedTeams = { some: { teamId: query.teamId } };
    }
    if (query.matchId) {
      where.linkedMatches = { some: { matchId: query.matchId } };
    }
    if (query.seriesId) {
      where.linkedSeries = { some: { tournamentId: query.seriesId } };
    }
    return where;
  }

  async list(query: NewsListQuery, opts?: { includeUnpublished?: boolean }) {
    const { page, limit, skip } = getPaginationOffset(query.page, query.limit, query.offset);
    const where = this.buildWhere(query, opts);

    const [rows, total] = await Promise.all([
      this.prisma.newsArticle.findMany({
        where,
        include: articleInclude,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.newsArticle.count({ where }),
    ]);

    return createPaginatedResponse(rows.map((r) => this.toSummary(r)), total, page, limit);
  }

  async getByIdOrSlug(idOrSlug: string, opts?: { includeUnpublished?: boolean }) {
    const row = await this.prisma.newsArticle.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        ...(opts?.includeUnpublished ? {} : { isPublished: true }),
      },
      include: articleInclude,
    });
    if (!row) throw new NotFoundException(`Article ${idOrSlug} not found`);
    return this.toSummary(row);
  }

  private async validateCategory(categoryId?: string) {
    if (!categoryId) return;
    const category = await this.prisma.newsCategory.findUnique({ where: { id: categoryId } });
    if (!category) throw new BadRequestException(`Category ${categoryId} does not exist`);
  }

  private async validateAuthor(authorId?: string) {
    if (!authorId) return;
    const author = await this.prisma.author.findUnique({ where: { id: authorId } });
    if (!author) throw new BadRequestException(`Author ${authorId} does not exist`);
  }

  private entityLinkData(dto: CreateNewsDto | UpdateNewsDto) {
    const data: Record<string, unknown> = {};
    if (dto.playerIds !== undefined) {
      data.linkedPlayers = {
        deleteMany: {},
        create: dto.playerIds.map((playerId) => ({ playerId })),
      };
    }
    if (dto.teamIds !== undefined) {
      data.linkedTeams = {
        deleteMany: {},
        create: dto.teamIds.map((teamId) => ({ teamId })),
      };
    }
    if (dto.matchIds !== undefined) {
      data.linkedMatches = {
        deleteMany: {},
        create: dto.matchIds.map((matchId) => ({ matchId })),
      };
    }
    if (dto.seriesIds !== undefined) {
      data.linkedSeries = {
        deleteMany: {},
        create: dto.seriesIds.map((tournamentId) => ({ tournamentId })),
      };
    }
    return data;
  }

  private articleScalars(dto: CreateNewsDto | UpdateNewsDto) {
    const {
      playerIds: _p,
      teamIds: _t,
      matchIds: _m,
      seriesIds: _s,
      ...scalars
    } = dto as CreateNewsDto;
    return scalars;
  }

  async create(dto: CreateNewsDto, _userId: string) {
    this.validateTitle(dto.title);
    const slug = dto.slug ?? slugify(dto.title);
    const existing = await this.prisma.newsArticle.findUnique({ where: { slug } });
    if (existing) throw new BadRequestException('An article with this title already exists');

    await this.validateCategory(dto.categoryId);
    await this.validateAuthor(dto.authorId);

    const publishedAt = dto.isPublished ? new Date() : null;
    const scalars = this.articleScalars(dto);

    const row = await this.prisma.newsArticle.create({
      data: {
        ...scalars,
        slug,
        language: dto.language ?? 'en',
        isPublished: dto.isPublished ?? false,
        publishedAt,
        ...this.entityLinkData(dto),
      },
      include: articleInclude,
    });
    return this.toSummary(row);
  }

  async update(id: string, dto: UpdateNewsDto) {
    const existing = await this.prisma.newsArticle.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Article ${id} not found`);

    await this.validateCategory(dto.categoryId);
    await this.validateAuthor(dto.authorId);

    if (dto.title) this.validateTitle(dto.title);
    const scalars = this.articleScalars(dto);
    const data: Record<string, unknown> = { ...scalars };
    if (dto.slug || dto.title) data.slug = dto.slug ?? slugify(dto.title!);
    if (data.slug && data.slug !== existing.slug) {
      const slugOwner = await this.prisma.newsArticle.findUnique({
        where: { slug: data.slug as string },
      });
      if (slugOwner) throw new BadRequestException('Article slug is already in use');
    }
    if (dto.isPublished && !existing.isPublished) data.publishedAt = new Date();
    Object.assign(data, this.entityLinkData(dto));

    const row = await this.prisma.newsArticle.update({
      where: { id },
      data,
      include: articleInclude,
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

  async getCategory(idOrSlug: string) {
    const category = await this.prisma.newsCategory.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    });
    if (!category) throw new NotFoundException(`Category ${idOrSlug} not found`);
    return category;
  }

  async createCategory(dto: CreateCategoryDto) {
    const slug = dto.slug ?? slugify(dto.name);
    const existing = await this.prisma.newsCategory.findFirst({
      where: { OR: [{ name: dto.name }, { slug }] },
    });
    if (existing) throw new BadRequestException(`Category '${dto.name}' already exists`);
    return this.prisma.newsCategory.create({ data: { name: dto.name, slug } });
  }

  async updateCategory(idOrSlug: string, dto: UpdateCategoryDto) {
    const category = await this.getCategory(idOrSlug);
    const slug = dto.slug ?? (dto.name ? slugify(dto.name) : undefined);
    if (dto.name || slug) {
      const duplicate = await this.prisma.newsCategory.findFirst({
        where: {
          id: { not: category.id },
          OR: [
            ...(dto.name ? [{ name: dto.name }] : []),
            ...(slug ? [{ slug }] : []),
          ],
        },
      });
      if (duplicate) throw new BadRequestException('Category name or slug is already in use');
    }
    return this.prisma.newsCategory.update({
      where: { id: category.id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(slug !== undefined && { slug }),
      },
    });
  }

  async removeCategory(idOrSlug: string) {
    const category = await this.getCategory(idOrSlug);
    await this.prisma.newsCategory.delete({ where: { id: category.id } });
    return { deleted: true };
  }

  async listAuthors() {
    return this.prisma.author.findMany({ orderBy: { name: 'asc' } });
  }

  async createAuthor(dto: CreateAuthorDto) {
    const slug = slugify(dto.name);
    const existing = await this.prisma.author.findFirst({
      where: { OR: [{ name: dto.name }, { slug }] },
    });
    if (existing) throw new BadRequestException(`Author '${dto.name}' already exists`);
    return this.prisma.author.create({
      data: { name: dto.name, slug, bio: dto.bio, avatarUrl: dto.avatarUrl },
    });
  }

  async updateAuthor(id: string, dto: UpdateAuthorDto) {
    const author = await this.prisma.author.findUnique({ where: { id } });
    if (!author) throw new NotFoundException(`Author ${id} not found`);

    const data: Record<string, unknown> = { ...dto };
    if (dto.name) data.slug = slugify(dto.name);

    return this.prisma.author.update({ where: { id }, data });
  }
}
