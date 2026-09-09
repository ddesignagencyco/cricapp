'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  FileEdit,
  FilePlus2,
  FileText,
  Loader2,
  Send,
  Tag,
  TrendingUp,
  Eye,
  Layers,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import {
  fetchNewsAdmin,
  fetchNewsCategories,
  type NewsArticleAdmin,
  type NewsCategory,
} from '../../services/newsAdmin';

export default function AdminDashboard() {
  const [articles, setArticles] = useState<NewsArticleAdmin[]>([]);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchNewsAdmin({ limit: 100 }).then((r) => r.items).catch(() => [] as NewsArticleAdmin[]),
      fetchNewsCategories().catch(() => [] as NewsCategory[]),
    ])
      .then(([a, c]) => {
        setArticles(a);
        setCategories(c);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-3xl border border-lborder bg-card">
        <Loader2 size={26} className="animate-spin text-accent" />
      </div>
    );
  }

  const published = articles.filter((a) => a.isPublished).length;
  const drafts = articles.length - published;
  const stats = [
    { label: 'Total Articles', value: articles.length, icon: FileText, color: 'text-accent' },
    { label: 'Published Live', value: published, icon: Send, color: 'text-emerald-500' },
    { label: 'Drafts in Progress', value: drafts, icon: FileEdit, color: 'text-amber-500' },
    { label: 'News Categories', value: categories.length, icon: Layers, color: 'text-accent2' },
  ];

  const recent = [...articles]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-lborder bg-card p-6 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent/5 blur-3xl" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-accent">
              <Sparkles size={16} />
              <span className="text-xs font-bold uppercase tracking-widest text-stext">Editorial Console</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-mtext sm:text-3xl">
              Content Management System
            </h1>
            <p className="text-sm text-stext max-w-xl">
              Welcome back. Manage breaking cricket news, create match reports, and manage categories across PakCricZone.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <Link
              href="/admin/categories"
              className="inline-flex items-center gap-2 rounded-xl border border-lborder bg-secondary px-4 py-2.5 text-xs font-bold text-mtext transition hover:bg-card"
            >
              <Tag size={15} />
              Categories
            </Link>
            <Link
              href="/admin/news/new"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-accent/20 transition hover:bg-accent2"
            >
              <FilePlus2 size={16} />
              Write Article
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="relative overflow-hidden rounded-2xl border border-lborder bg-card p-5 shadow-sm transition-all hover:border-accent/40"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stext">{s.label}</span>
                <div className={`grid h-8 w-8 place-items-center rounded-xl bg-secondary ${s.color}`}>
                  <Icon size={16} />
                </div>
              </div>
              <p className="mt-3 text-3xl font-black tabular-nums text-mtext">{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Activity Table & Quick Shortcuts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main 2 Cols: Recent Articles */}
        <section className="rounded-3xl border border-lborder bg-card shadow-sm lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between border-b border-lborder px-6 py-4 bg-secondary/50">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-accent" />
              <h2 className="text-sm font-bold text-mtext">Recent Articles</h2>
            </div>
            <Link
              href="/admin/news"
              className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:text-accent2"
            >
              View All
              <ArrowUpRight size={13} />
            </Link>
          </div>

          <div className="divide-y divide-lborder/60">
            {recent.length === 0 ? (
              <p className="px-6 py-12 text-center text-sm text-stext">
                No articles yet. Click &ldquo;Write Article&rdquo; above to create your first story.
              </p>
            ) : (
              recent.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-4 px-6 py-3.5 transition-colors hover:bg-elevated/40"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/news/${a.id}/edit`}
                      className="block truncate text-sm font-bold text-mtext hover:text-accent transition-colors"
                    >
                      {a.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-stext flex items-center gap-2">
                      <span className="font-semibold text-mtext/80">{a.category?.name || 'General'}</span>
                      <span>·</span>
                      <span>
                        {new Date(a.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2.5">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                        a.isPublished
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}
                    >
                      {a.isPublished ? 'Live' : 'Draft'}
                    </span>
                    <Link
                      href={`/admin/news/${a.id}/edit`}
                      className="grid h-7 w-7 place-items-center rounded-lg text-stext hover:bg-elevated hover:text-mtext"
                      title="Edit Article"
                    >
                      <FileEdit size={14} />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Right 1 Col: Categories Snapshot */}
        <section className="rounded-3xl border border-lborder bg-card shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-lborder px-6 py-4 bg-secondary/50">
              <div className="flex items-center gap-2">
                <Tag size={16} className="text-accent" />
                <h2 className="text-sm font-bold text-mtext">Categories Shelf</h2>
              </div>
              <Link
                href="/admin/categories"
                className="text-xs font-bold text-accent hover:text-accent2"
              >
                Manage
              </Link>
            </div>

            <div className="p-4 space-y-2">
              {categories.slice(0, 6).map((c) => {
                const count = articles.filter((a) => a.categoryId === c.id).length;
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-lborder/60 bg-secondary/50 px-3.5 py-2.5 text-xs"
                  >
                    <span className="font-bold text-mtext">{c.name}</span>
                    <span className="rounded-md bg-card px-2 py-0.5 text-[11px] font-semibold text-stext border border-lborder/60">
                      {count} stories
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-lborder p-4 bg-secondary/30">
            <Link
              href="/admin/categories"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-lborder bg-card py-2 text-xs font-bold text-mtext hover:text-accent transition-colors shadow-sm"
            >
              <Tag size={13} />
              Open Category Manager
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
