import EditorialLayout from './EditorialLayout';
import type { EditorialTocItem } from './EditorialLayout';
import EmptyState from './EmptyState';
import { sanitizeArticleHtml } from '../utils/sanitizeHtml';
import type { EditorialPage } from '../services/editorial';

function slugifyHeading(text: string, used: Set<string>): string {
  const base =
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'section';
  let id = base;
  let n = 2;
  while (used.has(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  used.add(id);
  return id;
}

function stripMatchingTitle(html: string, title: string): string {
  const match = html.match(/^\s*<h1>([\s\S]*?)<\/h1>/i);
  if (!match) return html;
  const inner = match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  if (inner.toLowerCase() !== title.trim().toLowerCase()) return html;
  return html.slice(match[0].length).trim();
}

function decorateHeadings(html: string): { html: string; toc: EditorialTocItem[] } {
  const used = new Set<string>();
  const toc: EditorialTocItem[] = [];
  const decorated = html.replace(/<(h[23])>([\s\S]*?)<\/\1>/gi, (full, tag: string, inner: string) => {
    const label = inner.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!label) return full;
    const id = slugifyHeading(label, used);
    toc.push({ id, label });
    return `<${tag.toLowerCase()} id="${id}">${inner}</${tag.toLowerCase()}>`;
  });
  return { html: decorated, toc };
}

function stripLeadingMeta(html: string, title: string): string {
  let next = stripMatchingTitle(html, title);
  next = next.replace(/^\s*<p>\s*Last updated:[^<]*<\/p>/i, '').trim();
  return next;
}

function toEditorialHtml(page: EditorialPage): { html: string; toc: EditorialTocItem[] } {
  const raw = page.content.includes('<')
    ? sanitizeArticleHtml(page.content)
    : sanitizeArticleHtml(
        page.content
          .split(/\n{2,}/)
          .map((block) => `<p>${block.replace(/\n/g, '<br/>')}</p>`)
          .join('')
      );
  return decorateHeadings(stripLeadingMeta(raw, page.title));
}

function normalizeBrandContent(text: string): string {
  if (!text) return text;
  return text
    .replace(/About CricApp/g, 'About CriczApp')
    .replace(/\bCricApp\b/g, 'CriczApp');
}

export default function EditorialDocument({ page }: { page: EditorialPage }) {
  const normalizedTitle = normalizeBrandContent(page.title);
  const normalizedContent = normalizeBrandContent(page.content);
  const { html, toc } = toEditorialHtml({ ...page, title: normalizedTitle, content: normalizedContent });
  const hasBody = html.replace(/<[^>]+>/g, '').trim().length > 0;

  return (
    <EditorialLayout title={normalizedTitle} slug={page.slug} updatedAt={page.updatedAt} toc={toc}>
      {hasBody ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <EmptyState title={normalizedTitle} message="This page has no published content yet." />
      )}
    </EditorialLayout>
  );
}
