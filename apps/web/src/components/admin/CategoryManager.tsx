'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  FolderPlus,
  Loader2,
  Plus,
  Search,
  Tag,
  Hash,
  Sparkles,
  Layers,
  FileText,
  TrendingUp,
  ExternalLink,
  BookOpen,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  FolderArchive,
  Grid,
  List as ListIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createCategory,
  fetchNewsAdmin,
  fetchNewsCategories,
  type NewsArticleAdmin,
  type NewsCategory,
} from '../../services/newsAdmin';

export default function CategoryManager() {
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [articles, setArticles] = useState<NewsArticleAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCatName, setNewCatName] = useState('');
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetchNewsCategories().catch(() => [] as NewsCategory[]),
      fetchNewsAdmin({ limit: 200 }).then((r) => r.items).catch(() => [] as NewsArticleAdmin[]),
    ])
      .then(([cats, arts]) => {
        setCategories(cats);
        setArticles(arts);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCatName.trim();
    if (!name) return;

    setCreating(true);
    try {
      const created = await createCategory(name);
      setCategories((prev) => [...prev, created]);
      setNewCatName('');
      toast.success(`Category "${created.name}" created successfully.`);
    } catch {
      toast.error('Could not create category. Please verify your admin credentials.');
    } finally {
      setCreating(false);
    }
  };

  // Pre-calculate articles map for high performance
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

  const uncategorizedCount = useMemo(() => {
    return articles.filter((a) => !a.categoryId).length;
  }, [articles]);

  const filteredCategories = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return categories;
    return categories.filter(
      (c) =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.slug || '').toLowerCase().includes(q)
    );
  }, [categories, search]);

  const selectedCategoryArticles = useMemo(() => {
    if (!selectedCatId) return [];
    return articlesByCat.get(selectedCatId) || [];
  }, [selectedCatId, articlesByCat]);

  const selectedCategory = useMemo(() => {
    return categories.find((c) => c.id === selectedCatId) || null;
  }, [categories, selectedCatId]);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-lborder bg-gradient-to-br from-card via-card to-elevated p-6 shadow-sm sm:p-8">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-accent/5 blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent border border-accent/20">
              <Layers size={13} />
              <span>Taxonomy & Content Shelves</span>
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-mtext sm:text-4xl">
              Category Management
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-stext sm:text-base">
              Create, curate, and explore the editorial categories that structure articles into homepage spotlights, live feeds, and dedicated sport shelves.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 rounded-2xl border border-lborder/80 bg-secondary/80 px-4 py-3 shadow-inner">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-white shadow-sm">
                <Tag size={18} />
              </div>
              <div>
                <div className="text-xl font-black text-mtext">{categories.length}</div>
                <div className="text-[11px] font-semibold text-stext uppercase tracking-wide">Categories</div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-lborder/80 bg-secondary/80 px-4 py-3 shadow-inner">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                <FileText size={18} />
              </div>
              <div>
                <div className="text-xl font-black text-mtext">{articles.length}</div>
                <div className="text-[11px] font-semibold text-stext uppercase tracking-wide">Total Articles</div>
              </div>
            </div>

            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-lborder bg-card text-stext transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-50"
              title="Refresh categories"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
        {/* Left Side: Creation Box */}
        <div className="xl:col-span-4 space-y-6">
          <div className="sticky top-24 rounded-3xl border border-lborder bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 border-b border-lborder/70 pb-4">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20">
                <FolderPlus size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-mtext">Add Category</h2>
                <p className="text-xs text-stext">Create a new section for your newsroom</p>
              </div>
            </div>

            <form onSubmit={handleCreate} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="cat-name-input"
                  className="block text-xs font-bold uppercase tracking-wider text-stext mb-1.5"
                >
                  Category Title
                </label>
                <input
                  id="cat-name-input"
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. World Cup 2026, PSL 10, Interviews"
                  required
                  className="w-full rounded-xl border border-lborder bg-secondary px-3.5 py-3 text-sm text-mtext outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
                <p className="mt-1.5 text-[11px] text-stext">
                  A URL-friendly slug will be automatically created.
                </p>
              </div>

              {/* Suggestions Quick Click */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stext flex items-center gap-1">
                  <Sparkles size={12} className="text-accent" /> Popular suggestions:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {['Match Report', 'PSL News', 'Team News', 'International', 'Editorials', 'Tactics'].map(
                    (suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setNewCatName(suggestion)}
                        className="rounded-lg border border-lborder bg-secondary/80 px-2.5 py-1 text-xs font-medium text-stext transition-colors hover:border-accent/40 hover:text-accent cursor-pointer"
                      >
                        +{suggestion}
                      </button>
                    )
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={creating || !newCatName.trim()}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-bold text-white shadow-md shadow-accent/20 transition-all hover:bg-accent2 hover:shadow-lg hover:shadow-accent/30 disabled:opacity-60 cursor-pointer"
              >
                {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                <span>{creating ? 'Saving Category…' : 'Publish Category'}</span>
              </button>
            </form>

            {/* Editorial Guidelines Card */}
            <div className="mt-6 rounded-2xl border border-dashed border-lborder/80 bg-secondary/50 p-4 text-xs text-stext space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-mtext">
                <BookOpen size={14} className="text-accent" />
                <span>Editorial Tip</span>
              </div>
              <p className="leading-relaxed">
                Categories are used to organize the public <strong>/news</strong> portal into shelves. Try keeping category names concise (1–3 words) for optimal presentation on mobile badges.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Categories Directory */}
        <div className="xl:col-span-8 space-y-6">
          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-lborder bg-card p-3.5 shadow-sm">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stext"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search categories by name or slug…"
                className="w-full rounded-xl border border-lborder bg-secondary py-2 pl-10 pr-3 text-xs text-mtext outline-none transition focus:border-accent focus:bg-card"
              />
            </div>

            {/* View Mode & Count */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-stext">
                {filteredCategories.length} {filteredCategories.length === 1 ? 'result' : 'categories'}
              </span>

              <div className="flex items-center rounded-xl border border-lborder bg-secondary p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`rounded-lg p-1.5 transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-stext hover:text-mtext'
                  }`}
                  title="Grid View"
                >
                  <Grid size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`rounded-lg p-1.5 transition-colors ${
                    viewMode === 'table'
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-stext hover:text-mtext'
                  }`}
                  title="Table View"
                >
                  <ListIcon size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Categories Render */}
          {loading ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-3xl border border-lborder bg-card p-8 text-center">
              <Loader2 size={32} className="animate-spin text-accent" />
              <p className="text-xs font-semibold text-stext">Loading categories & article statistics…</p>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-lborder bg-card p-12 text-center">
              <FolderArchive size={36} className="mx-auto text-stext/50 mb-3" />
              <h3 className="text-base font-bold text-mtext">No categories found</h3>
              <p className="mt-1 text-xs text-stext max-w-sm mx-auto">
                {search
                  ? `No categories match "${search}". Try a different search query.`
                  : 'Start by creating your first news category in the form on the left.'}
              </p>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="mt-4 rounded-xl bg-secondary px-3.5 py-1.5 text-xs font-semibold text-accent hover:bg-elevated"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {filteredCategories.map((c) => {
                const catArticles = articlesByCat.get(c.id) || [];
                const count = catArticles.length;
                const publishedCount = catArticles.filter((a) => a.isPublished).length;
                const isSelected = selectedCatId === c.id;

                return (
                  <div
                    key={c.id}
                    className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border transition-all duration-300 ${
                      isSelected
                        ? 'border-accent bg-card ring-2 ring-accent/30 shadow-lg'
                        : 'border-lborder bg-card hover:border-accent/50 hover:bg-elevated hover:shadow-md'
                    }`}
                  >
                    {/* Top Accent Stripe */}
                    <div className="h-1.5 w-full bg-gradient-to-r from-accent via-accent2 to-emerald-500 opacity-70 group-hover:opacity-100 transition-opacity" />

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent ring-1 ring-accent/20 group-hover:scale-105 transition-transform">
                              <Tag size={18} />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-mtext group-hover:text-accent transition-colors">
                                {c.name}
                              </h3>
                              <p className="flex items-center gap-1 font-mono text-xs text-stext">
                                <Hash size={11} className="text-stext/60" />
                                {c.slug || c.name.toLowerCase().replace(/\s+/g, '-')}
                              </p>
                            </div>
                          </div>

                          <span className="rounded-xl border border-lborder bg-secondary px-2.5 py-1 text-xs font-bold text-mtext">
                            {count}
                          </span>
                        </div>

                        {/* Article Metrics */}
                        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-lborder/60 bg-secondary/60 p-2.5 text-center text-xs">
                          <div>
                            <div className="font-black text-emerald-500">{publishedCount}</div>
                            <div className="text-[10px] uppercase tracking-wider text-stext">Published</div>
                          </div>
                          <div className="border-l border-lborder">
                            <div className="font-black text-amber-500">{count - publishedCount}</div>
                            <div className="text-[10px] uppercase tracking-wider text-stext">Drafts</div>
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="mt-5 flex items-center justify-between border-t border-lborder/60 pt-3.5">
                        <button
                          type="button"
                          onClick={() => setSelectedCatId(isSelected ? null : c.id)}
                          className="flex items-center gap-1.5 text-xs font-bold text-accent transition-colors hover:text-accent2 cursor-pointer"
                        >
                          <BookOpen size={14} />
                          <span>{isSelected ? 'Hide articles' : 'View articles'}</span>
                        </button>

                        <Link
                          href={`/admin/news?category=${c.id}`}
                          className="flex items-center gap-1 text-xs font-semibold text-stext transition-colors hover:text-mtext"
                        >
                          <span>Manage in News</span>
                          <ArrowRight size={13} />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="overflow-hidden rounded-3xl border border-lborder bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-lborder bg-secondary/70 text-[11px] font-bold uppercase tracking-wider text-stext">
                    <tr>
                      <th className="px-5 py-3.5">Category Name</th>
                      <th className="px-5 py-3.5">Slug ID</th>
                      <th className="px-5 py-3.5 text-center">Articles</th>
                      <th className="px-5 py-3.5 text-center">Status Ratio</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-lborder/70">
                    {filteredCategories.map((c) => {
                      const catArticles = articlesByCat.get(c.id) || [];
                      const count = catArticles.length;
                      const published = catArticles.filter((a) => a.isPublished).length;

                      return (
                        <tr key={c.id} className="transition-colors hover:bg-elevated">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent/10 text-accent">
                                <Tag size={15} />
                              </div>
                              <span className="font-bold text-mtext text-sm">{c.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 font-mono text-stext">
                            #{c.slug || c.name.toLowerCase().replace(/\s+/g, '-')}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="rounded-md bg-secondary px-2.5 py-1 font-bold text-mtext border border-lborder/60">
                              {count}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="text-emerald-500 font-semibold">{published} live</span>
                            <span className="text-stext mx-1.5">•</span>
                            <span className="text-stext">{count - published} draft</span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedCatId(selectedCatId === c.id ? null : c.id)}
                                className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-semibold text-accent hover:bg-elevated cursor-pointer"
                              >
                                {selectedCatId === c.id ? 'Close' : 'Inspect'}
                              </button>
                              <Link
                                href={`/admin/news?category=${c.id}`}
                                className="rounded-lg border border-lborder p-1 text-stext hover:text-mtext hover:border-accent/40"
                                title="Go to news manager"
                              >
                                <ExternalLink size={14} />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Selected Category Drawer / Story Inspection */}
          {selectedCategory && (
            <div className="mt-8 rounded-3xl border border-accent/40 bg-card p-6 shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-lborder pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-accent">Articles in Category</span>
                  </div>
                  <h3 className="mt-1 text-xl font-black text-mtext">
                    {selectedCategory.name}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/news/new?category=${selectedCategory.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-white hover:bg-accent2"
                  >
                    <Plus size={14} />
                    Write Article Here
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSelectedCatId(null)}
                    className="rounded-xl border border-lborder px-3 py-1.5 text-xs font-semibold text-stext hover:text-mtext hover:bg-secondary"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="mt-4">
                {selectedCategoryArticles.length === 0 ? (
                  <div className="py-8 text-center text-xs text-stext">
                    No articles currently assigned to this category.
                  </div>
                ) : (
                  <div className="divide-y divide-lborder/60">
                    {selectedCategoryArticles.slice(0, 8).map((art) => (
                      <div key={art.id} className="flex items-center justify-between py-3 gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-sm font-bold text-mtext hover:text-accent">
                            <Link href={`/news/${art.id}`} target="_blank">
                              {art.title}
                            </Link>
                          </h4>
                          <div className="mt-0.5 flex items-center gap-3 text-[11px] text-stext">
                            <span>{art.author || 'Editorial staff'}</span>
                            <span>•</span>
                            <span>{art.publishedAt || art.createdAt}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              art.isPublished
                                ? 'bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20'
                            }`}
                          >
                            {art.isPublished ? 'Live' : 'Draft'}
                          </span>

                          <Link
                            href={`/admin/news/${art.id}/edit`}
                            className="rounded-lg border border-lborder px-2 py-1 text-xs font-semibold text-stext hover:text-accent hover:border-accent/40"
                          >
                            Edit
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

