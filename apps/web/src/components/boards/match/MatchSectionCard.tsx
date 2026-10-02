import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

/**
 * The card every section of the match centre sits in.
 *
 * The reference design is a dense column of identically-styled panels: a small
 * coloured icon, a short title, and a body. Without one shared shell each section
 * re-derived its own padding, border and title size, which is what made the page
 * look assembled rather than designed. One component means the icon, the title
 * baseline, the padding and the radius are the same everywhere by construction.
 */
export function MatchSectionCard({
  icon: Icon,
  title,
  action,
  description,
  children,
  className = '',
  bodyClassName = '',
  tone = 'accent',
}: {
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  title: string;
  /** A "View all" style link. Rendered only when there is somewhere to go. */
  action?: { href: string; label: string } | null;
  description?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  tone?: 'accent' | 'brand';
}) {
  return (
    <section className={`mc-section ${className}`.trim()}>
      <header className="mc-section__head">
        <div className="flex min-w-0 items-center gap-2">
          {Icon ? (
            <span className={`mc-section__icon ${tone === 'brand' ? 'mc-section__icon--brand' : ''}`.trim()}>
              <Icon size={15} strokeWidth={2.4} aria-hidden="true" />
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="mc-section__title">{title}</h2>
            {description ? <p className="mc-section__desc">{description}</p> : null}
          </div>
        </div>
        {action ? (
          <Link href={action.href} prefetch={false} className="mc-section__action">
            {action.label}
            <ChevronRight size={13} strokeWidth={2.6} aria-hidden="true" />
          </Link>
        ) : null}
      </header>
      <div className={`mc-section__body ${bodyClassName}`.trim()}>{children}</div>
    </section>
  );
}

/** A small labelled fact, used inside the scoreboard and match info. */
export function MetaPair({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="mc-meta__label">{label}</dt>
      <dd className="mc-meta__value">{value}</dd>
    </div>
  );
}
