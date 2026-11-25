import { buildAttributionHtml, htmlEscape } from './rssFilter.js';

const OPENCODE_GO_BASE_URL = 'https://opencode.ai/zen/go/v1';
const OPENCODE_GO_DEFAULT_MODEL = 'glm-5.3-flash';

function resolveProvider() {
  const configured = (process.env.NARRATIVE_PROVIDER || '').trim().toLowerCase();
  if (configured === 'template' || configured === 'openai' || configured === 'opencode') {
    return configured;
  }
  if (process.env.OPENCODE_API_KEY) return 'opencode';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return 'template';
}

/**
 * Rewrites a matched RSS item into original CriczApp editorial copy via the
 * configured OpenAI-compatible LLM provider. Falls back to sanitized summary +
 * source attribution when no API key is configured or the provider fails.
 */
export async function rewriteRssItem({
  title,
  summary,
  contentText,
  paragraphs = [],
  sourceName,
  sourceUrl,
  language = 'en',
}) {
  const fallbackParagraphs = Array.isArray(paragraphs) ? paragraphs.slice(0, 6) : [];
  const fallbackSummary = (summary || fallbackParagraphs[0] || contentText || title || '').slice(0, 320);
  const fallback = {
    title,
    summary: fallbackSummary,
    htmlContent: buildAttributionHtml(fallbackSummary, sourceName, sourceUrl, fallbackParagraphs),
    metaTitle: String(title || '').slice(0, 70),
    metaDescription: fallbackSummary.slice(0, 160),
    usedAi: false,
  };

  const provider = resolveProvider();
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
    language === 'ur'
      ? 'Write the article in natural, journalistic Urdu.'
      : 'Write the article in crisp, journalistic English.';

  const prompt = [
    'You are a senior cricket editor at CriczApp.',
    langInstruction,
    'Rewrite the following cricket news facts into an original, engaging 3-4 paragraph article.',
    'Do NOT invent quotes, scores, or facts not present in the source. Do NOT copy sentences verbatim.',
    'Return ONLY valid JSON with keys: "title" (<= 95 chars), "summary" (1-2 sentences, <= 220 chars), "paragraphs" (array of 3-4 plain-text paragraphs), "metaDescription" (<= 155 chars).',
    '',
    `Source: ${sourceName}`,
    `Original Headline: ${title}`,
    `Original Facts: ${(contentText || summary || title).slice(0, 2000)}`,
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
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content?.trim() || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallback;
    const parsed = JSON.parse(jsonMatch[0]);
    const paragraphs = Array.isArray(parsed.paragraphs)
      ? parsed.paragraphs.map((p) => String(p).trim()).filter(Boolean)
      : [];
    if (!parsed.title || !paragraphs.length) return fallback;

    const sourceLink = sourceUrl
      ? `<a href="${htmlEscape(sourceUrl)}" target="_blank" rel="noopener noreferrer nofollow">${htmlEscape(sourceName)}</a>`
      : htmlEscape(sourceName);
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
