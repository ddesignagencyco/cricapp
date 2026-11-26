'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FileEdit,
  FilePlus2,
  FileText,
  Languages,
  Loader2,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  bulkNewsAction,
  deleteNews,
  fetchNewsAdmin,
  publishAllDraftNews,
  updateNews,
  fetchNewsCategories,
  type NewsArticleAdmin,
  type NewsCategory,
} from '../../services/newsAdmin';
import { fetchPublicAuthors, type PublicAuthor } from '../../services/authors';
import { AdminAvatar, AdminSearchField, AdminSelect, AdminSortableHeader, ConfirmDialog, EmptyState, ErrorState, LoadingState, type SortDirection } from './AdminShared';
import Pagination from './AdminPagination';
import RemoteImage from '../RemoteImage';
import { newsHref, otherNewsLanguage } from '../../utils/newsConstraints';
import NewsCopy from '../NewsCopy';

const PAGE_SIZE = 20;
type NewsSortKey = 'date' | 'title' | 'author' | 'category' | 'status';

export default function NewsManager() {
  const [articles, setArticles] = useState<NewsArticleAdmin[]>([]);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [authors, setAuthors] = useState<PublicAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [sortBy, setSortBy] = useState<NewsSortKey>('date');
  const [sortOrder, setSortOrder] = useState<SortDirection>('desc');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [publishingAll, setPublishingAll] = useState(false);
  const [confirmPublishAll, setConfirmPublishAll] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NewsArticleAdmin | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Bulk selection (scoped to current page)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const [bulkAuthorId, setBulkAuthorId] = useState('');
  const [bulkStatus, setBulkStatus] = useState<'' | 'published' | 'draft'>('');
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    Promise.all([
      fetchNewsAdmin({
        limit: PAGE_SIZE,
        page,
        q: query.trim() || undefined,
        category: filterCategory === 'all' ? undefined : filterCategory,
        status: filterStatus === 'all' ? undefined : filterStatus,
        sortBy,
        sortOrder,
      }),
      fetchNewsCategories().catch(() => [] as NewsCategory[]),
      fetchPublicAuthors().catch(() => [] as PublicAuthor[]),
    ])
      .then(([res, cats, auths]) => {
        setArticles(res.items);
        setTotal(res.total);
        setTotalPages(Math.max(1, res.totalPages));
        setCategories(cats);
        setAuthors(auths);
        setSelectedIds(new Set());
      })
      .catch(() => {
        setArticles([]);
        setSelectedIds(new Set());
        setError('Could not load news. Check the API connection and try again.');
      })
      .finally(() => setLoading(false));
  }, [filterCategory, filterStatus, page, query, sortBy, sortOrder]);

  useEffect(() => {
    const timer = window.setTimeout(load, 300);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => { setPage(1); }, [query, filterCategory, filterStatus, sortBy, sortOrder]);

  // Filtering (search, category, status, sort) is performed server-side across all pages.
  const filtered = articles;
  const selectedCount = selectedIds.size;
  const allPageSelected = filtered.length > 0 && filtered.every((a) => selectedIds.has(a.id));
  const somePageSelected = selectedCount > 0 && !allPageSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = somePageSelected;
    }
  }, [somePageSelected]);

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((a) => a.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setBulkCategoryId('');
    setBulkAuthorId('');
    setBulkStatus('');
  };

  const hasBulkChanges = Boolean(bulkCategoryId || bulkAuthorId || bulkStatus);

  const handleBulkApply = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || !hasBulkChanges) return;
    setBulkBusy(true);
    try {
      const res = await bulkNewsAction({
        ids,
        action: 'update',
        categoryId: bulkCategoryId || undefined,
        authorId: bulkAuthorId || undefined,
        status: bulkStatus || undefined,
      });
      const count = res?.updated ?? ids.length;
      toast.success(`Updated ${count} ${count === 1 ? 'article' : 'articles'}.`);
      clearSelection();
      load();
    } catch {
      toast.error('Could not apply bulk changes.');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const res = await bulkNewsAction({ ids, action: 'delete' });
      const count = res?.deleted ?? ids.length;
      toast.success(`Deleted ${count} ${count === 1 ? 'article' : 'articles'}.`);
      clearSelection();
      load();
    } catch {
      toast.error('Could not delete selected articles.');
    } finally {
      setBulkBusy(false);
      setConfirmBulkDelete(false);
    }
  };

  const toggleSort = (key: NewsSortKey) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortOrder(key === 'date' ? 'desc' : 'asc');
    }
  };

  const togglePublish = async (article: NewsArticleAdmin) => {
    setBusyId(article.id);
    try {
      const updated = await updateNews(article.id, { isPublished: !article.isPublished });
      setArticles((list) => list.map((a) => (a.id === article.id ? updated : a)));
      toast.success(updated.isPublished ? 'News published.' : 'News reverted to draft.');
    } catch {
      toast.error('Could not update news status.');
    } finally {
      setBusyId(null);
    }
  };

  const handlePublishAll = async () => {
    setPublishingAll(true);
    try {
      const res = await publishAllDraftNews();
      const count = typeof res?.published === 'number' ? res.published : 0;
      if (count > 0) {
        toast.success(`Published ${count} draft ${count === 1 ? 'article' : 'articles'}.`);
        load();
      } else {
        toast.success('All news articles are already published.');
      }
    } catch {
      toast.error('Could not publish draft news.');
    } finally {
      setPublishingAll(false);
      setConfirmPublishAll(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await deleteNews(deleteTarget.id);
      setArticles((list) => list.filter((a) => a.id !== deleteTarget.id));
      setSelectedIds((prev) => {
        if (!prev.has(deleteTarget.id)) return prev;
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
      setTotal((current) => Math.max(0, current - 1));
      toast.success('News deleted.');
    } catch {
      toast.error('Could not delete news.');
    } finally {
      setBusyId(null);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold" style={{ color: 'var(--admin-text)' }}>News Management</h1>
          <p className="mt-1 break-words text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
            Draft, publish, edit and organize news.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={publishingAll}
            onClick={() => setConfirmPublishAll(true)}
            className="inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-bold transition-colors disabled:opacity-50"
            style={{
              border: '1px solid var(--admin-border)',
              background: 'var(--admin-card)',
              color: 'var(--admin-text)',
            }}
          >
            {publishingAll ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} style={{ color: 'var(--admin-success)' }} />}
            Publish All Drafts
          </button>
          <Link
            href="/admin/news/new"
            className="btn-brand inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-bold transition-colors"
          >
            <FilePlus2 size={14} />
            Create News
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-lg p-3 md:flex-row md:items-center" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
        <AdminSearchField
          wrapperClassName="max-w-md"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, author, or excerpt..."
        />
        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 md:w-auto">
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

      {/* Bulk Action Bar */}
      {selectedCount > 0 ? (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg px-3.5 py-2.5"
          style={{
            border: '1px solid var(--admin-accent)',
            background: 'var(--admin-card)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold"
              style={{ background: 'var(--admin-info-bg)', color: 'var(--admin-accent)' }}
            >
              {selectedCount} selected
            </span>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={clearSelection}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold transition-colors hover:opacity-80 disabled:opacity-50"
              style={{ color: 'var(--admin-text-secondary)' }}
            >
              <X size={13} />
              Clear
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Bulk Category */}
            {categories.length > 0 ? (
              <AdminSelect
                value={bulkCategoryId}
                disabled={bulkBusy}
                onChange={(e) => setBulkCategoryId(e.target.value)}
                style={{ width: 'auto', minWidth: '10.5rem' }}
                aria-label="Bulk change category"
              >
                <option value="">Set category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </AdminSelect>
            ) : null}

            {/* Bulk Author */}
            {authors.length > 0 ? (
              <AdminSelect
                value={bulkAuthorId}
                disabled={bulkBusy}
                onChange={(e) => setBulkAuthorId(e.target.value)}
                style={{ width: 'auto', minWidth: '10.5rem' }}
                aria-label="Bulk change author"
              >
                <option value="">Set author…</option>
                {authors.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </AdminSelect>
            ) : null}

            {/* Bulk Status */}
            <AdminSelect
              value={bulkStatus}
              disabled={bulkBusy}
              onChange={(e) => setBulkStatus(e.target.value as '' | 'published' | 'draft')}
              style={{ width: 'auto', minWidth: '9.5rem' }}
              aria-label="Bulk change status"
            >
              <option value="">Set status…</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </AdminSelect>

            {/* Single Apply button */}
            <button
              type="button"
              disabled={bulkBusy || !hasBulkChanges}
              onClick={() => void handleBulkApply()}
              className="btn-brand inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-50"
            >
              {bulkBusy ? <Loader2 size={13} className="animate-spin" /> : null}
              Apply
            </button>

            {/* Bulk Delete */}
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => setConfirmBulkDelete(true)}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-50"
              style={{ background: 'var(--admin-danger-bg)', color: 'var(--admin-danger)' }}
            >
              <Trash2 size={13} />
              Delete
            </button>
          </div>
        </div>
      ) : null}

      {/* Table */}
      {loading ? (
        <LoadingState variant="news" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No news found" message="No news match your criteria." />
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <div className="table-scroll">
            <table className="w-full text-left text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-table-header)' }}>
                  <th className="w-10 px-3 py-2.5">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all articles on this page"
                      className="h-4 w-4 cursor-pointer rounded accent-[var(--admin-accent)]"
                    />
                  </th>
                  <AdminSortableHeader label="News" sortKey="title" activeKey={sortBy} direction={sortOrder} onSort={toggleSort} />
                  <AdminSortableHeader label="Author" sortKey="author" activeKey={sortBy} direction={sortOrder} onSort={toggleSort} />
                  <AdminSortableHeader label="Category" sortKey="category" activeKey={sortBy} direction={sortOrder} onSort={toggleSort} />
                  <AdminSortableHeader label="Status" sortKey="status" activeKey={sortBy} direction={sortOrder} onSort={toggleSort} />
                  <AdminSortableHeader label="Date" sortKey="date" activeKey={sortBy} direction={sortOrder} onSort={toggleSort} />
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const authorName = a.authorRef?.name || a.author || '';
                  const authorImage = a.authorRef?.avatarUrl || null;
                  const isSelected = selectedIds.has(a.id);
                  return (
                  <tr
                    key={a.id}
                    style={{
                      borderBottom: '1px solid var(--admin-border)',
                      background: isSelected ? 'var(--admin-info-bg)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'var(--admin-table-row-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isSelected ? 'var(--admin-info-bg)' : 'transparent';
                    }}
                  >
                    <td className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(a.id)}
                        aria-label={`Select ${a.title}`}
                        className="h-4 w-4 cursor-pointer rounded accent-[var(--admin-accent)]"
                      />
                    </td>
                    <td className="max-w-[10rem] px-4 py-3 sm:max-w-[18rem]">
                      <div className="flex min-w-0 items-center gap-3">
                        {a.imageUrl ? (
                          <RemoteImage src={a.imageUrl} alt="" width={48} height={36} className="news-image h-9 w-12 shrink-0 rounded object-contain" style={{ border: '1px solid var(--admin-border)' }} />
                        ) : (
                          <div className="grid h-9 w-12 shrink-0 place-items-center rounded" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-input-bg)', color: 'var(--admin-text-muted)' }}>
                            <FileText size={14} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <Link href={`/admin/news/${a.id}/edit`} className="block" style={{ color: 'var(--admin-text)' }}>
                            <NewsCopy as="span" language={a.language} text={a.title} className="block truncate text-xs font-semibold">{a.title}</NewsCopy>
                          </Link>
                          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>
                            {a.language === 'ur' ? 'Urdu' : 'English'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-[9rem] px-4 py-3">
                      {authorName ? (
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="shrink-0"><AdminAvatar name={authorName} src={authorImage} size={26} /></span>
                          <p className="truncate font-semibold" style={{ color: 'var(--admin-text)' }} title={authorName}>{authorName}</p>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--admin-text-muted)' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block max-w-[9rem] truncate rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: 'var(--admin-input-bg)', color: 'var(--admin-text-secondary)' }} title={a.category?.name || 'General'}>
                        {a.category?.name || 'General'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        type="button"
                        disabled={busyId === a.id}
                        onClick={() => togglePublish(a)}
                        className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold transition-colors duration-[180ms] motion-reduce:transition-none disabled:opacity-50"
                        style={{
                          background: a.isPublished ? 'var(--admin-success-bg)' : 'var(--admin-warning-bg)',
                          color: a.isPublished ? 'var(--admin-success)' : 'var(--admin-warning)',
                        }}
                      >
                        {a.isPublished ? <CheckCircle2 size={10} className="shrink-0" /> : <Clock size={10} className="shrink-0" />}
                        {a.isPublished ? 'Published' : 'Draft'}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono" style={{ color: 'var(--admin-text-muted)' }}>
                      {new Date(a.publishedAt || a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center justify-start gap-2">
                        <Link
                          href={newsHref(a)}
                          target="_blank"
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-md"
                          style={{ background: 'var(--admin-info-bg)', color: 'var(--admin-info)' }}
                          title="View"
                        >
                          <Eye size={16} />
                        </Link>
                        <Link
                          href={`/admin/news/${a.id}/edit`}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-md"
                          style={{ background: 'var(--admin-info-bg)', color: 'var(--admin-accent)' }}
                          title="Edit"
                        >
                          <FileEdit size={16} />
                        </Link>
                        {(a.translations || []).some((row) => row.language === otherNewsLanguage(a.language)) ? null : (
                          <Link
                            href={`/admin/news/new?translateFrom=${a.id}`}
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-md"
                            style={{ background: 'var(--admin-info-bg)', color: 'var(--admin-accent)' }}
                            title={`Create ${otherNewsLanguage(a.language) === 'ur' ? 'Urdu' : 'English'} translation`}
                          >
                            <Languages size={16} />
                          </Link>
                        )}
                        <button
                          type="button"
                          disabled={busyId === a.id}
                          onClick={() => setDeleteTarget(a)}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-md disabled:opacity-50"
                          style={{ background: 'var(--admin-danger-bg)', color: 'var(--admin-danger)' }}
                          title="Delete"
                        >
                          {busyId === a.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
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
        open={confirmPublishAll}
        title="Publish all draft news?"
        message="All unpublished draft news articles will go live immediately."
        confirmLabel="Publish All"
        onConfirm={handlePublishAll}
        onCancel={() => { if (!publishingAll) setConfirmPublishAll(false); }}
        loading={publishingAll}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete news"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={!!busyId}
        danger
      />

      <ConfirmDialog
        open={confirmBulkDelete}
        title={`Delete ${selectedCount} selected ${selectedCount === 1 ? 'article' : 'articles'}?`}
        message={`Are you sure you want to permanently delete ${selectedCount} selected news ${selectedCount === 1 ? 'article' : 'articles'}? This cannot be undone.`}
        confirmLabel={`Delete (${selectedCount})`}
        onConfirm={handleBulkDelete}
        onCancel={() => { if (!bulkBusy) setConfirmBulkDelete(false); }}
        loading={bulkBusy}
        danger
      />
    </div>
  );
}
