'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  page: number;
  totalPages: number;
  total?: number;
  limit?: number;
  className?: string;
  onPageChange: (_page: number) => void;
}

export default function Pagination({ page, totalPages, total, limit, className = '', onPageChange }: PaginationProps) {
  const safeTotalPages = Math.max(1, Number.isFinite(totalPages) ? Math.floor(totalPages) : 1);
  const safePage = Math.min(safeTotalPages, Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1));
  const canPaginate = safeTotalPages > 1;
  if (!canPaginate && total === undefined) return null;

  const getPages = (): (number | 'dots')[] => {
    const result: (number | 'dots')[] = [];

    if (safeTotalPages <= 7) {
      for (let i = 1; i <= safeTotalPages; i++) result.push(i);
      return result;
    }

    result.push(1);

    if (safePage > 4) result.push('dots');

    const start = Math.max(2, safePage - 1);
    const end = Math.min(safeTotalPages - 1, safePage + 1);
    for (let i = start; i <= end; i++) result.push(i);

    if (safePage < safeTotalPages - 3) result.push('dots');

    result.push(safeTotalPages);

    return result;
  };

  const pages = getPages();
  const showingFrom = total !== undefined && limit !== undefined && total > 0
    ? Math.min((safePage - 1) * limit + 1, total)
    : null;
  const showingTo = total !== undefined && limit !== undefined && total > 0
    ? Math.min(safePage * limit, total)
    : null;

  return (
    <nav className={`mt-8 flex flex-col items-center justify-between gap-3 sm:flex-row ${className}`} aria-label="Pagination">
      <p className="text-xs font-normal text-stext" aria-live="polite">
        {showingFrom !== null && showingTo !== null && total !== undefined
          ? `Showing ${showingFrom}–${showingTo} of ${total}`
          : `Page ${safePage} of ${safeTotalPages}`}
      </p>

      {canPaginate && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
            disabled={safePage <= 1}
            className="grid h-9 w-9 place-items-center rounded border border-lborder bg-card text-stext transition-colors hover:border-accent/50 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>

          {pages.map((p, i) =>
            p === 'dots' ? (
              <span key={`dots-${i}`} className="px-1 text-sm text-stext" aria-hidden="true">…</span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={p === safePage ? 'page' : undefined}
                aria-label={`Page ${p}`}
                className={`grid h-9 w-9 place-items-center rounded border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  p === safePage
                    ? 'btn-brand border-transparent'
                    : 'border-lborder bg-card text-stext hover:border-accent/50 hover:text-accent'
                }`}
              >
                {p}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => onPageChange(Math.min(safeTotalPages, safePage + 1))}
            disabled={safePage >= safeTotalPages}
            className="grid h-9 w-9 place-items-center rounded border border-lborder bg-card text-stext transition-colors hover:border-accent/50 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </nav>
  );
}
