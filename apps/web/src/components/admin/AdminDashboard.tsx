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
  ArrowUpRight,
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
      .then(([a, c]) => { setArticles(a); setCategories(c); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-lg" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
        <Loader2 size={22} className="animate-spin" style={{ color: 'var(--admin-accent)' }} />
      </div>
    );
  }

  const published = articles.filter((a) => a.isPublished).length;
  const drafts = articles.length - published;
  const stats = [
    { label: 'Total Articles', value: articles.length, icon: FileText, color: 'var(--admin-accent)', bg: 'var(--admin-info-bg)' },
    { label: 'Published Live', value: published, icon: Send, color: 'var(--admin-success)', bg: 'var(--admin-success-bg)' },
    { label: 'Drafts', value: drafts, icon: FileEdit, color: 'var(--admin-warning)', bg: 'var(--admin-warning-bg)' },
    { label: 'Categories', value: categories.length, icon: Tag, color: 'var(--admin-accent)', bg: 'var(--admin-info-bg)' },
  ];

  const recent = [...articles]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-5">
      {/* Welcome Banner */}
      <div className="rounded-lg p-5 sm:p-6" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-bold sm:text-xl" style={{ color: 'var(--admin-text)' }}>
              Content Management
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
              Manage breaking cricket news, match reports, and editorial categories.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/admin/categories"
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-colors"
              style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-secondary)' }}
            >
              <Tag size={14} />
              Categories
            </Link>
            <Link
              href="/admin/news/new"
              className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-bold text-white transition-colors"
              style={{ background: 'var(--admin-accent)' }}
            >
              <FilePlus2 size={14} />
              Write Article
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-lg p-4"
              style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>
                  {s.label}
                </span>
                <div className="grid h-7 w-7 place-items-center rounded-md" style={{ background: s.bg, color: s.color }}>
                  <Icon size={14} />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                {s.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Recent Articles & Categories */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Recent Articles */}
        <section className="rounded-lg overflow-hidden lg:col-span-2" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--admin-border)' }}>
            <div className="flex items-center gap-2">
              <FileText size={14} style={{ color: 'var(--admin-accent)' }} />
              <h2 className="text-xs font-bold" style={{ color: 'var(--admin-text)' }}>Recent Articles</h2>
            </div>
            <Link href="/admin/news" className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: 'var(--admin-accent)' }}>
              View All <ArrowUpRight size={12} />
            </Link>
          </div>
          <div>
            {recent.length === 0 ? (
              <p className="px-4 py-10 text-center text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                No articles yet. Click &ldquo;Write Article&rdquo; above.
              </p>
            ) : (
              recent.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors"
                  style={{ borderBottom: '1px solid var(--admin-border)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-table-row-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/news/${a.id}/edit`}
                      className="block truncate text-xs font-semibold transition-colors"
                      style={{ color: 'var(--admin-text)' }}
                    >
                      {a.title}
                    </Link>
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                      {a.category?.name || 'General'} · {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-xs font-bold uppercase"
                    style={{
                      background: a.isPublished ? 'var(--admin-success-bg)' : 'var(--admin-warning-bg)',
                      color: a.isPublished ? 'var(--admin-success)' : 'var(--admin-warning)',
                    }}
                  >
                    {a.isPublished ? 'Live' : 'Draft'}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Categories */}
        <section className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--admin-border)' }}>
            <div className="flex items-center gap-2">
              <Tag size={14} style={{ color: 'var(--admin-accent)' }} />
              <h2 className="text-xs font-bold" style={{ color: 'var(--admin-text)' }}>Categories</h2>
            </div>
            <Link href="/admin/categories" className="text-xs font-bold" style={{ color: 'var(--admin-accent)' }}>
              Manage
            </Link>
          </div>
          <div className="p-3 space-y-1.5">
            {categories.slice(0, 6).map((c) => {
              const count = articles.filter((a) => a.categoryId === c.id).length;
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-md px-3 py-2 text-xs"
                  style={{ border: '1px solid var(--admin-border)' }}
                >
                  <span className="font-semibold" style={{ color: 'var(--admin-text)' }}>{c.name}</span>
                  <span className="rounded px-1.5 py-0.5 text-xs font-semibold" style={{ background: 'var(--admin-input-bg)', color: 'var(--admin-text-muted)' }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
