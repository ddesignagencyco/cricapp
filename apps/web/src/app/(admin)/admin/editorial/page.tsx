'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ScrollText } from 'lucide-react';
import { AdminField, AdminInput, AdminPageHeader, EmptyState, ErrorState, LoadingState } from '../../../../components/admin/AdminShared';
import RichTextEditor from '../../../../components/admin/RichTextEditor';
import {
  fetchEditorialPage,
  fetchEditorialPages,
  upsertEditorialPage,
  type EditorialPageSummary,
} from '../../../../services/editorial';
import { isEmptyRichText } from '../../../../utils/newsConstraints';

function toEditorHtml(content: string) {
  const text = content.trim();
  if (!text) return '';
  if (/<[a-z][\s\S]*>/i.test(content)) return content;
  return content
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

const PRESETS = [
  { slug: 'about', title: 'About' },
  { slug: 'privacy', title: 'Privacy Policy' },
  { slug: 'terms', title: 'Terms of Service' },
  { slug: 'editorial-policy', title: 'Editorial Policy' },
  { slug: 'corrections', title: 'Corrections' },
];

export default function AdminEditorialPage() {
  const [pages, setPages] = useState<EditorialPageSummary[]>([]);
  const [slug, setSlug] = useState('about');
  const [title, setTitle] = useState('About');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const loadList = () => {
    fetchEditorialPages()
      .then(setPages)
      .catch(() => setError(true));
  };

  const loadSlug = (next: string) => {
    setSlug(next);
    const preset = PRESETS.find((item) => item.slug === next);
    setLoading(true);
    fetchEditorialPage(next)
      .then((page) => {
        setTitle(page?.title || preset?.title || next);
        setContent(toEditorHtml(page?.content || ''));
      })
      .catch(() => {
        setTitle(preset?.title || next);
        setContent('');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadList();
    loadSlug('about');
  }, []);

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Editorial pages" subtitle="Write About, Privacy, Terms and other public policy pages." />

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((item) => (
          <button
            key={item.slug}
            type="button"
            onClick={() => loadSlug(item.slug)}
            className="rounded-md px-3 py-1.5 text-xs font-semibold"
            style={{
              border: '1px solid var(--admin-border)',
              background: slug === item.slug ? 'var(--admin-accent)' : 'var(--admin-card)',
              color: slug === item.slug ? 'var(--color-brand-fg)' : 'var(--admin-text)',
            }}
          >
            {item.title}
          </button>
        ))}
      </div>

      {error ? <ErrorState message="Could not list editorial pages." onRetry={loadList} /> : null}
      {loading ? (
        <LoadingState />
      ) : (
        <form
          className="space-y-3 rounded-lg p-4"
          noValidate
          style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
          onSubmit={async (e) => {
            e.preventDefault();
            if (!title.trim()) {
              toast.error('Title is required.');
              return;
            }
            if (isEmptyRichText(content)) {
              toast.error('Write the policy before saving.');
              return;
            }
            setSaving(true);
            try {
              await upsertEditorialPage(slug, { title: title.trim(), content });
              toast.success('Page saved.');
              loadList();
            } catch {
              toast.error('Could not save the page.');
            } finally {
              setSaving(false);
            }
          }}
        >
          <AdminField label="Title" required>
            <AdminInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
          </AdminField>
          <AdminField label="Content" required>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Write this policy with headings, lists, links and quotes..."
            />
          </AdminField>
          <button type="submit" disabled={saving} className="btn-brand rounded-md px-4 py-2 text-sm font-bold disabled:opacity-60">
            {saving ? 'Saving…' : `Save ${title.trim() || 'page'}`}
          </button>
        </form>
      )}

      {pages.length === 0 ? (
        <EmptyState icon={<ScrollText size={28} />} title="No published pages" message="Save a policy above to publish it on the site." />
      ) : (
        <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          Live slugs: {pages.map((page) => page.slug).join(', ')}
        </p>
      )}
    </div>
  );
}
