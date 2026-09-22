import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { GalleryService } from '../gallery/gallery.service.js';
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
  UpsertEditorialPageDto,
  AuthorArticlesQuery,
} from './dto/news.dto.js';

function slugify(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly gallery: GalleryService,
  ) {}

  private async syncEditorialCover(imageUrl: string | null | undefined) {
    await this.gallery.markEditorialByUrl(imageUrl);
  }

  private validateTitle(title: string): void {
    const wordCount = title.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount === 0 || wordCount > 50) {
      throw new BadRequestException('Article title must contain between 1 and 50 words');
    }
  }

  private articleHref(language: string, slug: string): string {
    const baseUrl = this.config
      .get<string>('PUBLIC_WEB_URL', 'https://pakcriczone.com')
      .replace(/\/$/, '');
    return `${baseUrl}${language === 'ur' ? '/ur' : ''}/news/${encodeURIComponent(slug)}`;
  }

  private toSummary(
    row: any,
    variants: any[] = [],
    includeEditorialDrafts = false,
  ) {
    const translatedRows = variants.length ? variants : [row];
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
      translationGroupId: row.translationGroupId,
      ...(includeEditorialDrafts
        ? {
            pushNotificationTitle: row.pushNotificationTitle,
            pushNotificationBody: row.pushNotificationBody,
            socialCopy: row.socialCopy,
          }
        : {}),
      translations: translatedRows.map((variant) => ({
        language: variant.language,
        slug: variant.slug,
        href: this.articleHref(variant.language, variant.slug),
      })),
      publishedAt: row.publishedAt,
      isPublished: row.isPublished,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
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

  private async translationVariants(rows: any[]) {
    const groupIds = [
      ...new Set(rows.map((row) => row.translationGroupId).filter(Boolean)),
    ] as string[];
    if (!groupIds.length) return new Map<string, any[]>();
    const variants = await this.prisma.newsArticle.findMany({
      where: {
        translationGroupId: { in: groupIds },
        isPublished: true,
      },
      select: { translationGroupId: true, language: true, slug: true },
      orderBy: { language: 'asc' },
    });
    const grouped = new Map<string, any[]>();
    for (const variant of variants) {
      const group = grouped.get(variant.translationGroupId!) ?? [];
      group.push(variant);
      grouped.set(variant.translationGroupId!, group);
    }
    return grouped;
  }

  private async summarize(row: any, includeEditorialDrafts = false) {
    const grouped = await this.translationVariants([row]);
    return this.toSummary(
      row,
      row.translationGroupId ? grouped.get(row.translationGroupId) : undefined,
      includeEditorialDrafts,
    );
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
    if (query.authorId) {
      where.authorId = query.authorId;
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

    const grouped = await this.translationVariants(rows);
    return createPaginatedResponse(
      rows.map((row) =>
        this.toSummary(
          row,
          row.translationGroupId
            ? grouped.get(row.translationGroupId)
            : undefined,
          opts?.includeUnpublished ?? false,
        ),
      ),
      total,
      page,
      limit,
    );
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
    return this.summarize(row);
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

  private async validateTranslationGroup(
    translationGroupId: string | undefined,
    language: string | undefined,
    excludeId?: string,
  ) {
    if (!translationGroupId) return;
    const duplicate = await this.prisma.newsArticle.findFirst({
      where: {
        translationGroupId,
        language: language ?? 'en',
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (duplicate) {
      throw new BadRequestException(
        `This translation group already has a ${language ?? 'en'} article`,
      );
    }
  }

  private entityLinkData(
    dto: CreateNewsDto | UpdateNewsDto,
    mode: 'create' | 'update',
  ) {
    const nest = (ids: string[] | undefined, key: string) => {
      if (ids === undefined) return undefined;
      const create = ids.map((id) => ({ [key]: id }));
      return mode === 'update' ? { deleteMany: {}, create } : { create };
    };

    return {
      ...(dto.playerIds !== undefined && {
        linkedPlayers: nest(dto.playerIds, 'playerId'),
      }),
      ...(dto.teamIds !== undefined && {
        linkedTeams: nest(dto.teamIds, 'teamId'),
      }),
      ...(dto.matchIds !== undefined && {
        linkedMatches: nest(dto.matchIds, 'matchId'),
      }),
      ...(dto.seriesIds !== undefined && {
        linkedSeries: nest(dto.seriesIds, 'tournamentId'),
      }),
    };
  }

  private articleScalars(dto: CreateNewsDto | UpdateNewsDto) {
    const {
      playerIds: _p,
      teamIds: _t,
      matchIds: _m,
      seriesIds: _s,
      ...scalars
    } = dto as CreateNewsDto;
    return Object.fromEntries(
      Object.entries(scalars).filter(([, value]) => value !== undefined && value !== ''),
    );
  }

  private async validateLinkedEntities(dto: CreateNewsDto | UpdateNewsDto) {
    const missing = async (
      ids: string[] | undefined,
      label: string,
      count: (ids: string[]) => Promise<number>,
    ) => {
      if (!ids?.length) return;
      const unique = [...new Set(ids)];
      if (unique.length !== (await count(unique))) {
        throw new BadRequestException(`One or more ${label} ids are invalid`);
      }
    };

    await missing(dto.playerIds, 'player', (ids) =>
      this.prisma.player.count({ where: { id: { in: ids } } }),
    );
    await missing(dto.teamIds, 'team', (ids) =>
      this.prisma.team.count({ where: { id: { in: ids } } }),
    );
    await missing(dto.matchIds, 'match', (ids) =>
      this.prisma.match.count({ where: { matchId: { in: ids } } }),
    );
    await missing(dto.seriesIds, 'series', (ids) =>
      this.prisma.tournament.count({ where: { id: { in: ids } } }),
    );
  }

  async create(dto: CreateNewsDto, _userId: string) {
    this.validateTitle(dto.title);
    const slug = dto.slug ?? slugify(dto.title);
    const existing = await this.prisma.newsArticle.findUnique({ where: { slug } });
    if (existing) throw new BadRequestException('An article with this title already exists');

    await this.validateCategory(dto.categoryId);
    await this.validateAuthor(dto.authorId);
    await this.validateLinkedEntities(dto);
    await this.validateTranslationGroup(
      dto.translationGroupId,
      dto.language,
    );

    const publishedAt = dto.isPublished ? new Date() : null;
    const scalars = this.articleScalars(dto);

    const row = await this.prisma.newsArticle.create({
      data: {
        ...scalars,
        slug,
        language: dto.language ?? 'en',
        isPublished: dto.isPublished ?? false,
        publishedAt,
        ...this.entityLinkData(dto, 'create'),
      } as any,
      include: articleInclude,
    });
    await this.syncEditorialCover(row.imageUrl);
    return this.summarize(row, true);
  }

  async update(id: string, dto: UpdateNewsDto) {
    const existing = await this.prisma.newsArticle.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Article ${id} not found`);

    await this.validateCategory(dto.categoryId);
    await this.validateAuthor(dto.authorId);
    await this.validateLinkedEntities(dto);
    await this.validateTranslationGroup(
      dto.translationGroupId ?? existing.translationGroupId ?? undefined,
      dto.language ?? existing.language,
      existing.id,
    );

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
    Object.assign(data, this.entityLinkData(dto, 'update'));

    const row = await this.prisma.newsArticle.update({
      where: { id },
      data: data as any,
      include: articleInclude,
    });
    await this.syncEditorialCover(row.imageUrl);
    return this.summarize(row, true);
  }

  async createTranslation(
    sourceId: string,
    dto: CreateNewsDto,
    _userId: string,
  ) {
    const source = await this.prisma.newsArticle.findUnique({
      where: { id: sourceId },
    });
    if (!source) throw new NotFoundException(`Article ${sourceId} not found`);
    if (!dto.language) {
      throw new BadRequestException('A translation language is required');
    }
    if (dto.language === source.language) {
      throw new BadRequestException(
        `The source article is already in ${source.language}`,
      );
    }

    this.validateTitle(dto.title);
    await this.validateCategory(dto.categoryId);
    await this.validateAuthor(dto.authorId);
    await this.validateLinkedEntities(dto);

    const slug = dto.slug ?? slugify(dto.title);
    if (await this.prisma.newsArticle.findUnique({ where: { slug } })) {
      throw new BadRequestException('An article with this title already exists');
    }

    const translationGroupId = source.translationGroupId ?? randomUUID();
    await this.validateTranslationGroup(translationGroupId, dto.language);
    const scalars = this.articleScalars(dto);
    const row = await this.prisma.$transaction(async (tx) => {
      if (!source.translationGroupId) {
        await tx.newsArticle.update({
          where: { id: source.id },
          data: { translationGroupId },
        });
      }
      return tx.newsArticle.create({
        data: {
          ...scalars,
          slug,
          translationGroupId,
          language: dto.language!,
          isPublished: dto.isPublished ?? false,
          publishedAt: dto.isPublished ? new Date() : null,
          ...this.entityLinkData(dto, 'create'),
        } as any,
        include: articleInclude,
      });
    });
    return this.summarize(row, true);
  }

  async getSeoPayload(idOrSlug: string) {
    const article = await this.getByIdOrSlug(idOrSlug);
    const url =
      article.canonicalUrl ??
      this.articleHref(article.language, article.slug);
    return {
      canonicalUrl: url,
      hreflang: article.translations,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: article.title,
        description: article.metaDescription ?? article.summary,
        image: article.imageUrl ? [article.imageUrl] : undefined,
        datePublished: article.publishedAt,
        dateModified: article.updatedAt ?? article.createdAt,
        inLanguage: article.language,
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        author: article.authorRef
          ? {
              '@type': 'Person',
              name: article.authorRef.name,
              url: `${this.config.get<string>('PUBLIC_WEB_URL', 'https://pakcriczone.com').replace(/\/$/, '')}/authors/${article.authorRef.slug}`,
            }
          : article.author
            ? { '@type': 'Person', name: article.author }
            : { '@type': 'Organization', name: 'PakCricZone' },
        publisher: {
          '@type': 'Organization',
          name: 'PakCricZone',
        },
      },
    };
  }

  async googleNewsSitemap() {
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const articles = await this.prisma.newsArticle.findMany({
      where: { isPublished: true, publishedAt: { gte: since } },
      orderBy: { publishedAt: 'desc' },
      take: 1000,
      select: {
        slug: true,
        title: true,
        language: true,
        publishedAt: true,
      },
    });
    const escapeXml = (value: string) =>
      value.replace(/[<>&'"]/g, (character) => ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        "'": '&apos;',
        '"': '&quot;',
      })[character]!);
    const urls = articles
      .map(
        (article) => `<url>
  <loc>${escapeXml(this.articleHref(article.language, article.slug))}</loc>
  <news:news>
    <news:publication>
      <news:name>PakCricZone</news:name>
      <news:language>${article.language}</news:language>
    </news:publication>
    <news:publication_date>${article.publishedAt!.toISOString()}</news:publication_date>
    <news:title>${escapeXml(article.title)}</news:title>
  </news:news>
</url>`,
      )
      .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;
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
    const authors = await this.prisma.author.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { articles: { where: { isPublished: true } } },
        },
      },
    });
    return authors.map(({ _count, ...author }) => ({
      ...author,
      articleCount: _count.articles,
    }));
  }

  async getAuthor(idOrSlug: string, query: AuthorArticlesQuery) {
    const author = await this.prisma.author.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    });
    if (!author) throw new NotFoundException(`Author ${idOrSlug} not found`);
    const { page, limit, skip } = getPaginationOffset(
      query.page,
      query.limit,
      query.offset,
    );
    const where = { authorId: author.id, isPublished: true };
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
    const grouped = await this.translationVariants(rows);
    return {
      author,
      articles: createPaginatedResponse(
        rows.map((row) =>
          this.toSummary(
            row,
            row.translationGroupId
              ? grouped.get(row.translationGroupId)
              : undefined,
          ),
        ),
        total,
        page,
        limit,
      ),
    };
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

  async removeAuthor(id: string) {
    const author = await this.prisma.author.findUnique({ where: { id } });
    if (!author) throw new NotFoundException(`Author ${id} not found`);
    await this.prisma.author.delete({ where: { id } });
    return { deleted: true };
  }

  async listEditorialPages() {
    return this.prisma.editorialPage.findMany({
      select: { slug: true, title: true, updatedAt: true },
      orderBy: { title: 'asc' },
    });
  }

  async getEditorialPage(slug: string) {
    const page = await this.prisma.editorialPage.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException(`Editorial page ${slug} not found`);
    return page;
  }

  async upsertEditorialPage(slug: string, dto: UpsertEditorialPageDto) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new BadRequestException('Editorial page slug is invalid');
    }
    return this.prisma.editorialPage.upsert({
      where: { slug },
      create: { slug, title: dto.title, content: dto.content },
      update: { title: dto.title, content: dto.content },
    });
  }
}
