import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import crypto from 'node:crypto';
import { redisKeys } from '@cricapp/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import type { CreateRssFeedDto, PreviewRssFeedDto, UpdateRssFeedDto } from './dto/rss-feed.dto.js';
import {
  assertSafeFeedUrl,
  buildAttributionHtml,
  buildSourceGuid,
  evaluateTopicFilter,
  fetchFeedXmlSafe,
  parseRssOrAtomXml,
  rewriteRssItemWithAi,
  sanitizeRssHtml,
  slugifyText,
  stripHtmlToText,
} from './rss-parser.util.js';

function cleanKeywords(list?: string[]): string[] {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.map((k) => k.trim()).filter(Boolean))];
}

@Injectable()
export class RssFeedsService {
  private readonly logger = new Logger(RssFeedsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async list() {
    const feeds = await this.prisma.rssFeedSource.findMany({
      orderBy: [{ createdAt: 'desc' }],
      include: {
        category: { select: { id: true, name: true, slug: true } },
        authorRef: { select: { id: true, name: true, slug: true } },
      },
    });
    return { data: feeds };
  }

  async create(dto: CreateRssFeedDto) {
    assertSafeFeedUrl(dto.url);
    const existing = await this.prisma.rssFeedSource.findUnique({ where: { url: dto.url } });
    if (existing) {
      throw new ConflictException('An RSS feed with this URL already exists');
    }
    return this.prisma.rssFeedSource.create({
      data: {
        name: dto.name.trim(),
        url: dto.url.trim(),
        enabled: dto.enabled ?? true,
        categoryId: dto.categoryId || null,
        authorId: dto.authorId || null,
        includeKeywords: cleanKeywords(dto.includeKeywords),
        excludeKeywords: cleanKeywords(dto.excludeKeywords),
        rewriteMode: dto.rewriteMode ?? 'summary_attribution',
        autoPublish: dto.autoPublish ?? false,
        language: dto.language ?? 'en',
        pollIntervalMinutes: dto.pollIntervalMinutes ?? 30,
        maxItemsPerPoll: dto.maxItemsPerPoll ?? 10,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        authorRef: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async update(id: string, dto: UpdateRssFeedDto) {
    const existing = await this.prisma.rssFeedSource.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`RSS feed ${id} not found`);
    if (dto.url) {
      assertSafeFeedUrl(dto.url);
      if (dto.url !== existing.url) {
        const dup = await this.prisma.rssFeedSource.findUnique({ where: { url: dto.url } });
        if (dup) throw new ConflictException('Another RSS feed already uses this URL');
      }
    }
    return this.prisma.rssFeedSource.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.url !== undefined ? { url: dto.url.trim() } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId || null } : {}),
        ...(dto.authorId !== undefined ? { authorId: dto.authorId || null } : {}),
        ...(dto.includeKeywords !== undefined ? { includeKeywords: cleanKeywords(dto.includeKeywords) } : {}),
        ...(dto.excludeKeywords !== undefined ? { excludeKeywords: cleanKeywords(dto.excludeKeywords) } : {}),
        ...(dto.rewriteMode !== undefined ? { rewriteMode: dto.rewriteMode } : {}),
        ...(dto.autoPublish !== undefined ? { autoPublish: dto.autoPublish } : {}),
        ...(dto.language !== undefined ? { language: dto.language } : {}),
        ...(dto.pollIntervalMinutes !== undefined ? { pollIntervalMinutes: dto.pollIntervalMinutes } : {}),
        ...(dto.maxItemsPerPoll !== undefined ? { maxItemsPerPoll: dto.maxItemsPerPoll } : {}),
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        authorRef: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.rssFeedSource.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`RSS feed ${id} not found`);
    await this.prisma.rssFeedSource.delete({ where: { id } });
    return { deleted: true, id };
  }

  async preview(dto: PreviewRssFeedDto) {
    const xml = await fetchFeedXmlSafe(dto.url);
    const parsed = parseRssOrAtomXml(xml);
    const limit = dto.limit ?? 15;
    const include = cleanKeywords(dto.includeKeywords);
    const exclude = cleanKeywords(dto.excludeKeywords);

    const evaluated = parsed.slice(0, limit).map((item) => {
      const filter = evaluateTopicFilter(item, include, exclude);
      return {
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        imageUrl: item.imageUrl,
        summary: stripHtmlToText(item.summary).slice(0, 220),
        categories: item.categories,
        matched: filter.matched,
        matchedKeywords: filter.matchedKeywords,
        excludedBy: filter.excludedBy,
      };
    });

    return {
      totalInFeed: parsed.length,
      previewed: evaluated.length,
      matchedCount: evaluated.filter((e) => e.matched).length,
      skippedCount: evaluated.filter((e) => !e.matched).length,
      items: evaluated,
    };
  }

  async syncOne(id: string) {
    const feed = await this.prisma.rssFeedSource.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        authorRef: { select: { id: true, name: true } },
      },
    });
    if (!feed) throw new NotFoundException(`RSS feed ${id} not found`);

    try {
      const xml = await fetchFeedXmlSafe(feed.url);
      const parsed = parseRssOrAtomXml(xml).slice(0, feed.maxItemsPerPoll);

      let inserted = 0;
      let skippedFilter = 0;
      let skippedDuplicate = 0;

      // Preload teams for lightweight auto-linking
      const teams = await this.prisma.team.findMany({
        select: { id: true, name: true },
        take: 300,
      });

      for (const item of parsed) {
        const filter = evaluateTopicFilter(item, feed.includeKeywords, feed.excludeKeywords);
        if (!filter.matched) {
          skippedFilter += 1;
          continue;
        }

        const sourceGuid = buildSourceGuid(feed.url, item);
        const dup = await this.prisma.newsArticle.findFirst({
          where: {
            OR: [
              { sourceGuid },
              ...(item.link ? [{ sourceUrl: item.link }] : []),
            ],
          },
          select: { id: true },
        });
        if (dup) {
          skippedDuplicate += 1;
          continue;
        }

        const summaryText = stripHtmlToText(item.summary || item.content).slice(0, 320);
        const contentText = stripHtmlToText(item.content || item.summary);
        let title = item.title;
        let summary = summaryText || null;
        let htmlContent = buildAttributionHtml(summaryText, feed.name, item.link || null);
        let metaTitle = title.slice(0, 70);
        let metaDescription = (summaryText || title).slice(0, 160);

        if (feed.rewriteMode === 'ai_rewrite') {
          const rewritten = await rewriteRssItemWithAi({
            title: item.title,
            summary: summaryText,
            contentText,
            sourceName: feed.name,
            sourceUrl: item.link || null,
            language: feed.language,
          });
          title = rewritten.title;
          summary = rewritten.summary;
          htmlContent = rewritten.htmlContent;
          metaTitle = rewritten.metaTitle;
          metaDescription = rewritten.metaDescription;
        } else if (feed.rewriteMode === 'raw') {
          const cleanRaw = sanitizeRssHtml(item.content || item.summary);
          htmlContent = cleanRaw
            ? `${cleanRaw}\n${buildAttributionHtml('', feed.name, item.link || null)}`
            : htmlContent;
        }

        const hash = crypto.createHash('sha256').update(sourceGuid).digest('hex').slice(0, 8);
        const slug = `${slugifyText(title) || 'story'}-${hash}`;
        const parsedDate = item.pubDate ? new Date(item.pubDate) : new Date();
        const publishedAt = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

        const created = await this.prisma.newsArticle.create({
          data: {
            title,
            slug,
            summary,
            content: htmlContent,
            imageUrl: item.imageUrl,
            author: feed.authorRef?.name || item.author || feed.name,
            authorId: feed.authorId || null,
            source: feed.name,
            sourceGuid,
            sourceUrl: item.link || null,
            canonicalUrl: item.link || null,
            categoryId: feed.categoryId || null,
            language: feed.language || 'en',
            metaTitle,
            metaDescription,
            publishedAt,
            isPublished: feed.autoPublish,
          },
          select: { id: true },
        });

        // Auto-link mentioned teams (up to 4)
        const haystack = `${title} ${summaryText}`.toLowerCase();
        const matchedTeamIds = teams
          .filter((t) => t.name.length >= 4 && haystack.includes(t.name.toLowerCase()))
          .slice(0, 4)
          .map((t) => t.id);
        if (matchedTeamIds.length) {
          await this.prisma.newsArticleTeam.createMany({
            data: matchedTeamIds.map((teamId) => ({ articleId: created.id, teamId })),
            skipDuplicates: true,
          });
        }

        inserted += 1;
      }

      await this.prisma.rssFeedSource.update({
        where: { id: feed.id },
        data: {
          lastSyncedAt: new Date(),
          lastStatus: 'ok',
          lastError: null,
          articlesImported: { increment: inserted },
        },
      });

      if (inserted > 0 && feed.autoPublish) {
        await this.redis.cached.del(redisKeys.newsList()).catch(() => {});
      }

      return {
        feedId: feed.id,
        name: feed.name,
        fetched: parsed.length,
        inserted,
        skippedFilter,
        skippedDuplicate,
        autoPublished: feed.autoPublish,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`RSS sync failed for ${feed.name}: ${message}`);
      await this.prisma.rssFeedSource.update({
        where: { id: feed.id },
        data: {
          lastSyncedAt: new Date(),
          lastStatus: 'error',
          lastError: message.slice(0, 500),
        },
      });
      throw err;
    }
  }
}
