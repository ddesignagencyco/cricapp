const ALLOWED_TAGS = new Set([
  'p', 'br', 'h2', 'h3', 'strong', 'b', 'em', 'i', 'u', 's',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a', 'img', 'hr',
]);

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function readAttribute(source: string, name: string): string {
  const match = source.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))`, 'i'));
  return (match?.[1] || match?.[2] || match?.[3] || '').trim();
}

function safeUrl(value: string, allowDataImage = false): string {
  if (!value) return '';
  if (value.startsWith('/') || value.startsWith('#')) return value;
  try {
    const url = new URL(value);
    if (url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:') return value;
    if (allowDataImage && /^data:image\/(?:png|gif|jpeg|webp);base64,/i.test(value)) return value;
  } catch {
    return '';
  }
  return '';
}

/** Conservative allow-list sanitizer for CMS-authored article HTML. */
export function sanitizeArticleHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<\/?([a-z][a-z0-9]*)([^>]*)>/gi, (full, rawTag: string, attributes: string) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return '';
    if (full.startsWith('</')) return `</${tag}>`;
    if (tag === 'a') {
      const href = safeUrl(readAttribute(attributes, 'href'));
      return href ? `<a href="${escapeAttribute(href)}" rel="noopener noreferrer">` : '<a>';
    }
    if (tag === 'img') {
      const src = safeUrl(readAttribute(attributes, 'src'), true);
      if (!src) return '';
      const alt = escapeAttribute(readAttribute(attributes, 'alt'));
      return `<img src="${escapeAttribute(src)}" alt="${alt}" loading="lazy">`;
    }
    return tag === 'br' || tag === 'hr' ? `<${tag}>` : `<${tag}>`;
  });
}
