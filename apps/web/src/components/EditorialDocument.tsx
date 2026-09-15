import { sanitizeArticleHtml } from '../utils/sanitizeHtml';
import type { EditorialPage } from '../services/editorial';

export default function EditorialDocument({ page }: { page: EditorialPage }) {
  const html = page.content.includes('<')
    ? sanitizeArticleHtml(page.content)
    : sanitizeArticleHtml(
        page.content
          .split(/\n{2,}/)
          .map((block) => `<p>${block.replace(/\n/g, '<br/>')}</p>`)
          .join('')
      );
  const updated = page.updatedAt ? new Date(page.updatedAt) : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-black tracking-tight text-mtext sm:text-4xl">{page.title}</h1>
      {updated && !Number.isNaN(updated.getTime()) ? (
        <p className="mt-2 text-sm text-stext">
          Last updated: {updated.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      ) : null}
      <div className="tiptap-content mt-6" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
