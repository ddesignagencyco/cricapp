'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Save, ScrollText, ShieldAlert } from 'lucide-react';
import {
  AdminField,
  AdminInput,
  AdminPageHeader,
  LoadingState,
} from '../../../../components/admin/AdminShared';
import { useAuth } from '../../../../components/AuthProvider';
import {
  fetchEditorialPagesList,
  upsertEditorialPageItem,
  type EditorialPageItem,
} from '../../../../services/editorialStudio';

const DEFAULT_SLUGS = ['about', 'editorial-policy', 'corrections', 'privacy', 'terms'];

export default function EditorialPolicyPagesPage() {
  const { isEditor } = useAuth();
  const [pages, setPages] = useState<EditorialPageItem[]>([]);
  const [selectedSlug, setSelectedSlug] = useState('editorial-policy');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEditorialPagesList()
      .then((items) => {
        setPages(items);
        const initial = items.find((p) => p.slug === 'editorial-policy') ?? items[0];
        if (initial) {
          setSelectedSlug(initial.slug);
          setTitle(initial.title);
          setContent(initial.content);
        }
      })
      .catch(() => toast.error('Could not load editorial pages.'))
      .finally(() => setLoading(false));
  }, []);

  const selectSlug = (slug: string) => {
    setSelectedSlug(slug);
    const existing = pages.find((p) => p.slug === slug);
    setTitle(existing?.title ?? slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
    setContent(existing?.content ?? '');
  };

  if (!isEditor) {
    return (
      <div className="py-12 text-center">
        <ShieldAlert size={36} className="mx-auto" style={{ color: 'var(--admin-danger)' }} />
        <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
          Editor or Admin access required to edit editorial policy pages.
        </p>
      </div>
    );
  }

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required.');
      return;
    }
    setSaving(true);
    try {
      const saved = await upsertEditorialPageItem(selectedSlug, {
        title: title.trim(),
        content,
      });
      setPages((prev) => {
        const idx = prev.findIndex((p) => p.slug === saved.slug);
        if (idx >= 0) return prev.map((p, i) => (i === idx ? saved : p));
        return [...prev, saved];
      });
      toast.success(`Saved "${saved.title}".`);
    } catch {
      toast.error('Could not save page.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState />;

  const allSlugs = Array.from(new Set([...DEFAULT_SLUGS, ...pages.map((p) => p.slug)]));

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <AdminPageHeader
        title="Editorial Policy Pages"
        subtitle="Manage site-wide editorial standards, corrections policy, and about pages."
      />

      <div className="flex flex-wrap gap-1.5">
        {allSlugs.map((slug) => (
          <button
            key={slug}
            type="button"
            onClick={() => selectSlug(slug)}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{
              background: selectedSlug === slug ? 'var(--admin-accent)' : 'var(--admin-card)',
              color: selectedSlug === slug ? 'var(--color-brand-fg)' : 'var(--admin-text-secondary)',
              border: selectedSlug === slug ? 'none' : '1px solid var(--admin-border)',
            }}
          >
            <ScrollText size={12} />
            {slug}
          </button>
        ))}
      </div>

      <div
        className="space-y-4 rounded-lg p-5"
        style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
      >
        <AdminField label="Page Title" required>
          <AdminInput value={title} onChange={(e) => setTitle(e.target.value)} />
        </AdminField>

        <AdminField label="Content (Markdown / HTML)" required>
          <textarea
            rows={14}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full rounded-md px-3 py-2 text-sm outline-none font-mono"
            style={{
              border: '1px solid var(--admin-border)',
              background: 'var(--admin-input-bg)',
              color: 'var(--admin-text)',
            }}
          />
        </AdminField>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="btn-brand inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-bold disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Page
          </button>
        </div>
      </div>
    </div>
  );
}
