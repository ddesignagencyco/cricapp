'use client';

import { useMemo, useState } from 'react';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import Link from 'next/link';
import { ChevronRight, Newspaper } from 'lucide-react';
import SearchField from '../SearchField';
import EmptyState from '../EmptyState';
import PersonAvatar from '../PersonAvatar';
import ShareButton from '../ShareButton';
import type { PublicAuthor } from '../../services/authors';

export default function AuthorsBoard({ authors }: { authors: PublicAuthor[] }) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return authors;
    return authors.filter((author) => {
      const haystack = [author.name, author.bio].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [authors, debouncedQuery]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <header>
          <p className="text-xs font-medium uppercase tracking-widest text-stext">Newsroom</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-mtext">Authors</h1>
          <p className="mt-1 max-w-xl text-sm text-stext">
            Writers covering PSL, internationals, and match reports.
          </p>
        </header>
        <SearchField
          wrapperClassName="w-full sm:w-64"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search authors…"
          aria-label="Search authors"
          iconSize={15}
        />
      </div>

      {authors.length === 0 ? (
        <EmptyState title="No authors yet" message="Writers will appear here as published news is credited." />
      ) : filtered.length === 0 ? (
        <EmptyState title="No authors found" message="Try a different name or clear the search." />
      ) : (
        <>
          <p className="text-xs text-stext">
            Showing <span className="font-bold text-mtext">{filtered.length}</span> of {authors.length}{' '}
            author{authors.length === 1 ? '' : 's'}
          </p>
          <ul className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((author) => {
              return (
                <li key={author.slug} className="min-h-0">
                  <div className="group flex h-full items-center gap-2 rounded-md border border-lborder bg-card p-3.5 transition-colors hover:border-accent/50 hover:bg-[var(--color-row-hover)]">
                    <Link href={`/authors/${author.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <PersonAvatar name={author.name} src={author.avatarUrl} size={48} />
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-sm font-semibold text-mtext transition-colors group-hover:text-accent">
                        {author.name}
                      </h2>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-stext">
                        <Newspaper size={11} className="shrink-0" />
                        {author.articleCount ?? 0} published
                      </p>
                      <p className="mt-1 line-clamp-1 min-h-4 text-xs text-stext">{author.bio || '\u00a0'}</p>
                    </div>
                    <ChevronRight
                      size={16}
                      className="shrink-0 text-stext transition-colors group-hover:text-accent"
                      aria-hidden="true"
                    />
                    </Link>
                    <ShareButton
                      fallbackTitle={author.name}
                      href={`/authors/${encodeURIComponent(author.slug)}`}
                      compact
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
