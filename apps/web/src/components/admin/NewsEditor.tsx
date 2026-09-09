'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  FolderPlus,
  Image as ImageIcon,
  Loader2,
  Plus,
  Save,
  Send,
  Sparkles,
  Tag,
  User,
  Globe,
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
    fetchNewsCategories()
      .then(setCategories)
      .catch(() => setCategories([]));

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
    if (!form.title.trim()) {
      toast.error('Article title is required.');
      return;
    }
    if (!form.content.trim()) {
      toast.error('Article content cannot be empty.');
      return;
    }

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
        toast.success(publish ? 'Article published and live!' : 'Draft article saved.');
      } else if (id) {
        await updateNews(id, payload);
        toast.success(publish ? 'Article updated and live!' : 'Article draft updated.');
      }
      window.location.href = '/admin/news';
    } catch (err: any) {
      let errMsg = 'Could not save the article.';
      if (err?.body && typeof err.body === 'object') {
        const b = err.body;
        if (Array.isArray(b.message)) {
          errMsg = b.message.join('; ');
        } else if (typeof b.message === 'string') {
          errMsg = b.message;
        } else if (typeof b.error === 'string') {
          errMsg = b.error;
        }
      } else if (err?.message) {
        errMsg = err.message;
      }
      toast.error(errMsg, { duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-3xl border border-lborder bg-card">
        <Loader2 size={28} className="animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation & Save Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-lborder pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/news"
            className="grid h-9 w-9 place-items-center rounded-xl border border-lborder bg-secondary text-stext hover:bg-card hover:text-mtext transition-colors"
            title="Back to Articles"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-mtext">
              {mode === 'create' ? 'Create New Story' : 'Edit Story'}
            </h1>
            <p className="text-xs text-stext">
              {mode === 'create' ? 'Draft your cricket piece with rich formatting' : `Editing article #${id?.slice(0, 8)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => submit(false)}
            className="inline-flex items-center gap-2 rounded-xl border border-lborder bg-secondary px-4 py-2 text-xs font-bold text-mtext hover:bg-card transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Save Draft
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => submit(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2 text-xs font-bold text-white shadow-md shadow-accent/20 hover:bg-accent2 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            Publish Live
          </button>
        </div>
      </div>

      {/* Main Grid: Editor on Left, Metadata & Settings on Right */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Main Content */}
        <div className="space-y-5 lg:col-span-2">
          {/* Article Title */}
          <div className="space-y-1.5">
            <label htmlFor="article-title" className="block text-xs font-bold uppercase tracking-wider text-stext">
              Headline / Title <span className="text-danger">*</span>
            </label>
            <input
              id="article-title"
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Babar Azam hits stunning century to seal thriller at Gaddafi Stadium"
              className="w-full rounded-2xl border border-lborder bg-card px-4 py-3 text-base sm:text-lg font-bold text-mtext outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/10"
              required
            />
          </div>

          {/* Short Excerpt */}
          <div className="space-y-1.5">
            <label htmlFor="article-summary" className="block text-xs font-bold uppercase tracking-wider text-stext">
              Summary / Excerpt
            </label>
            <textarea
              id="article-summary"
              rows={2}
              value={form.summary}
              onChange={(e) => set('summary', e.target.value)}
              placeholder="Brief 1-2 sentence lead paragraph for card previews and SEO meta tags…"
              className="w-full resize-none rounded-2xl border border-lborder bg-card px-4 py-2.5 text-xs sm:text-sm text-mtext outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/10"
            />
          </div>

          {/* Rich Text Editor */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-stext">
              Article Content <span className="text-danger">*</span>
            </label>
            <RichTextEditor
              value={form.content}
              onChange={(v) => set('content', v)}
              placeholder="Write the full match report, interview, or news breakdown. Use headings, blockquotes, bullet points, and images freely…"
            />
          </div>
        </div>

        {/* Right 1 Col: Publishing Meta & Attributes */}
        <div className="space-y-5">
          {/* Status Card */}
          <div className="rounded-3xl border border-lborder bg-card p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-mtext flex items-center gap-2">
              <Sparkles size={14} className="text-accent" />
              Publishing Options
            </h3>

            <div className="space-y-3 pt-1">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) => set('isPublished', e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-lborder text-accent focus:ring-accent"
                />
                <div>
                  <span className="text-sm font-semibold text-mtext">Make Live on Site</span>
                  <p className="text-xs text-stext">If unchecked, this story will stay saved as a private draft.</p>
                </div>
              </label>
            </div>
          </div>

          {/* Category Selector */}
          <div className="rounded-3xl border border-lborder bg-card p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="article-category" className="text-xs font-bold uppercase tracking-wider text-mtext flex items-center gap-2">
                <Tag size={14} className="text-accent" />
                Category
              </label>
              <button
                type="button"
                onClick={() => setShowAddCat((s) => !s)}
                className="text-xs font-bold text-accent hover:text-accent2 inline-flex items-center gap-1"
              >
                <Plus size={12} />
                {showAddCat ? 'Cancel' : 'New'}
              </button>
            </div>

            {showAddCat ? (
              <div className="space-y-2 rounded-xl border border-lborder bg-secondary p-3">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="New category name"
                  className="w-full rounded-lg border border-lborder bg-card px-2.5 py-1.5 text-xs text-mtext outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  disabled={!newCategory.trim()}
                  className="w-full rounded-lg bg-accent py-1.5 text-xs font-bold text-white transition hover:bg-accent2 disabled:opacity-50"
                >
                  Create & Select
                </button>
              </div>
            ) : (
              <select
                id="article-category"
                value={form.categoryId}
                onChange={(e) => set('categoryId', e.target.value)}
                className="w-full rounded-xl border border-lborder bg-secondary px-3.5 py-2.5 text-xs font-semibold text-mtext outline-none focus:border-accent"
              >
                <option value="">Select a Category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Featured Image */}
          <div className="rounded-3xl border border-lborder bg-card p-5 shadow-sm space-y-3">
            <label htmlFor="article-image" className="text-xs font-bold uppercase tracking-wider text-mtext flex items-center gap-2">
              <ImageIcon size={14} className="text-accent" />
              Featured Cover Image
            </label>
            <input
              id="article-image"
              type="url"
              value={form.imageUrl}
              onChange={(e) => set('imageUrl', e.target.value)}
              placeholder="https://images.unsplash.com/…"
              className="w-full rounded-xl border border-lborder bg-secondary px-3.5 py-2.5 text-xs text-mtext outline-none focus:border-accent"
            />
            {form.imageUrl && (
              <div className="mt-2 overflow-hidden rounded-xl border border-lborder">
                <img
                  src={form.imageUrl}
                  alt="Cover preview"
                  className="h-32 w-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                />
              </div>
            )}
          </div>

          {/* Authorship & Tags */}
          <div className="rounded-3xl border border-lborder bg-card p-5 shadow-sm space-y-4">
            <div>
              <label htmlFor="article-author" className="block text-xs font-bold uppercase tracking-wider text-stext mb-1.5">
                Author
              </label>
              <div className="relative">
                <User size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stext" />
                <input
                  id="article-author"
                  type="text"
                  value={form.author}
                  onChange={(e) => set('author', e.target.value)}
                  placeholder="e.g. PakCricZone Editorial Desk"
                  className="w-full rounded-xl border border-lborder bg-secondary py-2 pl-9 pr-3 text-xs text-mtext outline-none focus:border-accent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="article-source" className="block text-xs font-bold uppercase tracking-wider text-stext mb-1.5">
                Source / Wire
              </label>
              <div className="relative">
                <Globe size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stext" />
                <input
                  id="article-source"
                  type="text"
                  value={form.source}
                  onChange={(e) => set('source', e.target.value)}
                  placeholder="e.g. PCB / ICC / Exclusive"
                  className="w-full rounded-xl border border-lborder bg-secondary py-2 pl-9 pr-3 text-xs text-mtext outline-none focus:border-accent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="article-tags" className="block text-xs font-bold uppercase tracking-wider text-stext mb-1.5">
                Tags (comma separated)
              </label>
              <input
                id="article-tags"
                type="text"
                value={form.tagsText}
                onChange={(e) => set('tagsText', e.target.value)}
                placeholder="Babar Azam, PSL 10, Lahore Qalandars"
                className="w-full rounded-xl border border-lborder bg-secondary px-3.5 py-2 text-xs text-mtext outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
