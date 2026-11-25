import { BadRequestException } from '@nestjs/common';
import crypto from 'node:crypto';
import {
  OPENCODE_GO_BASE_URL,
  OPENCODE_GO_DEFAULT_MODEL,
  resolveNarrativeProvider,
} from '../common/narrative-provider.util.js';

export interface ParsedFeedItem {
  title: string;
  link: string;
  guid: string;
  summary: string | null;
  content: string | null;
  pubDate: string | null;
  author: string | null;
  imageUrl: string | null;
  categories: string[];
}

export interface TopicFilterResult {
  matched: boolean;
  matchedKeywords: string[];
  excludedBy: string | null;
}

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /\.local$/i,
  /\.internal$/i,
];

/** Reject non-HTTP(S) schemes and private/loopback hosts to prevent SSRF. */
export function assertSafeFeedUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new BadRequestException('Invalid RSS feed URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestException('RSS feed URL must use http or https');
  }
  const host = parsed.hostname.replace(/^\[|\]$/g, '');
  if (!host || PRIVATE_HOST_PATTERNS.some((rx) => rx.test(host))) {
    throw new BadRequestException('Private or loopback feed URLs are not allowed');
  }
  return parsed;
}

export function slugifyText(text: string): string {
  return String(text || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120);
}

export function htmlEscape(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function unescapeXml(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/gi, ' ');
}

function extractTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (!m) return null;
  let text = m[1].trim();
  const cdata = text.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cdata) text = cdata[1].trim();
  return unescapeXml(text);
}

function extractAllTags(xml: string, tag: string): string[] {
  const out: string[] = [];
  const rx = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  for (const m of xml.matchAll(rx)) {
    let text = m[1].trim();
    const cdata = text.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
    if (cdata) text = cdata[1].trim();
    const cleaned = unescapeXml(text).trim();
    if (cleaned) out.push(cleaned);
  }
  return out;
}

function extractAttr(xml: string, tag: string, attr: string): string | null {
  const rx = new RegExp(`<${tag}[^>]*\\b${attr}=["']([^"']+)["'][^>]*>`, 'i');
  const m = xml.match(rx);
  return m ? unescapeXml(m[1]).trim() : null;
}

function extractFirstImgSrc(html: string | null): string | null {
  if (!html) return null;
  const m = html.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
  return m ? m[1] : null;
}

export function stripHtmlToText(html: string | null | undefined): string {
  if (!html) return '';
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Strict sanitizer for RSS HTML snippets: removes scripts, iframes, styles, and event handlers. */
export function sanitizeRssHtml(html: string | null | undefined): string {
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

export function parseRssOrAtomXml(xml: string): ParsedFeedItem[] {
  const items: ParsedFeedItem[] = [];

  // RSS 2.0 <item>
  for (const match of xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)) {
    const block = match[1];
    const title = stripHtmlToText(extractTag(block, 'title'));
    if (!title) continue;
    const link = extractTag(block, 'link') || '';
    const rawGuid = extractTag(block, 'guid') || link || title;
    const summary = extractTag(block, 'description');
    const content = extractTag(block, 'content:encoded');
    const imageUrl =
      extractAttr(block, 'media:content', 'url') ||
      extractAttr(block, 'media:thumbnail', 'url') ||
      extractAttr(block, 'enclosure', 'url') ||
      extractFirstImgSrc(content) ||
      extractFirstImgSrc(summary);
    items.push({
      title,
      link,
      guid: rawGuid,
      summary,
      content,
      pubDate: extractTag(block, 'pubDate') || extractTag(block, 'dc:date'),
      author: extractTag(block, 'dc:creator') || extractTag(block, 'author'),
      imageUrl: imageUrl && /^https?:\/\//i.test(imageUrl) ? imageUrl : null,
      categories: extractAllTags(block, 'category'),
    });
  }

  // Atom <entry>
  if (!items.length) {
    for (const match of xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi)) {
      const block = match[1];
      const title = stripHtmlToText(extractTag(block, 'title'));
      if (!title) continue;
      const link = extractAttr(block, 'link', 'href') || '';
      const rawGuid = extractTag(block, 'id') || link || title;
      const summary = extractTag(block, 'summary');
      const content = extractTag(block, 'content');
      const imageUrl =
        extractAttr(block, 'media:content', 'url') ||
        extractAttr(block, 'media:thumbnail', 'url') ||
        extractFirstImgSrc(content) ||
        extractFirstImgSrc(summary);
      items.push({
        title,
        link,
        guid: rawGuid,
        summary,
        content,
        pubDate: extractTag(block, 'published') || extractTag(block, 'updated'),
        author: extractTag(block, 'name'),
        imageUrl: imageUrl && /^https?:\/\//i.test(imageUrl) ? imageUrl : null,
        categories: extractAllTags(block, 'category'),
      });
    }
  }

  return items;
}

function keywordMatches(haystack: string, keyword: string): boolean {
  const clean = keyword.trim().toLowerCase();
  if (!clean) return false;
  const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:$|[^\\p{L}\\p{N}])`, 'iu').test(haystack);
}

/**
 * Filter a parsed RSS item against includeKeywords & excludeKeywords.
 * - Any matching excludeKeyword rejects the item immediately.
 * - If includeKeywords is empty, all non-excluded items match.
 * - Otherwise at least one includeKeyword must match in title, summary, or categories.
 */
export function evaluateTopicFilter(
  item: Pick<ParsedFeedItem, 'title' | 'summary' | 'categories'>,
  includeKeywords: string[] = [],
  excludeKeywords: string[] = [],
): TopicFilterResult {
  const haystack = [
    item.title,
    stripHtmlToText(item.summary),
    ...(item.categories || []),
  ]
    .filter(Boolean)
    .join(' ');

  for (const ex of excludeKeywords) {
    if (keywordMatches(haystack, ex)) {
      return { matched: false, matchedKeywords: [], excludedBy: ex.trim() };
    }
  }

  const normalizedIncludes = includeKeywords.map((k) => k.trim()).filter(Boolean);
  if (!normalizedIncludes.length) {
    return { matched: true, matchedKeywords: [], excludedBy: null };
  }

  const matchedKeywords = normalizedIncludes.filter((k) => keywordMatches(haystack, k));
  return {
    matched: matchedKeywords.length > 0,
    matchedKeywords,
    excludedBy: null,
  };
}

export function buildSourceGuid(feedUrl: string, item: Pick<ParsedFeedItem, 'guid' | 'link' | 'title'>): string {
  const key = `${feedUrl}::${item.guid || item.link || item.title}`;
  return `rss:${crypto.createHash('sha256').update(key).digest('hex').slice(0, 32)}`;
}

export function buildAttributionHtml(
  summaryText: string,
  sourceName: string,
  sourceUrl: string | null,
  paragraphs?: string[],
): string {
  const cleanParas = (paragraphs || []).map((p) => p.trim()).filter(Boolean);
  const body = cleanParas.length
    ? cleanParas.map((p) => `<p>${htmlEscape(p)}</p>`).join('\n')
    : summaryText
      ? `<p>${htmlEscape(summaryText)}</p>`
      : '';
  const sourceLink = sourceUrl
    ? `<a href="${htmlEscape(sourceUrl)}" target="_blank" rel="noopener noreferrer nofollow">${htmlEscape(sourceName)}</a>`
    : htmlEscape(sourceName);
  return `${body}\n<p class="rss-attribution"><em>Originally reported by ${sourceLink}.</em></p>`.trim();
}

const BOILERPLATE_RX =
  /^(sign in|log in|subscribe|cookie|privacy policy|terms of|share this|follow us|advertisement|related topics|more on this story|watch:|listen:|get the latest|external link|bbc is not responsible|copyright|all rights reserved)/i;

function extractMetaImage(html: string): string | null {
  const patterns = [
    /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["'](https?:\/\/[^"']+)["']/i,
    /<meta[^>]+content=["'](https?:\/\/[^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i,
  ];
  for (const rx of patterns) {
    const m = html.match(rx);
    if (m?.[1]) return unescapeXml(m[1]).trim();
  }
  return null;
}

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function extractJsonLdArticleBody(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
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
            .map((p: string) => unescapeXml(stripHtmlToText(p)).trim())
            .filter((p: string) => p.length >= 45 && !BOILERPLATE_RX.test(p));
          if (chunks.length) out.push(...chunks);
        }
      }
    } catch {
      /* ignore malformed json-ld */
    }
  }
  return out;
}

export function extractArticleFromHtml(html: string): {
  paragraphs: string[];
  ogImage: string | null;
} {
  const ogImage = extractMetaImage(html);
  const seen = new Set<string>();
  const paragraphs: string[] = [];
  const pushPara = (raw: string) => {
    const text = unescapeXml(stripHtmlToText(raw)).trim();
    if (text.length < 45) return;
    if (BOILERPLATE_RX.test(text)) return;
    // Skip pure image-credit captions like "Player walks back • Getty Images"
    if (/\b(getty images|afp|reuters|ap photo|espn ltd)\s*$/i.test(text) && text.length < 140) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    paragraphs.push(text);
  };

  // 1. ESPNcricinfo & similar portals render body blocks in `.ci-html-content` divs
  for (const m of html.matchAll(/<div[^>]+class=["'][^"']*ci-html-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)) {
    pushPara(m[1]);
    if (paragraphs.length >= 10) break;
  }

  // 2. Standard <article> / <main> <p> extraction (BBC Sport, Wisden, Dawn, etc.)
  if (paragraphs.length < 2) {
    const articleMatch = html.match(/<article(?:\s[^>]*)?>([\s\S]*?)<\/article>/i);
    const mainMatch = html.match(/<main(?:\s[^>]*)?>([\s\S]*?)<\/main>/i);
    let region = articleMatch?.[1] || mainMatch?.[1] || html;
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
      if (paragraphs.length >= 10) break;
    }
  }

  // 3. JSON-LD articleBody fallback
  if (paragraphs.length < 2) {
    for (const chunk of extractJsonLdArticleBody(html)) {
      pushPara(chunk);
      if (paragraphs.length >= 10) break;
    }
  }

  // 4. Full-document <p> fallback (strips chrome)
  if (paragraphs.length < 2) {
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
      .replace(/<header[\s\S]*?<\/header>/gi, ' ')
      .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
      .replace(/<aside[\s\S]*?<\/aside>/gi, ' ')
      .replace(/<figcaption[\s\S]*?<\/figcaption>/gi, ' ');
    for (const m of cleaned.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi)) {
      pushPara(m[1]);
      if (paragraphs.length >= 10) break;
    }
  }

  return { paragraphs, ogImage };
}

/**
 * Fetches the linked source article page to extract full body paragraphs and
 * a high-resolution `og:image` when the RSS XML only provides a short teaser.
 */
export async function fetchSourceArticleDetails(
  url: string | null | undefined,
  timeoutMs = 12000,
): Promise<{ paragraphs: string[]; ogImage: string | null }> {
  if (!url) return { paragraphs: [], ogImage: null };
  try {
    assertSafeFeedUrl(url);
  } catch {
    return { paragraphs: [], ogImage: null };
  }
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

export async function fetchFeedXmlSafe(url: string, timeoutMs = 15000): Promise<string> {
  assertSafeFeedUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'CriczAppBot/1.0 (+https://criczapp.com)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export interface RewrittenArticle {
  title: string;
  summary: string;
  htmlContent: string;
  metaTitle: string;
  metaDescription: string;
  usedAi: boolean;
}

/**
 * Rewrite an RSS item into original CriczApp editorial copy using the configured
 * OpenAI-compatible narrative provider (opencode / openai). Falls back gracefully
 * to sanitized summary + attribution when no LLM key is configured.
 */
export async function rewriteRssItemWithAi(input: {
  title: string;
  summary: string;
  contentText: string;
  paragraphs?: string[];
  sourceName: string;
  sourceUrl: string | null;
  language: string;
}): Promise<RewrittenArticle> {
  const provider = resolveNarrativeProvider({
    provider: process.env.NARRATIVE_PROVIDER,
    openaiKey: process.env.OPENAI_API_KEY,
    opencodeKey: process.env.OPENCODE_API_KEY,
  });

  const fallbackParagraphs = (input.paragraphs || []).slice(0, 6);
  const fallbackSummary = (input.summary || fallbackParagraphs[0] || input.contentText || input.title).slice(0, 320);
  const fallback: RewrittenArticle = {
    title: input.title,
    summary: fallbackSummary,
    htmlContent: buildAttributionHtml(fallbackSummary, input.sourceName, input.sourceUrl, fallbackParagraphs),
    metaTitle: input.title.slice(0, 70),
    metaDescription: fallbackSummary.slice(0, 160),
    usedAi: false,
  };

  if (provider === 'template') return fallback;

  const isOpencode = provider === 'opencode';
  const apiKey = isOpencode ? process.env.OPENCODE_API_KEY : process.env.OPENAI_API_KEY;
  if (!apiKey) return fallback;

  const baseUrl = (
    isOpencode
      ? process.env.OPENCODE_BASE_URL || OPENCODE_GO_BASE_URL
      : process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
  ).replace(/\/$/, '');
  const model = isOpencode
    ? process.env.OPENCODE_MODEL || OPENCODE_GO_DEFAULT_MODEL
    : process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const langInstruction =
    input.language === 'ur'
      ? 'Write the article in natural, journalistic Urdu.'
      : 'Write the article in crisp, journalistic English.';

  const prompt = [
    'You are a senior cricket editor at CriczApp.',
    langInstruction,
    'Rewrite the following cricket news facts into a 100% original, engaging 3-4 paragraph article.',
    'Do NOT invent quotes, scores, or facts not present in the source. Do NOT copy sentences verbatim.',
    'Return ONLY valid JSON with keys: "title" (<= 95 chars), "summary" (1-2 sentences, <= 220 chars), "paragraphs" (array of 3-4 plain-text paragraphs), "metaDescription" (<= 155 chars).',
    '',
    `Source: ${input.sourceName}`,
    `Original Headline: ${input.title}`,
    `Original Facts: ${(input.contentText || input.summary || input.title).slice(0, 2000)}`,
  ].join('\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) return fallback;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data?.choices?.[0]?.message?.content?.trim() || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallback;
    const parsed = JSON.parse(jsonMatch[0]) as {
      title?: string;
      summary?: string;
      paragraphs?: string[];
      metaDescription?: string;
    };
    const paragraphs = Array.isArray(parsed.paragraphs)
      ? parsed.paragraphs.map((p) => String(p).trim()).filter(Boolean)
      : [];
    if (!parsed.title || !paragraphs.length) return fallback;

    const sourceLink = input.sourceUrl
      ? `<a href="${htmlEscape(input.sourceUrl)}" target="_blank" rel="noopener noreferrer nofollow">${htmlEscape(input.sourceName)}</a>`
      : htmlEscape(input.sourceName);
    const htmlBody = [
      ...paragraphs.map((p) => `<p>${htmlEscape(p)}</p>`),
      `<p class="rss-attribution"><em>Source: ${sourceLink}</em></p>`,
    ].join('\n');

    return {
      title: String(parsed.title).trim().slice(0, 140),
      summary: String(parsed.summary || paragraphs[0]).trim().slice(0, 320),
      htmlContent: htmlBody,
      metaTitle: String(parsed.title).trim().slice(0, 70),
      metaDescription: String(parsed.metaDescription || parsed.summary || paragraphs[0]).trim().slice(0, 160),
      usedAi: true,
    };
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}
