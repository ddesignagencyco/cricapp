'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (_page: number) => void;
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (!totalPages || totalPages <= 1) return null;

  const getPages = (): (number | 'dots')[] => {
    const result: (number | 'dots')[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) result.push(i);
      return result;
    }

    result.push(1);

    if (page > 4) result.push('dots');

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) result.push(i);

    if (page < totalPages - 3) result.push('dots');

    result.push(totalPages);

    return result;
  };

  const pages = getPages();

  return (
    <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="grid h-9 w-9 place-items-center rounded-full border border-lborder bg-card text-stext transition-all hover:border-accent/40 hover:text-accent disabled:pointer-events-none disabled:opacity-40"
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </button>

      {pages.map((p, i) =>
        p === 'dots' ? (
          <span key={`dots-${i}`} className="px-1 text-sm text-stext" aria-hidden="true">...</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`grid h-9 w-9 place-items-center rounded-full text-sm font-semibold transition-all ${
              p === page
                ? 'bg-accent text-white shadow-md shadow-accent/25'
                : 'border border-lborder bg-card text-stext hover:border-accent/40 hover:text-accent'
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="grid h-9 w-9 place-items-center rounded-full border border-lborder bg-card text-stext transition-all hover:border-accent/40 hover:text-accent disabled:pointer-events-none disabled:opacity-40"
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
