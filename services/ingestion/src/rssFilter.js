import crypto from 'node:crypto';

export function htmlEscape(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function stripHtmlToText(html) {
  if (!html) return '';
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeRssHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[^>]*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\sstyle\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
}

export function extractFirstImgSrc(html) {
  if (!html) return null;
  const m = String(html).match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
  return m ? m[1] : null;
}

function keywordMatches(haystack, keyword) {
  const clean = String(keyword || '').trim().toLowerCase();
  if (!clean) return false;
  const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:$|[^\\p{L}\\p{N}])`, 'iu').test(haystack);
}

/**
 * Topic/keyword filter for RSS items.
 * - Any excludeKeyword match immediately rejects the item.
 * - Empty includeKeywords accepts all non-excluded items.
 * - Non-empty includeKeywords requires at least one word-boundary match.
 */
export function matchesTopicFilter(item, includeKeywords = [], excludeKeywords = []) {
  const haystack = [
    item?.title,
    stripHtmlToText(item?.summary),
    ...(Array.isArray(item?.categories) ? item.categories : []),
  ]
    .filter(Boolean)
    .join(' ');

  for (const ex of excludeKeywords || []) {
    if (keywordMatches(haystack, ex)) {
      return { matched: false, matchedKeywords: [], excludedBy: String(ex).trim() };
    }
  }

  const includes = (includeKeywords || []).map((k) => String(k).trim()).filter(Boolean);
  if (!includes.length) {
    return { matched: true, matchedKeywords: [], excludedBy: null };
  }

  const matchedKeywords = includes.filter((k) => keywordMatches(haystack, k));
  return {
    matched: matchedKeywords.length > 0,
    matchedKeywords,
    excludedBy: null,
  };
}

export function buildSourceGuid(feedUrl, item) {
  const key = `${feedUrl}::${item?.guid || item?.link || item?.title || ''}`;
  return `rss:${crypto.createHash('sha256').update(key).digest('hex').slice(0, 32)}`;
}

export function buildAttributionHtml(summaryText, sourceName, sourceUrl) {
  const body = summaryText ? `<p>${htmlEscape(summaryText)}</p>` : '';
  const link = sourceUrl
    ? `<a href="${htmlEscape(sourceUrl)}" target="_blank" rel="noopener noreferrer nofollow">${htmlEscape(sourceName)}</a>`
    : htmlEscape(sourceName);
  return `${body}\n<p class="rss-attribution"><em>Originally reported by ${link}.</em></p>`.trim();
}
