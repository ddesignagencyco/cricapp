'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import EmptyState from '../EmptyState';
import { fetchNews, type NewsListParams } from '../../services/news';
import type { NewsArticle } from '../../types';
import { newsHref } from '../../utils/newsConstraints';

export function decodeEntityId(value: unknown): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

type LinkFilter = Pick<NewsListParams, 'matchId' | 'teamId' | 'playerId' | 'seriesId'>;

export function useLinkedNews(filter: LinkFilter, initial: NewsArticle[] = []) {
  const matchId = filter.matchId ? decodeEntityId(filter.matchId) : undefined;
  const teamId = filter.teamId ? decodeEntityId(filter.teamId) : undefined;
  const playerId = filter.playerId ? decodeEntityId(filter.playerId) : undefined;
  const seriesId = filter.seriesId ? decodeEntityId(filter.seriesId) : undefined;
  const [articles, setArticles] = useState<NewsArticle[]>(initial);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchId && !teamId && !playerId && !seriesId) {
      setArticles([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchNews({ matchId, teamId, playerId, seriesId, limit: 12 })
      .then((items) => {
        if (!cancelled) setArticles(items);
      })
      .catch(() => {
        if (!cancelled) setArticles([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [matchId, teamId, playerId, seriesId]);

  return { articles, loading };
}

/**
 * One story.
 *
 * Every field shown is a field the API actually returns on the article: the image or the
 * stored gradient, the category, the excerpt, the author and the read time. When an
 * article has no image and no gradient, nothing is drawn in its place — an empty frame or
 * a generic placeholder would be worse than simply starting with the headline.
 */
function NewsCard({ article, compact = false }: { article: NewsArticle; compact?: boolean }) {
  const image = typeof article.image === 'string' ? article.image.trim() : '';
  const gradient = typeof article.imageGradient === 'string' ? article.imageGradient.trim() : '';
  const category = typeof article.category === 'string' ? article.category.trim() : '';
  const excerpt = typeof article.excerpt === 'string' ? article.excerpt.trim() : '';

  return (
    <li
      className={
        compact
          ? 'overflow-hidden rounded-xl bg-card ring-1 ring-lborder'
          : 'overflow-hidden rounded-2xl bg-card ring-1 ring-lborder'
      }
    >
      <Link href={newsHref(article)} className="group block">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            loading="lazy"
            className={compact ? 'h-24 w-full object-cover' : 'h-40 w-full object-cover'}
          />
        ) : gradient ? (
          <div
            aria-hidden
            className={compact ? 'h-16 w-full' : 'h-28 w-full'}
            style={{ backgroundImage: gradient }}
          />
        ) : null}
        <div className={compact ? 'p-2.5' : 'p-4'}>
          {category ? (
            <p className="text-[10px] font-bold uppercase tracking-widest text-accent">{category}</p>
          ) : null}
          <p
            className={
              compact
                ? 'mt-1 line-clamp-3 text-xs font-semibold leading-snug text-mtext group-hover:text-accent'
                : 'mt-1 text-sm font-semibold leading-snug text-mtext group-hover:text-accent'
            }
          >
            {article.title}
          </p>
          {!compact && excerpt ? (
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-stext">{excerpt}</p>
          ) : null}
          <p className="mt-1.5 text-[11px] text-stext">
            {[
              typeof article.source === 'string' && article.source.trim() ? article.source.trim() : '',
              article.author || '',
              article.readTime || '',
              article.date || '',
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </Link>
    </li>
  );
}

export function RelatedNewsPanel({
  articles,
  loading = false,
  emptyTitle,
  emptyHint,
  compact = false,
  limit,
  viewAllHref,
  viewAllLabel = 'View all news',
}: {
  articles: NewsArticle[];
  loading?: boolean;
  emptyTitle: string;
  emptyHint: string;
  /** The narrower form used in the match page's right rail. */
  compact?: boolean;
  limit?: number;
  /**
   * Where "View all" goes — normally the entity's own news page. When this is absent and
   * stories were cut, the count is shown instead of a dead link rather than pretending
   * there is nowhere else to read them.
   */
  viewAllHref?: string | null;
  viewAllLabel?: string;
}) {
  if (loading) {
    return <p className="text-sm text-stext">Loading news…</p>;
  }
  if (articles.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyHint} />;
  }
  const shown = typeof limit === 'number' ? articles.slice(0, limit) : articles;
  const hidden = articles.length - shown.length;
  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {shown.map((article) => (
          <NewsCard key={article.id} article={article} compact={compact} />
        ))}
      </ul>
      {hidden > 0 ? (
        viewAllHref ? (
          <Link
            href={viewAllHref}
            className="block rounded-lg bg-secondary px-3 py-2 text-center text-xs font-semibold text-mtext ring-1 ring-lborder transition-colors hover:bg-card hover:text-accent"
          >
            {viewAllLabel}
            {articles.length > 0 ? ` (${articles.length})` : ''}
          </Link>
        ) : (
          <p className="text-center text-[11px] text-stext">
            {hidden} more {hidden === 1 ? 'story' : 'stories'} on the full news page
          </p>
        )
      ) : null}
    </div>
  );
}
