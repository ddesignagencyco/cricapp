'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FilePlus2,
  FileText,
  Pencil,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  AdminPageHeader,
  AdminSearchField,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../../components/admin/AdminShared';
import AdminPagination from '../../../../components/admin/AdminPagination';
import { useAuth } from '../../../../components/AuthProvider';
import {
  bulkEditorialArticles,
  deleteEditorialArticle,
  fetchEditorialArticles,
  fetchEditorialCategories,
  updateEditorialArticle,
} from '../../../../services/editorialStudio';
import type { NewsArticleAdmin, NewsCategory } from '../../../../services/newsAdmin';

const LIMIT = 20;

export default function EditorialArticlesPage() {
  const { isEditor } = useAuth();
  const [articles, setArticles] = useState<NewsArticleAdmin[]>([]);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<NewsArticleAdmin | null>(null);

  const load = useCallback(
    (nextPage = page) => {
      setLoading(true);
      setError(false);
      fetchEditorialArticles({
        page: nextPage,
        limit: LIMIT,
        q: q.trim() || undefined,
        status: status === 'all' ? undefined : status,
        category: categoryId || undefined,
      })
        .then((res) => {
          setArticles(res.items);
          setTotalPages(Math.max(1, res.totalPages));
          setPage(nextPage);
          setSelected([]);
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    },
    [page, q, status, categoryId],
  );

  useEffect(() => {
    fetchEditorialCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(1), 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, categoryId]);

  const togglePublish = async (article: NewsArticleAdmin) => {
    setBusyId(article.id);
    try {
      const updated = await updateEditorialArticle(article.id, {
        isPublished: !article.isPublished,
      });
      setArticles((list) =>
        list.map((item) => (item.id === article.id ? { ...item, ...updated } : item)),
      );
      toast.success(updated.isPublished ? 'Article published!' : 'Moved to drafts.');
    } catch {
      toast.error('Could not update article status.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setBusyId(confirmDelete.id);
    try {
      await deleteEditorialArticle(confirmDelete.id);
      setArticles((list) => list.filter((item) => item.id !== confirmDelete.id));
      toast.success('Article deleted.');
    } catch {
      toast.error('Could not delete article.');
    } finally {
      setBusyId(null);
      setConfirmDelete(null);
    }
  };

  const runBulk = async (action: 'publish' | 'unpublish' | 'delete') => {
    if (!selected.length) return;
    try {
      const payload =
        action === 'delete'
          ? { ids: selected, action: 'delete' as const }
          : {
              ids: selected,
              action: 'update' as const,
              status: (action === 'publish' ? 'published' : 'draft') as 'published' | 'draft',
            };
      const res = await bulkEditorialArticles(payload);
      toast.success(`Updated ${res.affected} article(s).`);
      load(page);
    } catch {
      toast.error('Bulk action failed.');
    }
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title={isEditor ? 'All Articles' : 'My Articles'}
        subtitle={
          isEditor
            ? 'Review, publish, and edit articles across all authors.'
            : 'Manage your drafts and published stories.'
        }
        actions={
          <Link
            href="/editorial/articles/new"
            className="btn-brand inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-bold"
          >
            <FilePlus2 size={14} />
            Write Article
          </Link>
        }
      />

      <div
        className="flex flex-col gap-3 rounded-lg p-3 md:flex-row md:items-center md:justify-between"
        style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
      >
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <AdminSearchField
            wrapperClassName="max-w-xs"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title or summary"
          />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-md px-2.5 py-1.5 text-xs font-semibold outline-none"
            style={{
              border: '1px solid var(--admin-border)',
              background: 'var(--admin-input-bg)',
              color: 'var(--admin-text)',
            }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(['all', 'published', 'draft'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatus(key)}
              className="rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors"
              style={{
                background: status === key ? 'var(--admin-accent)' : 'var(--admin-input-bg)',
                color: status === key ? 'var(--color-brand-fg)' : 'var(--admin-text-secondary)',
                border: status === key ? 'none' : '1px solid var(--admin-border)',
              }}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      {isEditor && selected.length > 0 && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-4 py-2.5"
          style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
        >
          <span className="text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>
            {selected.length} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => runBulk('publish')}
              className="rounded-md px-3 py-1 text-xs font-bold"
              style={{ background: 'var(--admin-success-bg)', color: 'var(--admin-success)' }}
            >
              Publish
            </button>
            <button
              type="button"
              onClick={() => runBulk('unpublish')}
              className="rounded-md px-3 py-1 text-xs font-bold"
              style={{ background: 'var(--admin-warning-bg)', color: 'var(--admin-warning)' }}
            >
              Unpublish
            </button>
            <button
              type="button"
              onClick={() => runBulk('delete')}
              className="rounded-md px-3 py-1 text-xs font-bold"
              style={{ background: 'var(--admin-danger-bg)', color: 'var(--admin-danger)' }}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message="Could not load articles." onRetry={() => load(page)} />
      ) : articles.length === 0 ? (
        <EmptyState
          icon={<FileText size={28} />}
          title="No articles found"
          message="Create a new article or adjust your filters."
        />
      ) : (
        <div
          className="overflow-hidden rounded-lg"
          style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
        >
          <div className="table-scroll">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ background: 'var(--admin-table-header)', borderBottom: '1px solid var(--admin-border)' }}>
                  {isEditor && (
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.length === articles.length && articles.length > 0}
                        onChange={(e) =>
                          setSelected(e.target.checked ? articles.map((a) => a.id) : [])
                        }
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>
                    Title
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>
                    Category
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>
                    Status
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>
                    Updated
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => {
                  const busy = busyId === article.id;
                  return (
                    <tr key={article.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                      {isEditor && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.includes(article.id)}
                            onChange={(e) =>
                              setSelected((prev) =>
                                e.target.checked
                                  ? [...prev, article.id]
                                  : prev.filter((id) => id !== article.id),
                              )
                            }
                          />
                        </td>
                      )}
                      <td className="max-w-[20rem] px-4 py-3">
                        <Link
                          href={`/editorial/articles/${article.id}/edit`}
                          className="block truncate font-semibold hover:underline"
                          style={{ color: 'var(--admin-text)' }}
                        >
                          {article.title}
                        </Link>
                        <p className="truncate text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                          {article.authorRef?.name || article.author || 'Unassigned'} · {article.language?.toUpperCase() || 'EN'}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs" style={{ color: 'var(--admin-text-secondary)' }}>
                        {article.category?.name || 'Uncategorized'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => togglePublish(article)}
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold transition-opacity disabled:opacity-50"
                          style={{
                            background: article.isPublished ? 'var(--admin-success-bg)' : 'var(--admin-warning-bg)',
                            color: article.isPublished ? 'var(--admin-success)' : 'var(--admin-warning)',
                          }}
                          title={article.isPublished ? 'Click to move to drafts' : 'Click to publish'}
                        >
                          {article.isPublished ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                          {article.isPublished ? 'Published' : 'Draft'}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums" style={{ color: 'var(--admin-text-muted)' }}>
                        {new Date(article.createdAt).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/editorial/articles/${article.id}/edit`}
                            className="grid h-7 w-7 place-items-center rounded-md transition-colors"
                            style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-secondary)' }}
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </Link>
                          {article.isPublished && (
                            <a
                              href={`/news/${article.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="grid h-7 w-7 place-items-center rounded-md transition-colors"
                              style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-secondary)' }}
                              title="View live"
                            >
                              <ExternalLink size={13} />
                            </a>
                          )}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setConfirmDelete(article)}
                            className="grid h-7 w-7 place-items-center rounded-md transition-colors disabled:opacity-50"
                            style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-danger)' }}
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <AdminPagination page={page} totalPages={totalPages} onPageChange={(p) => load(p)} />
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete article?"
        message={confirmDelete ? `Permanently delete "${confirmDelete.title}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        danger
        loading={Boolean(busyId)}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
