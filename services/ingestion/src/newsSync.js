import crypto from 'crypto';
import { query } from './db.js';
import redis from './redis.js';
import { redisKeys } from './schemas.js';
import { createLogger } from './logger.js';
import { shouldSync, markSynced } from './refState.js';
import {
  cricbuzzConfigured,
  fetchNewsList,
  fetchNewsDetail,
  cricbuzzImageUrl,
} from './cricbuzzContent.js';
import {
  buildAttributionHtml,
  buildSourceGuid,
  extractFirstImgSrc,
  fetchSourceArticleDetails,
  matchesTopicFilter,
  sanitizeRssHtml,
  stripHtmlToText,
} from './rssFilter.js';
import { rewriteRssItem } from './rssRewriter.js';
import { linkRssArticleEntities } from './rssEntityLinker.js';

const log = createLogger('news');

const NEWS_SYNC_INTERVAL_MS = Number(process.env.NEWS_SYNC_INTERVAL_MS || 3600000);
const NEWS_SOURCES_JSON = process.env.NEWS_SOURCES || '[]';
const CRICBUZZ_NEWS_ENABLED =
  String(process.env.CRICBUZZ_NEWS_SYNC ?? 'true').toLowerCase() !== 'false';
const CRICBUZZ_NEWS_LIMIT = Math.max(0, Number(process.env.CRICBUZZ_NEWS_LIMIT || 12));
const CRICBUZZ_NEWS_DETAIL_LIMIT = Math.max(
  0,
  Number(process.env.CRICBUZZ_NEWS_DETAIL_LIMIT || 6),
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function slugify(text) {
  return String(text || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120);
}

function unescapeHtml(text) {
  if (!text) return text;
  return String(text)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractTag(xml, tag) {
  const m = String(xml).match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  if (!m) return null;
  let text = m[1].trim();
  text = text.replace(/<!\[CDATA\[(.*?)\]\]>/s, '$1');
  return unescapeHtml(text);
}

function extractAttr(xml, tag, attr) {
  const m = String(xml).match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"[^>]*>`));
  return m ? m[1] : null;
}

function extractAllTags(xml, tag) {
  const out = [];
  const rx = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  for (const m of String(xml).matchAll(rx)) {
    let text = m[1].trim();
    text = text.replace(/<!\[CDATA\[(.*?)\]\]>/s, '$1');
    const clean = unescapeHtml(text).trim();
    if (clean) out.push(clean);
  }
  return out;
}

function parseFeed(xml) {
  const items = [];

  // RSS 2.0
  for (const match of String(xml).matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)) {
    const block = match[1];
    const summary = extractTag(block, 'description');
    const content = extractTag(block, 'content:encoded');
    items.push({
      title: extractTag(block, 'title'),
      link: extractTag(block, 'link'),
      summary,
      content,
      pubDate: extractTag(block, 'pubDate') || extractTag(block, 'dc:date'),
      guid: extractTag(block, 'guid'),
      author: extractTag(block, 'dc:creator') || extractTag(block, 'author'),
      enclosureUrl:
        extractAttr(block, 'media:content', 'url') ||
        extractAttr(block, 'enclosure', 'url') ||
        extractFirstImgSrc(content) ||
        extractFirstImgSrc(summary),
      mediaThumbnail: extractAttr(block, 'media:thumbnail', 'url'),
      categories: extractAllTags(block, 'category'),
    });
  }

  // Atom
  if (!items.length) {
    for (const match of String(xml).matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi)) {
      const block = match[1];
      const summary = extractTag(block, 'summary');
      const content = extractTag(block, 'content');
      items.push({
        title: extractTag(block, 'title'),
        link: extractAttr(block, 'link', 'href'),
        summary,
        content,
        pubDate: extractTag(block, 'published') || extractTag(block, 'updated'),
        guid: extractTag(block, 'id'),
        author: extractTag(block, 'name'),
        enclosureUrl:
          extractAttr(block, 'media:content', 'url') ||
          extractAttr(block, 'enclosure', 'url') ||
          extractFirstImgSrc(content) ||
          extractFirstImgSrc(summary),
        mediaThumbnail: extractAttr(block, 'media:thumbnail', 'url'),
        categories: extractAllTags(block, 'category'),
      });
    }
  }

  return items;
}

function parseRssDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function parseEpochMs(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  const ms = n > 1e12 ? n : n * 1000;
  const d = new Date(ms);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function normalizeArticle(raw, sourceName, defaultCategory) {
  const title = raw.title || 'Untitled';
  const link = raw.link || raw.guid || '';
  const hash = crypto.createHash('sha256').update(String(link || title)).digest('hex').slice(0, 8);
  const slug = `${slugify(title)}-${hash}`;
  const summary = raw.summary || null;
  const content = raw.content || raw.summary || '';
  const imageUrl = raw.enclosureUrl || raw.mediaThumbnail || null;
  const author = raw.author || sourceName || null;
  const source = sourceName || null;
  const pubDate = parseRssDate(raw.pubDate);

  return {
    title,
    slug,
    summary,
    content,
    imageUrl,
    author,
    source,
    categoryName: defaultCategory || 'General',
    publishedAt: pubDate,
  };
}

function htmlEscape(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function contentFromCricbuzzDetail(detail) {
  const d = detail?.story || detail || {};
  const content = d.content || detail?.content || detail?.storyContent || [];
  const parts = [];
  if (Array.isArray(content)) {
    for (const item of content) {
      const block = item?.content || item;
      if (typeof block === 'string' && block.trim()) {
        parts.push(`<p>${htmlEscape(block.trim())}</p>`);
        continue;
      }
      if (!block || typeof block !== 'object') continue;
      const text = block.contentValue || block.content || block.text || block.caption || block.description;
      if (!text || typeof text !== 'string') continue;
      const clean = text.trim();
      if (!clean) continue;
      const type = String(block.contentType || block.type || '').toLowerCase();
      if (type.includes('header') || type.includes('title')) parts.push(`<h3>${htmlEscape(clean)}</h3>`);
      else parts.push(`<p>${htmlEscape(clean)}</p>`);
    }
  }
  if (!parts.length) {
    const intro = d.intro || detail?.intro || d.summary || detail?.summary;
    if (intro) parts.push(`<p>${htmlEscape(String(intro).trim())}</p>`);
  }
  return parts.join('\n');
}

function normalizeCricbuzzStory(story, detail) {
  const s = story?.story || story || {};
  const d = detail?.story || detail || {};
  const id = s.id ?? d.id ?? d.storyId;
  const title = s.hline || s.headline || d.hline || d.headline || 'Cricbuzz story';
  const slug = `cricbuzz-${id ?? 'story'}-${slugify(title)}`.slice(0, 180);
  const intro = s.intro || d.intro || s.seoHeadline || null;
  const coverImageId =
    d.coverImage?.id ||
    d.coverImage?.imageId ||
    s.coverImage?.id ||
    s.imageId ||
    s.coverImageId ||
    d.imageId;
  const imageUrl = coverImageId ? cricbuzzImageUrl(coverImageId, { width: 1200, height: 0 }) : null;
  const publishedAt =
    parseEpochMs(d.publishTime || d.pubTime || s.publishTime || s.pubTime || s.lastUpdatedTime) || null;
  const author =
    (Array.isArray(d.authors) && d.authors.map((a) => a?.name).filter(Boolean).join(', ')) ||
    d.author ||
    s.author ||
    s.source ||
    'Cricbuzz';
  const rawContext = String(s.context || d.context || s.storyType || '').trim();
  const hay = `${rawContext} ${title}`.toLowerCase();
  const categoryName = /\bpsl\b|pakistan super league/.test(hay)
    ? 'PSL'
    : /\bpakistan\b|\bpcb\b/.test(hay)
      ? 'Pakistan Cricket'
      : /\bipl\b/.test(hay)
        ? 'IPL'
        : /interview/.test(hay)
          ? 'Interviews'
          : /analysis|tactic|preview|review/.test(hay)
            ? 'Analysis'
            : /feature|profile/.test(hay)
              ? 'Features'
              : /record|stat/.test(hay)
                ? 'Records'
                : /tour|test|odi|t20|world cup|icc|wtc|ashes/.test(hay)
                  ? 'International'
                  : 'Match News';
  const detailContent = detail ? contentFromCricbuzzDetail(detail) : '';
  const content = detailContent || (intro ? `<p>${htmlEscape(String(intro).trim())}</p>` : `<p>${htmlEscape(title)}</p>`);

  return {
    title,
    slug,
    summary: intro ? String(intro).trim() : null,
    content,
    imageUrl,
    author,
    source: 'Cricbuzz',
    categoryName,
    publishedAt,
  };
}

async function fetchFeedXml(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* Storage helpers                                                    */
/* ------------------------------------------------------------------ */

const upsertNewsCategory = `
  INSERT INTO news_categories (id, name, slug) VALUES ($1, $2, $3)
  ON CONFLICT (slug) DO NOTHING
`;

export async function ensureNewsCategory(name) {
  const slug = slugify(name) || 'general';
  const existing = await query(`SELECT id FROM news_categories WHERE slug = $1`, [slug]);
  if (existing.rows.length) return existing.rows[0].id;

  const id = crypto.randomUUID();
  await query(upsertNewsCategory, [id, String(name || 'General').slice(0, 120), slug]);
  const r = await query(`SELECT id FROM news_categories WHERE slug = $1`, [slug]);
  return r.rows[0]?.id ?? id;
}

export async function saveNewsArticles(articles) {
  let inserted = 0;
  let updated = 0;
  let duplicates = 0;

  for (const article of articles) {
    if (!article?.title) continue;
    const existing = await query(
      `SELECT id FROM news_articles WHERE source = $1 AND title = $2`,
      [article.source, article.title],
    );

    if (existing.rows.length > 0) {
      await query(
        `UPDATE news_articles SET
           summary = COALESCE($1, summary),
           content = COALESCE(NULLIF($2, ''), content),
           image_url = COALESCE($3, image_url),
           author = COALESCE($4, author),
           category_id = COALESCE($5, category_id),
           published_at = COALESCE($6, published_at),
           updated_at = NOW()
         WHERE id = $7`,
        [
          article.summary,
          article.content || '',
          article.imageUrl,
          article.author,
          article.categoryId,
          article.publishedAt,
          existing.rows[0].id,
        ],
      );
      updated++;
    } else {
      const res = await query(
        `INSERT INTO news_articles (id, title, slug, summary, content, image_url, author, source, category_id, published_at, is_published, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, NOW(), NOW())
         ON CONFLICT (slug) DO NOTHING`,
        [
          crypto.randomUUID(),
          article.title,
          article.slug,
          article.summary,
          article.content || `<p>${htmlEscape(article.title)}</p>`,
          article.imageUrl,
          article.author,
          article.source,
          article.categoryId,
          article.publishedAt,
        ],
      );
      if (res.rowCount) inserted++;
      else duplicates++;
    }
  }

  return { inserted, updated, duplicates };
}

/* ------------------------------------------------------------------ */
/* RSS / author feeds                                                 */
/* ------------------------------------------------------------------ */

export { parseFeed, normalizeArticle, slugify, unescapeHtml };

export async function syncNewsSource({ url, source, category, enabled = true }) {
  if (!enabled) return null;
  if (!(await shouldSync('news', url))) {
    log.debug('news sync skipped (fresh)', { source, url });
    return null;
  }

  log.info('syncing news source', { source, url });
  const xml = await fetchFeedXml(url);
  const entries = parseFeed(xml);
  log.info('feed parsed', { source, entries: entries.length });

  if (!entries.length) {
    await markSynced('news', url, 1 * 3600e3);
    return { source, entries: 0, inserted: 0, updated: 0 };
  }

  const categoryId = await ensureNewsCategory(category || 'General');
  const articles = entries
    .map((e) => normalizeArticle(e, source, category))
    .map((a) => ({ ...a, categoryId }));

  const { inserted, updated } = await saveNewsArticles(articles);
  await markSynced('news', url, 1 * 3600e3);
  await redis.del(redisKeys.newsList());

  log.info('news source synced', { source, entries: entries.length, inserted, updated });
  return { source, entries: entries.length, inserted, updated };
}

async function syncRssSources() {
  let sources;
  try {
    sources = JSON.parse(NEWS_SOURCES_JSON);
  } catch (err) {
    log.error('invalid NEWS_SOURCES env var', { error: err.message });
    return [];
  }

  if (!Array.isArray(sources) || !sources.length) {
    log.debug('no rss/author news sources configured');
    return [];
  }

  const results = [];
  for (const source of sources) {
    try {
      const res = await syncNewsSource(source);
      if (res) results.push(res);
    } catch (err) {
      log.error('news source sync failed', {
        source: source?.source,
        url: source?.url,
        error: err.message,
      });
    }
  }
  return results;
}

/* ------------------------------------------------------------------ */
/* Cricbuzz news API                                                  */
/* ------------------------------------------------------------------ */

export async function syncCricbuzzNews() {
  if (!CRICBUZZ_NEWS_ENABLED || CRICBUZZ_NEWS_LIMIT <= 0) return null;
  if (!cricbuzzConfigured()) {
    log.debug('cricbuzz news sync skipped (RAPIDAPI_KEY/host not configured)');
    return null;
  }
  if (!(await shouldSync('news', 'cricbuzz:news:list'))) {
    log.debug('cricbuzz news sync skipped (fresh)');
    return null;
  }

  log.info('syncing cricbuzz news');
  const list = await fetchNewsList();
  const stories = (list?.storyList || [])
    .map((item) => item?.story || item)
    .filter((s) => s && s.id && s.hline)
    .slice(0, CRICBUZZ_NEWS_LIMIT);

  const articles = [];
  for (let i = 0; i < stories.length; i += 1) {
    const story = stories[i];
    let detail = null;
    if (i < CRICBUZZ_NEWS_DETAIL_LIMIT) {
      try {
        detail = await fetchNewsDetail(story.id);
      } catch (err) {
        log.warn('cricbuzz news detail fetch failed', { id: story.id, error: err.message });
      }
      if (i < CRICBUZZ_NEWS_DETAIL_LIMIT - 1) await sleep(150);
    }
    const normalized = normalizeCricbuzzStory(story, detail);
    normalized.categoryId = await ensureNewsCategory(normalized.categoryName || 'Cricket News');
    articles.push(normalized);
  }

  const { inserted, updated, duplicates } = await saveNewsArticles(articles);
  await markSynced('news', 'cricbuzz:news:list', 20 * 60e3);
  if (inserted || updated) await redis.del(redisKeys.newsList());

  log.info('cricbuzz news synced', {
    fetched: stories.length,
    inserted,
    updated,
    duplicates,
  });
  return { source: 'Cricbuzz', fetched: stories.length, inserted, updated, duplicates };
}

export async function syncDbRssFeed(feed) {
  const ttlMs = Math.max(5, Number(feed.poll_interval_minutes || 30)) * 60 * 1000;
  if (!(await shouldSync('rss-db', feed.id))) {
    log.debug('db rss feed skipped (fresh)', { id: feed.id, name: feed.name });
    return null;
  }

  try {
    const xml = await fetchFeedXml(feed.url);
    const maxItems = Math.max(1, Math.min(50, Number(feed.max_items_per_poll || 10)));
    const entries = parseFeed(xml).slice(0, maxItems);

    let inserted = 0;
    let skippedFilter = 0;
    let skippedDup = 0;

    for (const raw of entries) {
      if (!raw?.title) continue;
      const filter = matchesTopicFilter(raw, feed.include_keywords, feed.exclude_keywords);
      if (!filter.matched) {
        skippedFilter += 1;
        continue;
      }

      const sourceGuid = buildSourceGuid(feed.url, raw);
      const dup = await query(
        `SELECT id FROM news_articles WHERE source_guid = $1 OR ($2::text IS NOT NULL AND source_url = $2)`,
        [sourceGuid, raw.link || null],
      );
      if (dup.rows.length > 0) {
        skippedDup += 1;
        continue;
      }

      const rssSummaryText = stripHtmlToText(raw.summary || raw.content);
      const rssContentText = stripHtmlToText(raw.content || raw.summary);
      let extractedParagraphs = [];
      let coverImage = raw.enclosureUrl || raw.mediaThumbnail || null;
      const isSmallThumb = (u) => !u || /\/(1[0-9]{2}|2[0-9]{2})\//i.test(u);
      if (raw.link && (rssContentText.length < 600 || isSmallThumb(coverImage))) {
        const fetched = await fetchSourceArticleDetails(raw.link);
        extractedParagraphs = fetched.paragraphs;
        if (fetched.ogImage && isSmallThumb(coverImage)) coverImage = fetched.ogImage;
      }

      const summaryText = (rssSummaryText || extractedParagraphs[0] || raw.title).slice(0, 320);
      const contentText = extractedParagraphs.length
        ? extractedParagraphs.join('\n\n')
        : rssContentText;
      let title = stripHtmlToText(raw.title) || 'Untitled';
      let summary = summaryText || null;
      let htmlContent = buildAttributionHtml(
        summaryText,
        feed.name,
        raw.link || null,
        extractedParagraphs.slice(0, 6),
      );
      let metaTitle = title.slice(0, 70);
      let metaDescription = (summaryText || title).slice(0, 160);

      if (feed.rewrite_mode === 'ai_rewrite') {
        const rewritten = await rewriteRssItem({
          title,
          summary: summaryText,
          contentText,
          paragraphs: extractedParagraphs,
          sourceName: feed.name,
          sourceUrl: raw.link || null,
          language: feed.language || 'en',
        });
        title = rewritten.title;
        summary = rewritten.summary;
        htmlContent = rewritten.htmlContent;
        metaTitle = rewritten.metaTitle;
        metaDescription = rewritten.metaDescription;
      } else if (feed.rewrite_mode === 'raw') {
        const cleanRaw = sanitizeRssHtml(raw.content || raw.summary);
        htmlContent =
          extractedParagraphs.length > 1
            ? buildAttributionHtml(summaryText, feed.name, raw.link || null, extractedParagraphs)
            : cleanRaw
              ? `${cleanRaw}\n${buildAttributionHtml('', feed.name, raw.link || null)}`
              : htmlContent;
      }

      const hash = crypto.createHash('sha256').update(sourceGuid).digest('hex').slice(0, 8);
      const slug = `${slugify(title) || 'story'}-${hash}`;
      const publishedAt = parseRssDate(raw.pubDate) || new Date().toISOString();
      const imageUrl = coverImage;
      const articleId = crypto.randomUUID();

      const res = await query(
        `INSERT INTO news_articles (
           id, title, slug, summary, content, image_url, author, author_id,
           source, source_guid, source_url, canonical_url, category_id, language,
           meta_title, meta_description, published_at, is_published, created_at, updated_at
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW(),NOW())
         ON CONFLICT (slug) DO NOTHING`,
        [
          articleId,
          title,
          slug,
          summary,
          htmlContent,
          imageUrl,
          feed.author_name || raw.author || feed.name,
          feed.author_id || null,
          feed.name,
          sourceGuid,
          raw.link || null,
          raw.link || null,
          feed.category_id || null,
          feed.language || 'en',
          metaTitle,
          metaDescription,
          publishedAt,
          Boolean(feed.auto_publish),
        ],
      );

      if (res.rowCount > 0) {
        inserted += 1;
        await linkRssArticleEntities(articleId, `${title} ${summaryText}`);
      } else {
        skippedDup += 1;
      }
    }

    await query(
      `UPDATE rss_feed_sources
       SET last_synced_at = NOW(), last_status = 'ok', last_error = NULL,
           articles_imported = articles_imported + $2, updated_at = NOW()
       WHERE id = $1`,
      [feed.id, inserted],
    );
    await markSynced('rss-db', feed.id, ttlMs);
    if (inserted > 0 && feed.auto_publish) {
      await redis.del(redisKeys.newsList());
    }

    log.info('db rss feed synced', {
      name: feed.name,
      entries: entries.length,
      inserted,
      skippedFilter,
      skippedDup,
    });
    return { source: feed.name, entries: entries.length, inserted, skippedFilter, skippedDup };
  } catch (err) {
    log.error('db rss feed sync failed', { name: feed.name, url: feed.url, error: err.message });
    await query(
      `UPDATE rss_feed_sources
       SET last_synced_at = NOW(), last_status = 'error', last_error = $2, updated_at = NOW()
       WHERE id = $1`,
      [feed.id, String(err.message || err).slice(0, 500)],
    ).catch(() => {});
    return null;
  }
}

async function syncDbRssSources() {
  let rows = [];
  try {
    const res = await query(
      `SELECT f.*, a.name AS author_name
       FROM rss_feed_sources f
       LEFT JOIN authors a ON a.id = f.author_id
       WHERE f.enabled = true
       ORDER BY f.created_at ASC`,
    );
    rows = res.rows || [];
  } catch (err) {
    // Table may not exist yet before migrations run.
    log.debug('rss_feed_sources table unavailable', { error: err.message });
    return [];
  }

  const results = [];
  for (const feed of rows) {
    const res = await syncDbRssFeed(feed);
    if (res) results.push(res);
  }
  return results;
}

export async function syncAllNewsSources() {
  const dbRssResults = await syncDbRssSources();
  const rssResults = await syncRssSources();
  let cricbuzzResult = null;
  try {
    cricbuzzResult = await syncCricbuzzNews();
  } catch (err) {
    log.error('cricbuzz news sync failed', { error: err.message });
  }
  const combined = [...dbRssResults, ...rssResults];
  return cricbuzzResult ? [...combined, cricbuzzResult] : combined;
}

export async function startNewsSync() {
  try {
    await syncAllNewsSources();
  } catch (err) {
    log.error('initial news sync failed', { error: err.message });
  }
  if (NEWS_SYNC_INTERVAL_MS > 0) {
    setInterval(() => {
      syncAllNewsSources().catch((err) =>
        log.error('news periodic sync failed', { error: err.message }),
      );
    }, NEWS_SYNC_INTERVAL_MS);
  }
}
