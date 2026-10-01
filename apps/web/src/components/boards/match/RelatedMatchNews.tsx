'use client';

import Link from 'next/link';
import { Newspaper } from 'lucide-react';
import { newsHref } from '../../../utils/newsConstraints';
import { formatShortDate } from './matchFormat';
import type { NewsArticle } from '../../../types';

/**
 * Match-related stories in the rail.
 *
 * Only stories the news query returned **for this match**. When there are none the
 * section is not rendered at all — a rail full of unrelated headlines reads as a
 * match page that has news coverage, which is a different and false claim.
 */
export default function RelatedMatchNews({
  articles,
  loading,
  viewAllHref,
  limit = 3,
}: {
  articles: NewsArticle[];
  loading?: boolean;
  viewAllHref: string | null;
  limit?: number;
}) {
  if (!loading && articles.length === 0) return null;
  const shown = articles.slice(0, limit);

  return (
    <section className="mc-rail">
      <header className="mc-rail__head">
        <h2 className="mc-rail__title">
          <Newspaper size={14} strokeWidth={2.4} aria-hidden="true" className="text-accent" />
          Related News
        </h2>
        {viewAllHref ? (
          <Link href={viewAllHref} prefetch={false} className="mc-rail__action">
            View all
          </Link>
        ) : null}
      </header>

      {loading ? (
        <ul className="mc-rail__body space-y-2.5" aria-busy="true">
          {[0, 1].map((i) => (
            <li key={i} className="h-12 rounded bg-[var(--color-skeleton)]" />
          ))}
        </ul>
      ) : (
        <ul className="mc-rail__body space-y-2.5">
          {shown.map((article) => {
            const image = typeof article.image === 'string' ? article.image.trim() : '';
            return (
              <li key={article.id}>
                <Link
                  href={newsHref(article)}
                  prefetch={false}
                  className="group flex gap-2.5"
                >
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- provider-hosted editorial image
                    <img
                      src={image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-12 w-16 shrink-0 rounded object-cover ring-1 ring-lborder"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="h-12 w-16 shrink-0 rounded bg-[var(--color-skeleton)]"
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 block text-xs font-semibold leading-snug text-mtext group-hover:text-accent">
                      {article.title}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-stext">
                      {formatShortDate(article.date)}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
