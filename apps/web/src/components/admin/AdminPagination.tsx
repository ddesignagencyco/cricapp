'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  total?: number;
  limit?: number;
  onPageChange: (_page: number) => void;
}

export default function Pagination({ page, totalPages, total, limit, onPageChange }: PaginationProps) {
  if (totalPages <= 1 && total === undefined) return null;

  const pages: (number | 'dots')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('dots');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('dots');
    pages.push(totalPages);
  }

  const showingFrom = total !== undefined && limit !== undefined ? Math.min((page - 1) * limit + 1, total) : null;
  const showingTo = total !== undefined && limit !== undefined ? Math.min(page * limit, total) : null;

  const btnStyle = (active: boolean, disabled: boolean): React.CSSProperties => ({
    display: 'grid',
    placeItems: 'center',
    width: '2rem',
    height: '2rem',
    borderRadius: '0.375rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    border: active ? 'none' : '1px solid var(--admin-border)',
    background: active ? 'var(--admin-accent)' : 'transparent',
    color: active ? '#fff' : disabled ? 'var(--admin-text-muted)' : 'var(--admin-text-secondary)',
    opacity: disabled ? 0.4 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s',
  });

  return (
    <nav className="flex items-center justify-between gap-4" aria-label="Pagination">
      {showingFrom !== null && showingTo !== null && total !== undefined && (
        <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          Showing {showingFrom}–{showingTo} of {total}
        </span>
      )}

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          style={btnStyle(false, page <= 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </button>

        {pages.map((p, i) =>
          p === 'dots' ? (
            <span
              key={`dots-${i}`}
              style={{ width: '2rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.75rem' }}
              aria-hidden="true"
            >
              ...
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              style={btnStyle(p === page, false)}
              aria-current={p === page ? 'page' : undefined}
              aria-label={`Page ${p}`}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          style={btnStyle(false, page >= totalPages)}
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </nav>
  );
}
