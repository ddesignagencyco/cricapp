import type { ReactNode } from 'react';

interface PageToolbarProps {
  children: ReactNode;
  /** Search, counts, or actions aligned to the end (matches page layout). */
  end?: ReactNode;
  className?: string;
}

/** Tabs row + optional trailing controls — same spacing as Cricket Matches. */
export default function PageToolbar({ children, end, className = '' }: PageToolbarProps) {
  return (
    <div className={`page-toolbar flex flex-wrap items-center justify-between gap-3 pb-1 ${className}`}>
      <div className="min-w-0 max-w-full">{children}</div>
      {end ? <div className="w-full shrink-0 sm:w-auto sm:max-w-sm">{end}</div> : null}
    </div>
  );
}

export { searchPillInputClass } from './SearchField';
