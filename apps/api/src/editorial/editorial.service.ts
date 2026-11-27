import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NewsService } from '../news/news.service.js';
import {
  getPaginationOffset,
  createPaginatedResponse,
} from '../common/pagination/pagination.util.js';
import type {
  CreateNewsDto,
  UpdateNewsDto,
  NewsListQuery,
  BulkNewsActionDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateAuthorDto,
  UpdateAuthorDto,
  UpsertEditorialPageDto,
} from '../news/dto/news.dto.js';

function slugify(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/(^-|-$)/g, '');
}

@Injectable()
export class EditorialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly newsService: NewsService,
  ) {}

  private async getActor(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        isAdmin: true,
        isSuperAdmin: true,
        editorialRole: true,
        authorId: true,
        authorProfile: true,
      },
    });
    if (!user) throw new ForbiddenException('User not found');
    const isEditor = Boolean(
      user.isAdmin || user.isSuperAdmin || user.editorialRole === 'EDITOR',
    );
    const isAuthor = Boolean(user.editorialRole === 'AUTHOR');
    if (!isEditor && !isAuthor) {
      throw new ForbiddenException('Editorial access required');
    }
    return { ...user, isEditor, isAuthor };
  }

  private async ensureAuthorProfile(actor: Awaited<ReturnType<EditorialService['getActor']>>) {
    if (actor.authorProfile) return actor.authorProfile;

    const baseName = actor.displayName?.trim() || actor.username;
    const baseSlug = slugify(baseName) || `author-${actor.id.slice(0, 8)}`;
    let slug = baseSlug;
    let suffix = 1;
    while (await this.prisma.author.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const created = await this.prisma.author.create({
      data: {
        name: baseName,
        slug,
        avatarUrl: actor.avatarUrl ?? undefined,
      },
    });
    await this.prisma.user.update({
      where: { id: actor.id },
      data: { authorId: created.id },
    });
    return created;
  }

  async getOverview(userId: string) {
    const actor = await this.getActor(userId);
    const scopeWhere = actor.isEditor
      ? {}
      : actor.authorId
        ? { authorId: actor.authorId }
        : { id: '__none__' };

    const [total, published, drafts, categoriesCount, authorsCount, recent] =
      await Promise.all([
        this.prisma.newsArticle.count({ where: scopeWhere }),
        this.prisma.newsArticle.count({ where: { ...scopeWhere, isPublished: true } }),
        this.prisma.newsArticle.count({ where: { ...scopeWhere, isPublished: false } }),
        this.prisma.newsCategory.count(),
        actor.isEditor ? this.prisma.author.count() : Promise.resolve(1),
        this.prisma.newsArticle.findMany({
          where: scopeWhere,
          orderBy: { updatedAt: 'desc' },
          take: 8,
          include: {
            category: true,
            authorRef: true,
          },
        }),
      ]);

    return {
      role: actor.isEditor ? 'EDITOR' : 'AUTHOR',
      authorProfile: actor.authorProfile,
      stats: {
        total,
        published,
        drafts,
        categories: categoriesCount,
        authors: authorsCount,
      },
      recentArticles: recent.map((a) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        language: a.language,
        isPublished: a.isPublished,
        publishedAt: a.publishedAt,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        imageUrl: a.imageUrl,
        category: a.category ? { id: a.category.id, name: a.category.name, slug: a.category.slug } : null,
        authorName: a.authorRef?.name ?? a.author ?? null,
      })),
    };
  }

  async listArticles(userId: string, query: NewsListQuery) {
    const actor = await this.getActor(userId);
    const { page, limit, skip } = getPaginationOffset(query.page, query.limit);

    if (!actor.isEditor && !actor.authorId) {
      return createPaginatedResponse([], 0, page, limit);
    }

    const where: Record<string, unknown> = {};
    if (!actor.isEditor && actor.authorId) {
      where.authorId = actor.authorId;
    } else if (query.authorId) {
      where.authorId = query.authorId;
    }

    if (query.status === 'published') where.isPublished = true;
    else if (query.status === 'draft') where.isPublished = false;

    if (query.category) where.categoryId = query.category;
    if (query.language) where.language = query.language;
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { summary: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.newsArticle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          category: true,
          authorRef: true,
          linkedPlayers: { select: { playerId: true } },
          linkedTeams: { select: { teamId: true } },
          linkedMatches: { select: { matchId: true } },
          linkedSeries: { select: { tournamentId: true } },
        },
      }),
      this.prisma.newsArticle.count({ where }),
    ]);

    return createPaginatedResponse(items, total, page, limit);
  }

  async getArticle(userId: string, id: string) {
    const actor = await this.getActor(userId);
    const article = await this.newsService.getByIdOrSlug(id, { includeUnpublished: true });
    if (!actor.isEditor && article.authorId !== actor.authorId) {
      throw new ForbiddenException('You can only access your own articles');
    }
    return article;
  }

  async createArticle(userId: string, dto: CreateNewsDto) {
    const actor = await this.getActor(userId);
    if (!actor.isEditor) {
      const profile = await this.ensureAuthorProfile(actor);
      return this.newsService.create(
        {
          ...dto,
          authorId: profile.id,
          author: profile.name,
        },
        actor.id,
      );
    }
    return this.newsService.create(dto, actor.id);
  }

  async updateArticle(userId: string, id: string, dto: UpdateNewsDto) {
    const actor = await this.getActor(userId);
    const existing = await this.prisma.newsArticle.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Article not found');

    if (!actor.isEditor) {
      if (!actor.authorId || existing.authorId !== actor.authorId) {
        throw new ForbiddenException('You can only edit your own articles');
      }
      return this.newsService.update(id, {
        ...dto,
        authorId: actor.authorId,
        author: actor.authorProfile?.name ?? existing.author ?? undefined,
      });
    }

    return this.newsService.update(id, dto);
  }

  async deleteArticle(userId: string, id: string) {
    const actor = await this.getActor(userId);
    const existing = await this.prisma.newsArticle.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Article not found');
    if (!actor.isEditor && existing.authorId !== actor.authorId) {
      throw new ForbiddenException('You can only delete your own articles');
    }
    return this.newsService.remove(id);
  }

  async createTranslation(userId: string, id: string, dto: CreateNewsDto) {
    const actor = await this.getActor(userId);
    const existing = await this.prisma.newsArticle.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Article not found');
    if (!actor.isEditor && existing.authorId !== actor.authorId) {
      throw new ForbiddenException('You can only translate your own articles');
    }
    if (!actor.isEditor && actor.authorId) {
      return this.newsService.createTranslation(
        id,
        {
          ...dto,
          authorId: actor.authorId,
          author: actor.authorProfile?.name ?? existing.author ?? undefined,
        },
        actor.id,
      );
    }
    return this.newsService.createTranslation(id, dto, actor.id);
  }

  async bulkAction(userId: string, dto: BulkNewsActionDto) {
    const actor = await this.getActor(userId);
    if (!actor.isEditor) {
      throw new ForbiddenException('Editor or admin access required for bulk actions');
    }
    const where = { id: { in: dto.ids } };
    if (dto.action === 'delete') {
      const res = await this.prisma.newsArticle.deleteMany({ where });
      return { affected: res.count };
    }
    const data: Record<string, unknown> = {};
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;
    if (dto.authorId !== undefined) data.authorId = dto.authorId;
    if (dto.status !== undefined) {
      const pub = dto.status === 'published';
      data.isPublished = pub;
      if (pub) data.publishedAt = new Date();
    }
    if (Object.keys(data).length === 0) return { affected: 0 };
    const res = await this.prisma.newsArticle.updateMany({ where, data });
    return { affected: res.count };
  }

  async getMyProfile(userId: string) {
    const actor = await this.getActor(userId);
    return actor.authorProfile ?? null;
  }

  async upsertMyProfile(
    userId: string,
    dto: { name: string; bio?: string; avatarUrl?: string },
  ) {
    const actor = await this.getActor(userId);
    if (actor.authorId && actor.authorProfile) {
      return this.newsService.updateAuthor(actor.authorId, {
        name: dto.name,
        bio: dto.bio,
        avatarUrl: dto.avatarUrl,
      });
    }
    const created = await this.newsService.createAuthor({
      name: dto.name,
      bio: dto.bio,
      avatarUrl: dto.avatarUrl,
    });
    await this.prisma.user.update({
      where: { id: actor.id },
      data: { authorId: created.id },
    });
    return created;
  }

  listCategories() {
    return this.newsService.listCategories();
  }

  createCategory(dto: CreateCategoryDto) {
    return this.newsService.createCategory(dto);
  }

  updateCategory(idOrSlug: string, dto: UpdateCategoryDto) {
    return this.newsService.updateCategory(idOrSlug, dto);
  }

  removeCategory(idOrSlug: string) {
    return this.newsService.removeCategory(idOrSlug);
  }

  listAuthors() {
    return this.newsService.listAuthors();
  }

  createAuthor(dto: CreateAuthorDto) {
    return this.newsService.createAuthor(dto);
  }

  updateAuthor(id: string, dto: UpdateAuthorDto) {
    return this.newsService.updateAuthor(id, dto);
  }

  removeAuthor(id: string, reassignTo?: string) {
    return this.newsService.removeAuthor(id, reassignTo);
  }

  listEditorialPages() {
    return this.newsService.listEditorialPages();
  }

  upsertEditorialPage(slug: string, dto: UpsertEditorialPageDto) {
    return this.newsService.upsertEditorialPage(slug, dto);
  }
}
