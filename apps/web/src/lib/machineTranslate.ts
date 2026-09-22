import { looksLikeUrdu } from '../utils/locale';
import type { NewsLanguage } from '../utils/newsConstraints';

const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';
const MAX_QUERY_BYTES = 450;
const PACK_SEP = '\n§\n';
const CONCURRENCY = 3;

export interface NewsCopyFields {
  title: string;
  summary: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
}

function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function chunkPlain(text: string): string[] {
  if (utf8Bytes(text) <= MAX_QUERY_BYTES) return [text];
  const pieces = text.split(/(\s+)/);
  const chunks: string[] = [];
  let current = '';
  for (const piece of pieces) {
    if (utf8Bytes(current + piece) > MAX_QUERY_BYTES) {
      if (current.trim()) chunks.push(current);
      current = piece.trimStart();
    } else {
      current += piece;
    }
  }
  if (current) chunks.push(current);
  return chunks.filter((chunk) => chunk.length > 0);
}

async function mapPool<T, R>(items: T[], limit: number, worker: (_item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function run(): Promise<void> {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}

function readTranslatedText(payload: unknown): string {
  const row = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const data = row.responseData && typeof row.responseData === 'object'
    ? (row.responseData as Record<string, unknown>)
    : {};
  const text = typeof data.translatedText === 'string' ? data.translatedText.trim() : '';
  const status = Number(row.responseStatus);
  if (status !== 200 || !text || /MYMEMORY WARNING/i.test(text)) {
    throw new Error(typeof row.responseDetails === 'string' && row.responseDetails
      ? row.responseDetails
      : 'Translation request failed');
  }
  return text;
}

async function translateChunk(text: string, from: NewsLanguage, to: NewsLanguage): Promise<string> {
  const url = new URL(MYMEMORY_URL);
  url.searchParams.set('q', text);
  url.searchParams.set('langpair', `${from}|${to}`);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Translation request failed (${res.status})`);
  return readTranslatedText(await res.json());
}

export async function translatePlain(text: string, from: NewsLanguage, to: NewsLanguage): Promise<string> {
  const source = text.trim();
  if (!source) return text;
  if (from === 'en' && to === 'ur' && looksLikeUrdu(source)) return text;
  if (from === 'ur' && to === 'en' && !looksLikeUrdu(source)) return text;
  const chunks = chunkPlain(source);
  const parts = await mapPool(chunks, CONCURRENCY, (chunk) => translateChunk(chunk, from, to));
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function packTexts(texts: string[]): string[][] {
  const groups: string[][] = [];
  let group: string[] = [];
  let size = 0;
  for (const text of texts) {
    const extra = utf8Bytes(text) + (group.length ? utf8Bytes(PACK_SEP) : 0);
    if (group.length && size + extra > MAX_QUERY_BYTES) {
      groups.push(group);
      group = [text];
      size = utf8Bytes(text);
    } else {
      group.push(text);
      size += extra;
    }
  }
  if (group.length) groups.push(group);
  return groups;
}

async function translateMany(texts: string[], from: NewsLanguage, to: NewsLanguage): Promise<string[]> {
  const groups = packTexts(texts);
  const translatedGroups = await mapPool(groups, CONCURRENCY, async (group) => {
    if (group.length === 1) return [await translatePlain(group[0], from, to)];
    const packed = await translatePlain(group.join(PACK_SEP), from, to);
    const split = packed.split(/\s*§\s*/);
    if (split.length === group.length) return split;
    return Promise.all(group.map((item) => translatePlain(item, from, to)));
  });
  return translatedGroups.flat();
}

export async function translateHtml(html: string, from: NewsLanguage, to: NewsLanguage): Promise<string> {
  if (!html.trim()) return html;
  const tokens = html.split(/(<[^>]+>)/g);
  const indexes: number[] = [];
  const sources: string[] = [];
  tokens.forEach((token, index) => {
    if (!token || token.startsWith('<')) return;
    const plain = decodeEntities(token);
    if (!plain.trim()) return;
    indexes.push(index);
    sources.push(plain);
  });
  if (!sources.length) return html;
  const translated = await translateMany(sources, from, to);
  indexes.forEach((tokenIndex, i) => {
    tokens[tokenIndex] = escapeHtml(translated[i] || sources[i]);
  });
  return tokens.join('');
}

export async function translateNewsCopy(
  fields: NewsCopyFields,
  from: NewsLanguage,
  to: NewsLanguage,
): Promise<NewsCopyFields> {
  if (from === to) return fields;
  const [title, summary, content, metaTitle, metaDescription] = await Promise.all([
    translatePlain(fields.title, from, to),
    translatePlain(fields.summary, from, to),
    translateHtml(fields.content, from, to),
    translatePlain(fields.metaTitle, from, to),
    translatePlain(fields.metaDescription, from, to),
  ]);
  return { title, summary, content, metaTitle, metaDescription };
}
