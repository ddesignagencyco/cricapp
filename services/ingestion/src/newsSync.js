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

function parseFeed(xml) {
  const items = [];

  // RSS 2.0
  for (const match of String(xml).matchAll(/<item>([\s\S]*?)<\/item>/g)) {
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
    for (const match of String(xml).matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
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
  const context = s.context || d.context || s.storyType || 'Cricket News';
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
    categoryName: context || 'Cricket News',
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

export async function syncAllNewsSources() {
  const rssResults = await syncRssSources();
  let cricbuzzResult = null;
  try {
    cricbuzzResult = await syncCricbuzzNews();
  } catch (err) {
    log.error('cricbuzz news sync failed', { error: err.message });
  }
  return cricbuzzResult ? [...rssResults, cricbuzzResult] : rssResults;
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
