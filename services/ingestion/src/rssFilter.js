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
    .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, '$1')
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

export function buildAttributionHtml(summaryText, _sourceName, _sourceUrl, paragraphs = []) {
  const cleanParas = Array.isArray(paragraphs)
    ? paragraphs.map((p) => String(p || '').trim()).filter(Boolean)
    : [];
  const body = cleanParas.length
    ? cleanParas.map((p) => `<p>${htmlEscape(p)}</p>`).join('\n')
    : summaryText
      ? `<p>${htmlEscape(summaryText)}</p>`
      : '';
  return body.trim();
}

const BOILERPLATE_RX =
  /^(sign in|log in|subscribe|cookie|privacy policy|terms of|share this|follow us|advertisement|related topics|more on this story|watch:|listen:|get the latest|external link|bbc is not responsible|copyright|all rights reserved|also read:|read more:)/i;

export function isGenericPlaceholderImage(url) {
  if (!url) return true;
  return /news\.google\.com|lh3\.googleusercontent\.com\/(J6_coFbogxhRI9iM864NL_liGXvsQp2AupsKei7z0cNNfDvGUmWUy20nuUhkREQyrpY4bEeIBuc|proxy\/)/i.test(
    String(url),
  );
}

function unescapeEntities(text) {
  return String(text || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/gi, ' ');
}

function extractMetaImage(html) {
  const patterns = [
    /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["'](https?:\/\/[^"']+)["']/i,
    /<meta[^>]+content=["'](https?:\/\/[^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i,
  ];
  for (const rx of patterns) {
    const m = String(html).match(rx);
    if (m?.[1]) {
      const candidate = unescapeEntities(m[1]).trim();
      if (!isGenericPlaceholderImage(candidate)) return candidate;
    }
  }
  return null;
}

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function extractNextDataArticleBody(html) {
  const m = String(html).match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!m?.[1]) return [];
  const out = [];
  const BODY_KEYS = new Set(['articleBody', 'body', 'content', 'contentHtml', 'html', 'storyContent', 'paragraphs']);
  try {
    const root = JSON.parse(m[1].trim());
    const visit = (node, depth = 0) => {
      if (!node || depth > 12 || out.length >= 25) return;
      if (Array.isArray(node)) {
        for (const item of node) visit(item, depth + 1);
        return;
      }
      if (typeof node === 'object') {
        for (const [k, v] of Object.entries(node)) {
          if (BODY_KEYS.has(k) && typeof v === 'string' && v.length >= 60) {
            const chunks = v
              .split(/<\/p>|\n{2,}|\r\n\r\n/i)
              .map((p) => unescapeEntities(stripHtmlToText(p)).trim())
              .filter((p) => p.length >= 45 && !BOILERPLATE_RX.test(p));
            out.push(...chunks);
          } else if (v && typeof v === 'object') {
            visit(v, depth + 1);
          }
        }
      }
    };
    visit(root);
  } catch {
    /* ignore malformed __NEXT_DATA__ */
  }
  return out.slice(0, 25);
}

function extractJsonLdArticleBody(html) {
  const out = [];
  for (const m of String(html).matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const nodes = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.['@graph'])
          ? parsed['@graph']
          : [parsed];
      for (const node of nodes) {
        if (typeof node?.articleBody === 'string' && node.articleBody.trim().length > 80) {
          const chunks = node.articleBody
            .split(/\n{2,}|\r\n\r\n/)
            .map((p) => unescapeEntities(stripHtmlToText(p)).trim())
            .filter((p) => p.length >= 45 && !BOILERPLATE_RX.test(p));
          if (chunks.length) out.push(...chunks);
        }
      }
    } catch {
      /* ignore malformed json-ld */
    }
  }
  return out;
}

export function extractArticleFromHtml(html) {
  const src = String(html || '');
  const ogImage = extractMetaImage(src);
  const seen = new Set();
  const paragraphs = [];
  const pushPara = (raw) => {
    const text = unescapeEntities(stripHtmlToText(raw)).trim();
    if (text.length < 45) return;
    if (BOILERPLATE_RX.test(text)) return;
    if (/\b(getty images|afp|reuters|ap photo|espn ltd)\s*$/i.test(text) && text.length < 140) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    paragraphs.push(text);
  };

  for (const m of src.matchAll(/<div[^>]+class=["'][^"']*ci-html-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)) {
    pushPara(m[1]);
    if (paragraphs.length >= 25) break;
  }

  if (paragraphs.length < 2) {
    const cmsRx =
      /<(?:div|section)[^>]+class=["'][^"']*(?:story__content|article-content|article-body|entry-content|post-content|wp-block-post-content|td-post-content|story-detail|detail-content)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section)>/gi;
    for (const block of src.matchAll(cmsRx)) {
      for (const p of block[1].matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi)) {
        pushPara(p[1]);
        if (paragraphs.length >= 25) break;
      }
      if (paragraphs.length >= 25) break;
    }
  }

  if (paragraphs.length < 2) {
    const articleMatch = src.match(/<article(?:\s[^>]*)?>([\s\S]*?)<\/article>/i);
    const mainMatch = src.match(/<main(?:\s[^>]*)?>([\s\S]*?)<\/main>/i);
    let region = articleMatch?.[1] || mainMatch?.[1] || src;
    region = region
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
      .replace(/<header[\s\S]*?<\/header>/gi, ' ')
      .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
      .replace(/<aside[\s\S]*?<\/aside>/gi, ' ')
      .replace(/<figcaption[\s\S]*?<\/figcaption>/gi, ' ');

    for (const m of region.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi)) {
      pushPara(m[1]);
      if (paragraphs.length >= 25) break;
    }
  }

  if (paragraphs.length < 2) {
    for (const chunk of extractJsonLdArticleBody(src)) {
      pushPara(chunk);
      if (paragraphs.length >= 25) break;
    }
  }

  if (paragraphs.length < 2) {
    for (const chunk of extractNextDataArticleBody(src)) {
      pushPara(chunk);
      if (paragraphs.length >= 25) break;
    }
  }

  if (paragraphs.length < 2) {
    const cleaned = src
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
      .replace(/<header[\s\S]*?<\/header>/gi, ' ')
      .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
      .replace(/<aside[\s\S]*?<\/aside>/gi, ' ')
      .replace(/<figcaption[\s\S]*?<\/figcaption>/gi, ' ');
    for (const m of cleaned.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi)) {
      pushPara(m[1]);
      if (paragraphs.length >= 25) break;
    }
  }

  return { paragraphs, ogImage };
}

export async function fetchSourceArticleDetails(url, timeoutMs = 12000) {
  if (!url || !/^https?:\/\//i.test(url)) return { paragraphs: [], ogImage: null };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) return { paragraphs: [], ogImage: null };
    const html = await res.text();
    return extractArticleFromHtml(html);
  } catch {
    return { paragraphs: [], ogImage: null };
  } finally {
    clearTimeout(timer);
  }
}
