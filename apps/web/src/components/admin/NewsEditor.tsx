'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Loader2,
  Save,
  Send,
  Tag,
  User,
  Globe,
  ImageIcon,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createCategory,
  createNews,
  fetchNewsArticle,
  fetchNewsCategories,
  updateNews,
  type NewsCategory,
  type NewsInput,
} from '../../services/newsAdmin';
import RichTextEditor from './RichTextEditor';
import { AdminInput, AdminSelect } from './AdminShared';

interface NewsEditorProps {
  mode: 'create' | 'edit';
  id?: string;
}

interface FormState {
  title: string;
  summary: string;
  content: string;
  imageUrl: string;
  author: string;
  source: string;
  categoryId: string;
  tagsText: string;
  isPublished: boolean;
}

const emptyForm: FormState = {
  title: '',
  summary: '',
  content: '',
  imageUrl: '',
  author: '',
  source: '',
  categoryId: '',
  tagsText: '',
  isPublished: false,
};

export default function NewsEditor({ mode, id }: NewsEditorProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchNewsCategories().then(setCategories).catch(() => setCategories([]));
    if (mode === 'edit' && id) {
      fetchNewsArticle(id)
        .then((article) => {
          setForm({
            title: article.title,
            summary: article.summary || '',
            content: article.content,
            imageUrl: article.imageUrl || '',
            author: article.author || '',
            source: article.source || '',
            categoryId: article.categoryId || '',
            tagsText: (article.tags || []).join(', '),
            isPublished: article.isPublished,
          });
        })
        .catch(() => toast.error('Could not load the article.'))
        .finally(() => setLoading(false));
    }
  }, [mode, id]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleAddCategory = () => {
    const name = newCategory.trim();
    if (!name) return;
    createCategory(name)
      .then((category) => {
        setCategories((list) => [...list, category]);
        set('categoryId', category.id);
        setNewCategory('');
        setShowAddCat(false);
        toast.success(`Category "${category.name}" created.`);
      })
      .catch(() => toast.error('Could not create the category.'));
  };

  const submit = async (publish: boolean) => {
    if (!form.title.trim()) { toast.error('Title is required.'); return; }
    if (!form.content.trim()) { toast.error('Content cannot be empty.'); return; }

    setSaving(true);
    const payload: NewsInput = {
      title: form.title.trim(),
      content: form.content.trim(),
      isPublished: publish,
      tags: form.tagsText.split(',').map((t) => t.trim()).filter(Boolean),
    };
    if (form.summary.trim()) payload.summary = form.summary.trim();
    if (form.imageUrl.trim()) payload.imageUrl = form.imageUrl.trim();
    if (form.author.trim()) payload.author = form.author.trim();
    if (form.source.trim()) payload.source = form.source.trim();
    if (form.categoryId.trim()) payload.categoryId = form.categoryId.trim();

    try {
      if (mode === 'create') {
        await createNews(payload);
        toast.success(publish ? 'Article published!' : 'Draft saved.');
      } else if (id) {
        await updateNews(id, payload);
        toast.success(publish ? 'Article updated!' : 'Draft updated.');
      }
      window.location.href = '/admin/news';
    } catch (err: any) {
      let errMsg = 'Could not save the article.';
      if (err?.body && typeof err.body === 'object') {
        const b = err.body;
        if (Array.isArray(b.message)) errMsg = b.message.join('; ');
        else if (typeof b.message === 'string') errMsg = b.message;
        else if (typeof b.error === 'string') errMsg = b.error;
      } else if (err?.message) errMsg = err.message;
      toast.error(errMsg, { duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-lg" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
        <Loader2 size={22} className="animate-spin" style={{ color: 'var(--admin-accent)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4" style={{ borderBottom: '1px solid var(--admin-border)' }}>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/news"
            className="grid h-8 w-8 place-items-center rounded-md transition-colors"
            style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-secondary)' }}
            title="Back to Articles"
          >
            <ArrowLeft size={14} />
          </Link>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--admin-text)' }}>
              {mode === 'create' ? 'Create New Story' : 'Edit Story'}
            </h1>
            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              {mode === 'create' ? 'Write your cricket piece with rich formatting' : `Editing article #${id?.slice(0, 8)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => submit(false)}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-bold transition-colors disabled:opacity-50"
            style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-secondary)' }}
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Save Draft
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => submit(true)}
            className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-bold text-white transition-colors disabled:opacity-50"
            style={{ background: 'var(--admin-accent)' }}
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            Publish Live
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left: Content */}
        <div className="space-y-4 lg:col-span-2">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--admin-text-secondary)' }}>
              Headline <span style={{ color: 'var(--admin-danger)' }}>*</span>
            </label>
            <AdminInput
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Babar Azam seals thriller at Gaddafi Stadium"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--admin-text-secondary)' }}>Summary</label>
            <AdminInput
              type="text"
              value={form.summary}
              onChange={(e) => set('summary', e.target.value)}
              placeholder="Brief lead paragraph for previews..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--admin-text-secondary)' }}>
              Content <span style={{ color: 'var(--admin-danger)' }}>*</span>
            </label>
            <RichTextEditor
              value={form.content}
              onChange={(v) => set('content', v)}
              placeholder="Write the full article here..."
            />
          </div>
        </div>

        {/* Right: Metadata */}
        <div className="space-y-4">
          {/* Publishing */}
          <div className="rounded-lg p-4" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: 'var(--admin-text)' }}>
              <Sparkles size={12} style={{ color: 'var(--admin-accent)' }} />
              Publishing
            </h3>
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => set('isPublished', e.target.checked)}
                className="mt-0.5"
              />
              <div>
                <span className="text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>Make Live</span>
                <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Uncheck to save as draft.</p>
              </div>
            </label>
          </div>

          {/* Category */}
          <div className="rounded-lg p-4" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--admin-text)' }}>
                <Tag size={12} style={{ color: 'var(--admin-accent)' }} /> Category
              </label>
              <button type="button" onClick={() => setShowAddCat((s) => !s)} className="text-xs font-bold" style={{ color: 'var(--admin-accent)' }}>
                {showAddCat ? 'Cancel' : '+ New'}
              </button>
            </div>
            {showAddCat ? (
              <div className="space-y-2">
                <AdminInput type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category name" />
                <button type="button" onClick={handleAddCategory} disabled={!newCategory.trim()} className="w-full rounded-md py-1.5 text-xs font-bold text-white disabled:opacity-50" style={{ background: 'var(--admin-accent)' }}>
                  Create & Select
                </button>
              </div>
            ) : (
              <AdminSelect value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                <option value="">Select Category...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </AdminSelect>
            )}
          </div>

          {/* Featured Image */}
          <div className="rounded-lg p-4" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
            <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2" style={{ color: 'var(--admin-text)' }}>
              <ImageIcon size={12} style={{ color: 'var(--admin-accent)' }} /> Cover Image
            </label>
            <AdminInput type="url" value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://..." />
            {form.imageUrl && (
              <div className="mt-2 overflow-hidden rounded" style={{ border: '1px solid var(--admin-border)' }}>
                <img src={form.imageUrl} alt="Preview" className="h-24 w-full object-cover" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
              </div>
            )}
          </div>

          {/* Author & Tags */}
          <div className="rounded-lg p-4 space-y-3" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--admin-text-secondary)' }}>Author</label>
              <div className="relative">
                <User size={12} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--admin-text-muted)' }} />
                <AdminInput type="text" value={form.author} onChange={(e) => set('author', e.target.value)} placeholder="PakCricZone Editorial" style={{ paddingLeft: '2rem' }} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--admin-text-secondary)' }}>Source</label>
              <div className="relative">
                <Globe size={12} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--admin-text-muted)' }} />
                <AdminInput type="text" value={form.source} onChange={(e) => set('source', e.target.value)} placeholder="PCB / ICC" style={{ paddingLeft: '2rem' }} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--admin-text-secondary)' }}>Tags (comma separated)</label>
              <AdminInput type="text" value={form.tagsText} onChange={(e) => set('tagsText', e.target.value)} placeholder="Babar Azam, PSL 10" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
