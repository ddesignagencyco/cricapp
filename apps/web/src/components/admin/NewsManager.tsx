'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  FileEdit,
  FilePlus2,
  FileText,
  Loader2,
  Search,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
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
import { AdminInput, AdminSelect, ConfirmDialog, ErrorState } from './AdminShared';
import Pagination from './AdminPagination';
import RemoteImage from '../RemoteImage';

const PAGE_SIZE = 20;

export default function NewsManager() {
  const [articles, setArticles] = useState<NewsArticleAdmin[]>([]);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NewsArticleAdmin | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    Promise.all([
      fetchNewsAdmin({
        limit: PAGE_SIZE,
        page,
        q: query.trim() || undefined,
        category: filterCategory === 'all' ? undefined : filterCategory,
      }),
      fetchNewsCategories().catch(() => [] as NewsCategory[]),
    ])
      .then(([res, cats]) => {
        setArticles(res.items);
        setTotal(res.total);
        setTotalPages(Math.max(1, res.totalPages));
        setCategories(cats);
      })
      .catch(() => {
        setArticles([]);
        setError('Could not load articles. Check the API connection and try again.');
      })
      .finally(() => setLoading(false));
  }, [filterCategory, page, query]);

  useEffect(() => {
    const timer = window.setTimeout(load, 300);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => { setPage(1); }, [query, filterCategory, filterStatus]);

  const togglePublish = async (article: NewsArticleAdmin) => {
    setBusyId(article.id);
    try {
      const updated = await updateNews(article.id, { isPublished: !article.isPublished });
      setArticles((list) => list.map((a) => (a.id === article.id ? updated : a)));
      toast.success(updated.isPublished ? 'Article published.' : 'Article reverted to draft.');
    } catch {
      toast.error('Could not update article status.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await deleteNews(deleteTarget.id);
      setArticles((list) => list.filter((a) => a.id !== deleteTarget.id));
      setTotal((current) => Math.max(0, current - 1));
      toast.success('Article deleted.');
    } catch {
      toast.error('Could not delete article.');
    } finally {
      setBusyId(null);
      setDeleteTarget(null);
    }
  };

  const filtered = articles.filter((a) => {
    const q = query.toLowerCase().trim();
    const matchesQuery = !q || a.title.toLowerCase().includes(q) || (a.summary || '').toLowerCase().includes(q) || (a.author || '').toLowerCase().includes(q);
    const matchesStatus = filterStatus === 'all' || (filterStatus === 'published' ? a.isPublished : !a.isPublished);
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--admin-text)' }}>Articles Management</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
            Draft, publish, edit and organize articles.
          </p>
        </div>
        <Link
          href="/admin/news/new"
          className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-bold text-white transition-colors"
          style={{ background: 'var(--admin-accent)' }}
        >
          <FilePlus2 size={14} />
          Create Article
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-lg p-3 md:flex-row md:items-center" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--admin-text-muted)' }} />
          <AdminInput
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, author, or excerpt..."
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <AdminSelect
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ width: 'auto', minWidth: '12.5rem' }}
          >
            <option value="all">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </AdminSelect>
          <AdminSelect
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            style={{ width: 'auto', minWidth: '9.5rem' }}
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </AdminSelect>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-lg" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--admin-accent)' }} />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-card)' }}>
          <FileText size={28} className="mx-auto mb-2" style={{ color: 'var(--admin-text-muted)' }} />
          <p className="text-xs" style={{ color: 'var(--admin-text-secondary)' }}>No articles match your criteria.</p>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-table-header)' }}>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Article</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Category</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Status</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Date</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-right" style={{ color: 'var(--admin-text-secondary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    style={{ borderBottom: '1px solid var(--admin-border)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-table-row-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 max-w-md">
                        {a.imageUrl ? (
                          <RemoteImage src={a.imageUrl} alt="" width={48} height={36} className="h-9 w-12 shrink-0 rounded object-cover" style={{ border: '1px solid var(--admin-border)' }} />
                        ) : (
                          <div className="grid h-9 w-12 shrink-0 place-items-center rounded" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-input-bg)', color: 'var(--admin-text-muted)' }}>
                            <FileText size={14} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <Link href={`/admin/news/${a.id}/edit`} className="block truncate text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>{a.title}</Link>
                          <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                            by {a.author || 'Editorial Desk'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: 'var(--admin-input-bg)', color: 'var(--admin-text-secondary)' }}>
                        {a.category?.name || 'General'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={busyId === a.id}
                        onClick={() => togglePublish(a)}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold uppercase transition-all disabled:opacity-50"
                        style={{
                          background: a.isPublished ? 'var(--admin-success-bg)' : 'var(--admin-warning-bg)',
                          color: a.isPublished ? 'var(--admin-success)' : 'var(--admin-warning)',
                        }}
                      >
                        {a.isPublished ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                        {a.isPublished ? 'Published' : 'Draft'}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-mono" style={{ color: 'var(--admin-text-muted)' }}>
                      {new Date(a.publishedAt || a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/news/${a.slug || a.id}`}
                          target="_blank"
                          className="grid h-8 w-8 place-items-center rounded-md"
                          style={{ background: 'var(--admin-info-bg)', color: 'var(--admin-info)' }}
                          title="View"
                        >
                          <Eye size={16} />
                        </Link>
                        <Link
                          href={`/admin/news/${a.id}/edit`}
                          className="grid h-8 w-8 place-items-center rounded-md"
                          style={{ background: 'rgba(0, 191, 255, 0.14)', color: 'var(--admin-accent)' }}
                          title="Edit"
                        >
                          <FileEdit size={16} />
                        </Link>
                        <button
                          type="button"
                          disabled={busyId === a.id}
                          onClick={() => setDeleteTarget(a)}
                          className="grid h-8 w-8 place-items-center rounded-md disabled:opacity-50"
                          style={{ background: 'var(--admin-danger-bg)', color: 'var(--admin-danger)' }}
                          title="Delete"
                        >
                          {busyId === a.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t px-4 py-3" style={{ borderColor: 'var(--admin-border)' }}>
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete article"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={!!busyId}
        danger
      />
    </div>
  );
}
