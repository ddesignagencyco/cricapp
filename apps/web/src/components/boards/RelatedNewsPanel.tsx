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

export function RelatedNewsPanel({
  articles,
  loading = false,
  emptyTitle,
  emptyHint,
}: {
  articles: NewsArticle[];
  loading?: boolean;
  emptyTitle: string;
  emptyHint: string;
}) {
  if (loading) {
    return <p className="text-sm text-stext">Loading news…</p>;
  }
  if (articles.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyHint} />;
  }
  return (
    <ul className="space-y-3">
      {articles.map((article) => (
        <li key={article.id} className="rounded-2xl bg-card p-4 ring-1 ring-lborder">
          <Link href={newsHref(article)} className="text-sm font-semibold text-mtext hover:text-accent">
            {article.title}
          </Link>
          {article.date ? <p className="mt-1 text-xs text-stext">{article.date}</p> : null}
        </li>
      ))}
    </ul>
  );
}
