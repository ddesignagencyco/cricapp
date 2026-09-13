import crypto from 'crypto';
import { query } from './db.js';
import redis from './redis.js';
import { redisKeys } from './schemas.js';
import { createLogger } from './logger.js';
import { shouldSync, markSynced } from './refState.js';

const log = createLogger('news');

const NEWS_SYNC_INTERVAL_MS = Number(process.env.NEWS_SYNC_INTERVAL_MS || 3600000);
const NEWS_SOURCES_JSON = process.env.NEWS_SOURCES || '[]';

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function unescapeHtml(text) {
  if (!text) return text;
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  if (!m) return null;
  let text = m[1].trim();
  text = text.replace(/<!\[CDATA\[(.*?)\]\]>/s, '$1');
  return unescapeHtml(text);
}

function extractAttr(xml, tag, attr) {
  const m = xml.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"[^>]*>`));
  return m ? m[1] : null;
}

function parseFeed(xml) {
  const items = [];

  // RSS 2.0
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = match[1];
    items.push({
      title: extractTag(block, 'title'),
      link: extractTag(block, 'link'),
      summary: extractTag(block, 'description'),
      content: extractTag(block, 'content:encoded'),
      pubDate: extractTag(block, 'pubDate'),
      guid: extractTag(block, 'guid'),
      author: extractTag(block, 'author') || extractTag(block, 'dc:creator'),
      enclosureUrl: extractAttr(block, 'enclosure', 'url'),
      mediaThumbnail: extractAttr(block, 'media:thumbnail', 'url'),
    });
  }

  // Atom
  if (!items.length) {
    for (const match of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
      const block = match[1];
      items.push({
        title: extractTag(block, 'title'),
        link: extractAttr(block, 'link', 'href'),
        summary: extractTag(block, 'summary'),
        content: extractTag(block, 'content'),
        pubDate: extractTag(block, 'published') || extractTag(block, 'updated'),
        guid: extractTag(block, 'id'),
        author: extractTag(block, 'name'),
        enclosureUrl: extractAttr(block, 'enclosure', 'url') || extractAttr(block, 'link', 'href'),
        mediaThumbnail: extractAttr(block, 'media:thumbnail', 'url'),
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

function normalizeArticle(raw, sourceName, defaultCategory) {
  const title = raw.title || 'Untitled';
  const link = raw.link || raw.guid || '';
  const hash = crypto.createHash('sha256').update(link).digest('hex').slice(0, 8);
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
    tags: [],
    publishedAt: pubDate,
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
/* Storage helpers (mirrors store.js patterns)                        */
/* ------------------------------------------------------------------ */

const upsertNewsCategory = `
  INSERT INTO news_categories (id, name, slug) VALUES ($1, $2, $3)
  ON CONFLICT (slug) DO NOTHING
`;

export async function ensureNewsCategory(name) {
  const slug = slugify(name);
  const existing = await query(`SELECT id FROM news_categories WHERE slug = $1`, [slug]);
  if (existing.rows.length) return existing.rows[0].id;

  const id = crypto.randomUUID();
  await query(upsertNewsCategory, [id, name, slug]);
  const r = await query(`SELECT id FROM news_categories WHERE slug = $1`, [slug]);
  return r.rows[0].id;
}

export async function saveNewsArticles(articles) {
  let inserted = 0;
  let updated = 0;

  for (const article of articles) {
    const existing = await query(
      `SELECT id FROM news_articles WHERE source = $1 AND title = $2`,
      [article.source, article.title],
    );

    if (existing.rows.length > 0) {
      await query(
        `UPDATE news_articles SET
           summary = COALESCE($1, summary),
           content = COALESCE($2, content),
           image_url = COALESCE($3, image_url),
           author = COALESCE($4, author),
           category_id = COALESCE($5, category_id),
           published_at = COALESCE($6, published_at),
           updated_at = NOW()
         WHERE id = $7`,
        [
          article.summary,
          article.content,
          article.imageUrl,
          article.author,
          article.categoryId,
          article.publishedAt,
          existing.rows[0].id,
        ],
      );
      updated++;
    } else {
      await query(
        `INSERT INTO news_articles (id, title, slug, summary, content, image_url, author, source, category_id, published_at, is_published, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, NOW(), NOW())`,
        [
          crypto.randomUUID(),
          article.title,
          article.slug,
          article.summary,
          article.content,
          article.imageUrl,
          article.author,
          article.source,
          article.categoryId,
          article.publishedAt,
        ],
      );
      inserted++;
    }
  }

  return { inserted, updated };
}

/* ------------------------------------------------------------------ */
/* Testable helpers (exported for unit tests)                         */
/* ------------------------------------------------------------------ */

export { parseFeed, normalizeArticle, slugify, unescapeHtml };

/* ------------------------------------------------------------------ */
/* Public API                                                         */
/* ------------------------------------------------------------------ */

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

  // Invalidate any cached news lists so the read API serves fresh data.
  await redis.del(redisKeys.newsList());

  log.info('news source synced', { source, entries: entries.length, inserted, updated });
  return { source, entries: entries.length, inserted, updated };
}

export async function syncAllNewsSources() {
  let sources;
  try {
    sources = JSON.parse(NEWS_SOURCES_JSON);
  } catch (err) {
    log.error('invalid NEWS_SOURCES env var', { error: err.message });
    return [];
  }

  if (!Array.isArray(sources) || !sources.length) {
    log.debug('no news sources configured');
    return [];
  }

  const results = [];
  for (const source of sources) {
    try {
      const res = await syncNewsSource(source);
      if (res) results.push(res);
    } catch (err) {
      log.error('news source sync failed', { source: source?.source, url: source?.url, error: err.message });
    }
  }
  return results;
}

export async function startNewsSync() {
  await syncAllNewsSources();
  if (NEWS_SYNC_INTERVAL_MS > 0) {
    setInterval(() => {
      syncAllNewsSources().catch((err) => log.error('news periodic sync failed', { error: err.message }));
    }, NEWS_SYNC_INTERVAL_MS);
  }
}
