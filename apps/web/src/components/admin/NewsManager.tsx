'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  FileEdit,
  FilePlus2,
  FileText,
  Loader2,
  Search,
  Trash2,
  ExternalLink,
  Eye,
  CheckCircle2,
  Clock,
  Filter,
  Sparkles,
  ArrowUpDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  deleteNews,
  fetchNewsAdmin,
  updateNews,
  fetchNewsCategories,
  type NewsArticleAdmin,
  type NewsCategory,
} from '../../services/newsAdmin';
import Badge from '../Badge';

export default function NewsManager() {
  const [articles, setArticles] = useState<NewsArticleAdmin[]>([]);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetchNewsAdmin({ limit: 100 }),
      fetchNewsCategories().catch(() => [] as NewsCategory[]),
    ])
      .then(([res, cats]) => {
        setArticles(res.items);
        setCategories(cats);
      })
      .catch(() => {
        setArticles([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const togglePublish = async (article: NewsArticleAdmin) => {
    setBusyId(article.id);
    try {
      const updated = await updateNews(article.id, { isPublished: !article.isPublished });
      setArticles((list) => list.map((a) => (a.id === article.id ? updated : a)));
      toast.success(updated.isPublished ? 'Article is now Live!' : 'Article reverted to Draft.');
    } catch {
      toast.error('Could not update the article status.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (article: NewsArticleAdmin) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${article.title}"?`)) return;
    setBusyId(article.id);
    try {
      await deleteNews(article.id);
      setArticles((list) => list.filter((a) => a.id !== article.id));
      toast.success('Article deleted successfully.');
    } catch {
      toast.error('Could not delete the article.');
    } finally {
      setBusyId(null);
    }
  };

  const filtered = articles.filter((a) => {
    const q = query.toLowerCase().trim();
    const matchesQuery =
      !q ||
      a.title.toLowerCase().includes(q) ||
      (a.summary || '').toLowerCase().includes(q) ||
      (a.author || '').toLowerCase().includes(q);

    const matchesCategory =
      filterCategory === 'all' || a.categoryId === filterCategory;

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'published' ? a.isPublished : !a.isPublished);

    return matchesQuery && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-accent">
            <FileText size={16} />
            <span className="text-xs font-bold uppercase tracking-widest text-stext">Newsfeed</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-mtext sm:text-3xl">
            Articles Management
          </h1>
          <p className="mt-1 text-sm text-stext">
            Draft, publish, edit and organize articles across your news portal.
          </p>
        </div>

        <Link
          href="/admin/news/new"
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-accent/20 transition hover:bg-accent2"
        >
          <FilePlus2 size={16} />
          Create Article
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-lborder bg-card p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stext" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, author, or excerpt…"
            className="w-full rounded-xl border border-lborder bg-secondary py-2 pl-10 pr-4 text-xs sm:text-sm text-mtext outline-none transition focus:border-accent"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-xl border border-lborder bg-secondary px-3 py-2 text-xs font-semibold text-mtext outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="rounded-xl border border-lborder bg-secondary px-3 py-2 text-xs font-semibold text-mtext outline-none"
          >
            <option value="all">All Status</option>
            <option value="published">Live (Published)</option>
            <option value="draft">Drafts</option>
          </select>
        </div>
      </div>

      {/* Articles Table / Cards */}
      {loading ? (
        <div className="flex min-h-64 items-center justify-center rounded-3xl border border-lborder bg-card">
          <Loader2 size={26} className="animate-spin text-accent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-lborder bg-card p-12 text-center text-sm text-stext">
          <FileText size={32} className="mx-auto mb-2 text-stext/60" />
          No articles match your criteria.
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-lborder bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-lborder bg-secondary/60 text-[11px] font-bold uppercase tracking-wider text-stext">
                  <th className="px-5 py-3.5">Article</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lborder/60">
                {filtered.map((a) => (
                  <tr key={a.id} className="transition-colors hover:bg-elevated/40">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3.5 max-w-md">
                        {a.imageUrl ? (
                          <img
                            src={a.imageUrl}
                            alt=""
                            className="h-12 w-16 shrink-0 rounded-xl border border-lborder object-cover bg-secondary"
                          />
                        ) : (
                          <div className="grid h-12 w-16 shrink-0 place-items-center rounded-xl border border-lborder bg-secondary text-stext">
                            <FileText size={18} />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-mtext text-sm leading-snug hover:text-accent transition-colors">
                            <Link href={`/admin/news/${a.id}/edit`}>{a.title}</Link>
                          </p>
                          <p className="mt-0.5 truncate text-xs text-stext">
                            by <span className="font-semibold text-mtext/80">{a.author || 'Editorial Desk'}</span>
                            {a.source && ` · ${a.source}`}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <span className="inline-flex items-center rounded-lg border border-lborder/60 bg-secondary px-2.5 py-1 text-xs font-semibold text-mtext">
                        {a.category?.name || 'General'}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <button
                        type="button"
                        disabled={busyId === a.id}
                        onClick={() => togglePublish(a)}
                        title={a.isPublished ? 'Click to set as Draft' : 'Click to publish Live'}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 ${
                          a.isPublished
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 hover:bg-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/25 hover:bg-amber-500/20'
                        }`}
                      >
                        {a.isPublished ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                        {a.isPublished ? 'Published' : 'Draft'}
                      </button>
                    </td>

                    <td className="px-4 py-4 text-xs text-stext font-mono">
                      {new Date(a.publishedAt || a.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/news/${a.slug || a.id}`}
                          target="_blank"
                          title="View on site"
                          className="grid h-8 w-8 place-items-center rounded-xl text-stext hover:bg-elevated hover:text-accent transition-colors"
                        >
                          <ExternalLink size={14} />
                        </Link>
                        <Link
                          href={`/admin/news/${a.id}/edit`}
                          title="Edit Article"
                          className="grid h-8 w-8 place-items-center rounded-xl text-stext hover:bg-elevated hover:text-mtext transition-colors"
                        >
                          <FileEdit size={14} />
                        </Link>
                        <button
                          type="button"
                          disabled={busyId === a.id}
                          onClick={() => remove(a)}
                          title="Delete Article"
                          className="grid h-8 w-8 place-items-center rounded-xl text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
                        >
                          {busyId === a.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
