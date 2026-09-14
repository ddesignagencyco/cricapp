'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ScrollText } from 'lucide-react';
import { AdminInput, AdminPageHeader, EmptyState, ErrorState, LoadingState } from '../../../../components/admin/AdminShared';
import {
  fetchEditorialPage,
  fetchEditorialPages,
  upsertEditorialPage,
  type EditorialPageSummary,
} from '../../../../services/editorial';

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
        setContent(page?.content || '');
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
      <AdminPageHeader title="Editorial pages" subtitle="PUT /admin/editorial-pages/:slug. Public GET /editorial-pages." />

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
          style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
          onSubmit={async (e) => {
            e.preventDefault();
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
          <AdminInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={16}
            placeholder="HTML or Markdown"
            className="w-full rounded-md px-3 py-2 text-sm"
            style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-input-bg)', color: 'var(--admin-text)' }}
          />
          <button type="submit" disabled={saving} className="btn-brand rounded-md px-4 py-2 text-sm font-bold disabled:opacity-60">
            {saving ? 'Saving…' : `Save /${slug}`}
          </button>
        </form>
      )}

      {pages.length === 0 ? (
        <EmptyState icon={<ScrollText size={28} />} title="No published pages" message="Save a preset above to create GET /editorial-pages entries." />
      ) : (
        <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          Live slugs: {pages.map((page) => page.slug).join(', ')}
        </p>
      )}
    </div>
  );
}
