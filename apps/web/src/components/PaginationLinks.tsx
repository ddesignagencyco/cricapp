import Link from 'next/link';

/**
 * Server-rendered pagination.
 *
 * The existing `Pagination` is a client component that pushes a route change from state,
 * which cannot be used from a server component and leaves nothing for a crawler to follow.
 * This one renders real links, so the pages are reachable without JavaScript, shareable
 * and indexable — the reason the entity news pages paginate on the server at all.
 */

/** A short window around the current page, with `null` standing in for a gap. */
function windowOf(page: number, totalPages: number): (number | null)[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages: (number | null)[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) pages.push(null);
  for (let i = start; i <= end; i += 1) pages.push(i);
  if (end < totalPages - 1) pages.push(null);
  pages.push(totalPages);
  return pages;
}

export default function PaginationLinks({
  page,
  totalPages,
  hrefFor,
  label,
}: {
  page: number;
  totalPages: number;
  /** Builds the href for a page number, so the caller controls the URL shape. */
  hrefFor: (_page: number) => string;
  /** What the list is, used for the accessible group name. */
  label: string;
}) {
  const total = Math.max(1, totalPages);
  const current = Math.min(total, Math.max(1, page));
  if (total <= 1) return null;

  const base =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2.5 text-sm font-semibold transition-colors';

  return (
    <nav aria-label={`${label} pages`} className="flex flex-wrap items-center justify-center gap-1.5">
      {current > 1 ? (
        <Link
          href={hrefFor(current - 1)}
          rel="prev"
          className={`${base} bg-card text-mtext ring-1 ring-lborder hover:bg-secondary`}
        >
          Previous
        </Link>
      ) : (
        <span className={`${base} cursor-default bg-card text-lborder/60 ring-1 ring-lborder/50`}>
          Previous
        </span>
      )}

      {windowOf(current, total).map((entry, index) =>
        entry === null ? (
          <span key={`gap-${index}`} className="px-1 text-sm text-stext">
            …
          </span>
        ) : entry === current ? (
          <span
            key={entry}
            aria-current="page"
            className={`${base} bg-brand text-brand-fg ring-1 ring-brand`}
          >
            {entry}
          </span>
        ) : (
          <Link
            key={entry}
            href={hrefFor(entry)}
            className={`${base} bg-card text-mtext ring-1 ring-lborder hover:bg-secondary`}
          >
            {entry}
          </Link>
        ),
      )}

      {current < total ? (
        <Link
          href={hrefFor(current + 1)}
          rel="next"
          className={`${base} bg-card text-mtext ring-1 ring-lborder hover:bg-secondary`}
        >
          Next
        </Link>
      ) : (
        <span className={`${base} cursor-default bg-card text-lborder/60 ring-1 ring-lborder/50`}>
          Next
        </span>
      )}
    </nav>
  );
}
