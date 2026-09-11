'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  FolderPlus,
  Loader2,
  Pencil,
  Plus,
  Search,
  Tag,
  Hash,
  FolderArchive,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createCategory,
  deleteCategory,
  fetchAllNewsAdmin,
  fetchNewsCategories,
  updateCategory,
  type NewsArticleAdmin,
  type NewsCategory,
} from '../../services/newsAdmin';
import { AdminInput, ConfirmDialog } from './AdminShared';
import { BlinkingDot } from '../Badge';

export default function CategoryManager() {
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [articles, setArticles] = useState<NewsArticleAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCatName, setNewCatName] = useState('');
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [articlesFailed, setArticlesFailed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NewsCategory | null>(null);

  const load = () => {
    setLoading(true);
    setArticlesFailed(false);
    Promise.all([
      fetchNewsCategories().catch(() => [] as NewsCategory[]),
      fetchAllNewsAdmin().catch(() => {
        setArticlesFailed(true);
        return [] as NewsArticleAdmin[];
      }),
    ])
      .then(([cats, arts]) => { setCategories(cats); setArticles(arts); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCatName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const created = await createCategory(name);
      setCategories((prev) => [...prev, created]);
      setNewCatName('');
      toast.success(`Category "${created.name}" created.`);
    } catch {
      toast.error('Could not create category.');
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async (category: NewsCategory) => {
    const name = editName.trim();
    if (!name || name === category.name) {
      setEditingId(null);
      return;
    }
    setSavingId(category.id);
    try {
      const updated = await updateCategory(category.id, { name });
      setCategories((list) => list.map((item) => (item.id === category.id ? updated : item)));
      toast.success('Category renamed.');
      setEditingId(null);
    } catch {
      toast.error('Could not rename the category.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSavingId(deleteTarget.id);
    try {
      await deleteCategory(deleteTarget.id);
      setCategories((list) => list.filter((item) => item.id !== deleteTarget.id));
      if (selectedCatId === deleteTarget.id) setSelectedCatId(null);
      toast.success('Category deleted.');
      setDeleteTarget(null);
    } catch {
      toast.error('Could not delete the category. It may still have articles.');
    } finally {
      setSavingId(null);
    }
  };

  const articlesByCat = useMemo(() => {
    const map = new Map<string, NewsArticleAdmin[]>();
    for (const art of articles) {
      if (!art.categoryId) continue;
      const list = map.get(art.categoryId) || [];
      list.push(art);
      map.set(art.categoryId, list);
    }
    return map;
  }, [articles]);

  const filteredCategories = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return categories;
    return categories.filter(
      (c) => (c.name || '').toLowerCase().includes(q) || (c.slug || '').toLowerCase().includes(q)
    );
  }, [categories, search]);

  const selectedCategoryArticles = useMemo(() => {
    if (!selectedCatId) return [];
    return articlesByCat.get(selectedCatId) || [];
  }, [selectedCatId, articlesByCat]);

  const selectedCategory = categories.find((c) => c.id === selectedCatId) || null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--admin-text)' }}>Category Management</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
            Create and organize editorial categories.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[300px_1fr]">
        {/* Create Form */}
        <div className="rounded-lg p-4" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <div className="flex items-center gap-2 mb-3 pb-3" style={{ borderBottom: '1px solid var(--admin-border)' }}>
            <FolderPlus size={14} style={{ color: 'var(--admin-accent)' }} />
            <h2 className="text-xs font-bold" style={{ color: 'var(--admin-text)' }}>Add Category</h2>
          </div>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--admin-text-secondary)' }}>Name</label>
              <AdminInput
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. PSL 10, Match Reports"
                required
              />
            </div>
            <button
              type="submit"
              disabled={creating || !newCatName.trim()}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-bold text-white disabled:opacity-50 transition-colors"
              style={{ background: 'var(--admin-accent)' }}
            >
              {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              {creating ? 'Creating...' : 'Create Category'}
            </button>
          </form>
        </div>

        {/* Categories List */}
        <div className="space-y-3">
          {/* Search Bar */}
          <div className="flex items-center gap-3 rounded-lg p-3" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
            <div className="relative flex-1">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--admin-text-muted)' }} />
              <AdminInput
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search categories..."
                style={{ paddingLeft: '2.25rem' }}
              />
            </div>
            <span className="text-xs shrink-0" style={{ color: 'var(--admin-text-muted)' }}>
              {filteredCategories.length} categories
            </span>
          </div>

          {articlesFailed && !loading && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg p-3 text-xs" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-warning-bg)', color: 'var(--admin-warning)' }}>
              <span>Article counts are unavailable because the articles could not be loaded.</span>
              <button type="button" onClick={load} className="rounded px-2 py-1 font-semibold" style={{ color: 'var(--admin-accent)' }}>
                Retry
              </button>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="flex min-h-[200px] items-center justify-center rounded-lg" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--admin-accent)' }} />
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-card)' }}>
              <FolderArchive size={28} className="mx-auto mb-2" style={{ color: 'var(--admin-text-muted)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>No categories found</h3>
              <p className="mt-1 text-xs" style={{ color: 'var(--admin-text-secondary)' }}>
                {search ? `No results for "${search}".` : 'Create your first category above.'}
              </p>
            </div>
          ) : (
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-table-header)' }}>
                    <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Category</th>
                    <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Slug</th>
                    <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-center" style={{ color: 'var(--admin-text-secondary)' }}>Articles</th>
                    <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-center" style={{ color: 'var(--admin-text-secondary)' }}>Status</th>
                    <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-right" style={{ color: 'var(--admin-text-secondary)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.map((c) => {
                    const catArticles = articlesByCat.get(c.id) || [];
                    const count = catArticles.length;
                    const published = catArticles.filter((a) => a.isPublished).length;
                    const isSelected = selectedCatId === c.id;
                    return (
                      <tr
                        key={c.id}
                        style={{ borderBottom: '1px solid var(--admin-border)', background: isSelected ? 'var(--admin-table-row-hover)' : undefined }}
                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--admin-table-row-hover)'; }}
                        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="grid h-7 w-7 place-items-center rounded-md" style={{ background: 'var(--admin-accent)', color: '#fff' }}>
                              <Tag size={12} />
                            </div>
                            {editingId === c.id ? (
                              <AdminInput
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    void handleRename(c);
                                  }
                                  if (e.key === 'Escape') setEditingId(null);
                                }}
                              />
                            ) : (
                              <span className="font-bold" style={{ color: 'var(--admin-text)' }}>{c.name}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono" style={{ color: 'var(--admin-text-muted)' }}>
                          <span className="flex items-center gap-1"><Hash size={10} />{c.slug || c.name.toLowerCase().replace(/\s+/g, '-')}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: 'var(--admin-input-bg)', color: 'var(--admin-text)' }}>
                            {articlesFailed ? '—' : count}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs">
                          {articlesFailed ? (
                            <span style={{ color: 'var(--admin-text-muted)' }}>Unavailable</span>
                          ) : (
                            <>
                              <span style={{ color: 'var(--admin-success)' }}>{published} live</span>
                              <span className="mx-1" style={{ color: 'var(--admin-text-muted)' }}>·</span>
                              <span style={{ color: 'var(--admin-text-muted)' }}>{count - published} draft</span>
                            </>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {editingId === c.id ? (
                              <button
                                type="button"
                                disabled={savingId === c.id}
                                onClick={() => void handleRename(c)}
                                className="rounded px-2 py-1 text-xs font-bold"
                                style={{ color: 'var(--admin-accent)' }}
                              >
                                {savingId === c.id ? 'Saving…' : 'Save'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => { setEditingId(c.id); setEditName(c.name); }}
                                className="rounded px-2 py-1 text-xs font-bold"
                                style={{ color: 'var(--admin-text-secondary)' }}
                                aria-label={`Rename ${c.name}`}
                              >
                                <Pencil size={12} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(c)}
                              className="rounded px-2 py-1 text-xs font-bold"
                              style={{ color: 'var(--admin-danger)' }}
                              aria-label={`Delete ${c.name}`}
                            >
                              <Trash2 size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedCatId(isSelected ? null : c.id)}
                              className="rounded px-2 py-1 text-xs font-bold transition-colors"
                              style={{ color: 'var(--admin-accent)', background: isSelected ? 'var(--admin-info-bg)' : 'transparent' }}
                            >
                              {isSelected ? 'Close' : 'Inspect'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Selected Category Drawer */}
          {selectedCategory && (
            <div className="rounded-lg p-4" style={{ border: '1px solid var(--admin-accent)', background: 'var(--admin-card)' }}>
              <div className="flex items-center justify-between pb-3 mb-3" style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-accent)' }}>Articles in Category</span>
                  <h3 className="mt-0.5 text-sm font-bold" style={{ color: 'var(--admin-text)' }}>{selectedCategory.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/admin/news/new?category=${selectedCategory.id}`} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold text-white" style={{ background: 'var(--admin-accent)' }}>
                    <Plus size={12} /> New Article
                  </Link>
                  <button type="button" onClick={() => setSelectedCatId(null)} className="rounded-md px-2 py-1 text-xs font-semibold" style={{ color: 'var(--admin-text-muted)' }}>
                    Close
                  </button>
                </div>
              </div>
              {selectedCategoryArticles.length === 0 ? (
                <p className="py-6 text-center text-xs" style={{ color: 'var(--admin-text-muted)' }}>No articles in this category.</p>
              ) : (
                <div>
                  {selectedCategoryArticles.slice(0, 8).map((art) => (
                    <div key={art.id} className="flex items-center justify-between py-2 gap-2" style={{ borderBottom: '1px solid var(--admin-border)' }}>
                      <div className="min-w-0 flex-1">
                        <Link href={`/admin/news/${art.id}/edit`} className="block truncate text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>{art.title}</Link>
                        <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{art.author || 'Editorial'} · {art.publishedAt || art.createdAt}</p>
                      </div>
                      <span
                        className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold uppercase"
                        style={{ background: art.isPublished ? 'var(--admin-success-bg)' : 'var(--admin-warning-bg)', color: art.isPublished ? 'var(--admin-success)' : 'var(--admin-warning)' }}
                      >
                        {art.isPublished && <BlinkingDot />}
                        {art.isPublished ? 'Live' : 'Draft'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete category"
        message={deleteTarget ? `Delete “${deleteTarget.name}”? Articles in this category will lose the category link.` : ''}
        confirmLabel="Delete"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        danger
      />
    </div>
  );
}
