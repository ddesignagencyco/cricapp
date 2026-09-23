'use client';

import Link from 'next/link';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** Small accent label above the title (homepage sections). */
  eyebrow?: string;
  /** @deprecated Use eyebrow; kept for existing call sites. */
  icon?: string;
  to?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function SectionHeader({
  title,
  subtitle,
  eyebrow,
  to,
  actionLabel,
  onAction,
}: SectionHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-wider text-accent">{eyebrow}</p>
        ) : null}
        <h2 className={`${eyebrow ? 'mt-1' : ''} text-2xl font-semibold text-mtext`}>{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-stext">{subtitle}</p> : null}
      </div>
      {to ? (
        <Link
          href={to}
          className="section-action-link group flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-accent motion-reduce:transition-none sm:text-sm"
        >
          {actionLabel || 'View all'}
          <span className="section-action-arrow" aria-hidden="true">
            &rarr;
          </span>
        </Link>
      ) : null}
      {onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="section-action-link group flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-accent motion-reduce:transition-none sm:text-sm"
        >
          {actionLabel || 'View all'}
          <span className="section-action-arrow" aria-hidden="true">
            &rarr;
          </span>
        </button>
      ) : null}
    </div>
  );
}
