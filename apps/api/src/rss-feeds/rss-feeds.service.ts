import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleDestroy,
  type OnModuleInit,
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
  extractArticleFromHtml,
  fetchFeedXmlSafe,
  fetchSourceArticleDetails,
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
export class RssFeedsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RssFeedsService.name);
  private schedulerTimer: ReturnType<typeof setInterval> | null = null;
  private schedulerRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) { }

  onModuleInit() {
    if (process.env.NODE_ENV === 'test' || process.env.RSS_AUTO_SYNC === 'false') return;
    // Check due feeds every 5 minutes so enabled RSS feeds stay synced automatically.
    this.schedulerTimer = setInterval(() => {
      void this.syncDueFeeds();
    }, 5 * 60 * 1000);
    this.schedulerTimer.unref?.();
  }

  onModuleDestroy() {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  async syncDueFeeds() {
    if (this.schedulerRunning) return;
    this.schedulerRunning = true;
    try {
      const enabledFeeds = await this.prisma.rssFeedSource.findMany({
        where: { enabled: true },
        orderBy: { createdAt: 'asc' },
      });
      const now = Date.now();
      for (const feed of enabledFeeds) {
        const intervalMs = Math.max(5, feed.pollIntervalMinutes) * 60 * 1000;
        const lastMs = feed.lastSyncedAt ? feed.lastSyncedAt.getTime() : 0;
        if (now - lastMs < intervalMs) continue;
        try {
          await this.syncOne(feed.id);
        } catch (err) {
          this.logger.warn(`Scheduled RSS sync failed for ${feed.name}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    } catch (err) {
      this.logger.debug(`RSS scheduler skipped: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      this.schedulerRunning = false;
    }
  }

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

      const defaultAuthor = !feed.authorId
        ? await this.prisma.author.upsert({
            where: { slug: 'criczapp-editorial' },
            update: {},
            create: {
              name: 'CriczApp Editorial',
              slug: 'criczapp-editorial',
              bio: 'Official CriczApp cricket desk covering live matches, PSL updates, ICC tournaments, and breaking cricket news.',
            },
            select: { id: true, name: true },
          })
        : null;

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

        const rssSummaryText = stripHtmlToText(item.summary || item.content);
        const rssContentText = stripHtmlToText(item.content || item.summary);
        // Fetch full article body + og:image when RSS XML only provides a short teaser or lacks a cover image.
        let extractedParagraphs: string[] = [];
        let coverImage = item.imageUrl;
        const isSmallThumb = (u: string | null) => !u || /\/(1[0-9]{2}|2[0-9]{2})\//i.test(u);
        if (item.link && (rssContentText.length < 600 || isSmallThumb(coverImage))) {
          const fetched = await fetchSourceArticleDetails(item.link);
          extractedParagraphs = fetched.paragraphs;
          if (fetched.ogImage && isSmallThumb(coverImage)) coverImage = fetched.ogImage;
        }
        // If RSS XML already carried full body (e.g. <content:encoded>), extract paragraphs from it too
        if (extractedParagraphs.length < 2 && item.content) {
          const fromRssHtml = extractArticleFromHtml(item.content).paragraphs;
          if (fromRssHtml.length >= 2) {
            extractedParagraphs = fromRssHtml;
          } else if (rssContentText.length > 320) {
            extractedParagraphs = rssContentText
              .split(/\n{2,}|(?<=[.!?])\s+(?=[A-Z])/)
              .map((s) => s.trim())
              .filter((s) => s.length >= 40)
              .slice(0, 25);
          }
        }

        const summaryText = (rssSummaryText || extractedParagraphs[0] || item.title).slice(0, 320);
        const contentText = extractedParagraphs.length
          ? extractedParagraphs.join('\n\n')
          : rssContentText;
        let title = item.title;
        let summary = summaryText || null;
        let htmlContent = buildAttributionHtml(
          summaryText,
          feed.name,
          item.link || null,
          extractedParagraphs.slice(0, 25),
        );
        let metaTitle = title.slice(0, 70);
        let metaDescription = (summaryText || title).slice(0, 160);

        if (feed.rewriteMode === 'ai_rewrite') {
          const rewritten = await rewriteRssItemWithAi({
            title: item.title,
            summary: summaryText,
            contentText,
            paragraphs: extractedParagraphs,
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
          htmlContent =
            extractedParagraphs.length > 1
              ? buildAttributionHtml(summaryText, feed.name, item.link || null, extractedParagraphs)
              : cleanRaw
                ? `${cleanRaw}\n${buildAttributionHtml('', feed.name, item.link || null)}`
                : htmlContent;
        }

        const hash = crypto.createHash('sha256').update(sourceGuid).digest('hex').slice(0, 8);
        const slug = `${slugifyText(title) || 'story'}-${hash}`;
        const parsedDate = item.pubDate ? new Date(item.pubDate) : new Date();
        const publishedAt = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
        const plainBodyLength = stripHtmlToText(htmlContent).length;
        const hasSubstantialBody = plainBodyLength >= 280 && (extractedParagraphs.length >= 2 || plainBodyLength >= 380);
        const shouldPublish = Boolean(feed.autoPublish && hasSubstantialBody);

        const created = await this.prisma.newsArticle.create({
          data: {
            title,
            slug,
            summary,
            content: htmlContent,
            imageUrl: coverImage,
            author: feed.authorRef?.name || defaultAuthor?.name || 'CriczApp Editorial',
            authorId: feed.authorId || defaultAuthor?.id || null,
            source: feed.name,
            sourceGuid,
            sourceUrl: item.link || null,
            canonicalUrl: null,
            categoryId: feed.categoryId || null,
            language: feed.language || 'en',
            metaTitle,
            metaDescription,
            publishedAt,
            isPublished: shouldPublish,
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
        await this.redis.cached.del(redisKeys.newsList()).catch(() => { });
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
