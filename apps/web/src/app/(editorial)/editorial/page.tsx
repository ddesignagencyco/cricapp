'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  FileText,
  FilePlus2,
  FileEdit,
  Send,
  Tag,
  PenLine,
  ArrowUpRight,
  Users,
} from 'lucide-react';
import { AdminPageSkeleton } from '../../../components/skeletons/Skeletons';
import { BlinkingDot } from '../../../components/Badge';
import { ErrorState } from '../../../components/admin/AdminShared';
import {
  fetchEditorialOverview,
  type EditorialOverview,
} from '../../../services/editorialStudio';

export default function EditorialDashboardPage() {
  const [data, setData] = useState<EditorialOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    fetchEditorialOverview()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <AdminPageSkeleton />;
  if (error || !data) return <ErrorState message="Could not load your editorial overview." onRetry={load} />;

  const isEditor = data.role === 'EDITOR';
  const stats = [
    {
      label: isEditor ? 'Total Articles' : 'My Articles',
      value: data.stats.total,
      icon: FileText,
      color: 'var(--admin-accent)',
      bg: 'var(--admin-info-bg)',
    },
    {
      label: 'Published Live',
      value: data.stats.published,
      icon: Send,
      color: 'var(--admin-success)',
      bg: 'var(--admin-success-bg)',
    },
    {
      label: 'Drafts',
      value: data.stats.drafts,
      icon: FileEdit,
      color: 'var(--admin-warning)',
      bg: 'var(--admin-warning-bg)',
    },
    isEditor
      ? {
          label: 'Authors',
          value: data.stats.authors,
          icon: Users,
          color: 'var(--admin-accent)',
          bg: 'var(--admin-info-bg)',
        }
      : {
          label: 'Categories',
          value: data.stats.categories,
          icon: Tag,
          color: 'var(--admin-accent)',
          bg: 'var(--admin-info-bg)',
        },
  ];

  return (
    <div className="space-y-5">
      <div
        className="rounded-lg p-5 sm:p-6"
        style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-bold sm:text-xl" style={{ color: 'var(--admin-text)' }}>
              {isEditor ? 'Editorial Desk' : 'Author Studio'}
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
              {isEditor
                ? 'Review drafts, publish breaking stories, and manage editorial categories and pages.'
                : 'Write cricket news, manage your drafts, and update your public author byline.'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/editorial/profile"
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-colors"
              style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-secondary)' }}
            >
              <PenLine size={14} />
              Author Profile
            </Link>
            <Link
              href="/editorial/articles/new"
              className="btn-brand inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-bold transition-colors"
            >
              <FilePlus2 size={14} />
              Write Article
            </Link>
          </div>
        </div>
      </div>

      {!data.authorProfile && (
        <div
          className="flex flex-col gap-3 rounded-lg p-4 sm:flex-row sm:items-center sm:justify-between"
          style={{ border: '1px solid var(--admin-warning)', background: 'var(--admin-warning-bg)' }}
        >
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
              Set up your public Author Profile
            </p>
            <p className="text-xs" style={{ color: 'var(--admin-text-secondary)' }}>
              Create your byline name, bio, and avatar so readers can follow your articles.
            </p>
          </div>
          <Link
            href="/editorial/profile"
            className="btn-brand inline-flex shrink-0 items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-bold"
          >
            <PenLine size={13} />
            Create Profile
          </Link>
        </div>
      )}

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

      <section
        className="rounded-lg overflow-hidden"
        style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--admin-border)' }}>
          <div className="flex items-center gap-2">
            <FileText size={14} style={{ color: 'var(--admin-accent)' }} />
            <h2 className="text-xs font-bold" style={{ color: 'var(--admin-text)' }}>
              {isEditor ? 'Recently Updated Articles' : 'Your Recent Articles'}
            </h2>
          </div>
          <Link
            href="/editorial/articles"
            className="inline-flex items-center gap-1 text-xs font-semibold"
            style={{ color: 'var(--admin-accent)' }}
          >
            View all <ArrowUpRight size={12} />
          </Link>
        </div>

        {data.recentArticles.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--admin-text-secondary)' }}>
              No articles yet. Start writing your first story!
            </p>
            <Link
              href="/editorial/articles/new"
              className="btn-brand mt-3 inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-bold"
            >
              <FilePlus2 size={13} />
              Write Article
            </Link>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
            {data.recentArticles.map((article) => (
              <div key={article.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/editorial/articles/${article.id}/edit`}
                    className="block truncate text-sm font-semibold hover:underline"
                    style={{ color: 'var(--admin-text)' }}
                  >
                    {article.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    {article.category && <span>{article.category.name}</span>}
                    {article.authorName && <span>By {article.authorName}</span>}
                    <span>{new Date(article.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {article.isPublished ? (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                      style={{ background: 'var(--admin-success-bg)', color: 'var(--admin-success)' }}
                    >
                      <BlinkingDot />
                      Live
                    </span>
                  ) : (
                    <span
                      className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                      style={{ background: 'var(--admin-warning-bg)', color: 'var(--admin-warning)' }}
                    >
                      Draft
                    </span>
                  )}
                  <Link
                    href={`/editorial/articles/${article.id}/edit`}
                    className="rounded-md px-2.5 py-1 text-xs font-semibold"
                    style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-secondary)' }}
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
