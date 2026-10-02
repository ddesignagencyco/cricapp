'use client';

import { useEffect, useState } from 'react';
import type { EditorialTocItem } from './EditorialLayout';

export default function EditorialToc({
  items,
  variant = 'panel',
}: {
  items: EditorialTocItem[];
  variant?: 'panel' | 'inline';
}) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? '');

  useEffect(() => {
    if (items.length === 0) return;
    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (headings.length === 0) return;

    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const firstVisible = headings.find((el) => visible.has(el.id));
        if (firstVisible) setActiveId(firstVisible.id);
      },
      { rootMargin: '-96px 0px -65% 0px', threshold: 0 },
    );

    headings.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  if (items.length < 2) return null;

  if (variant === 'inline') {
    return (
      <ol className="mt-3 space-y-1">
        {items.map((item, index) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={`flex gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                activeId === item.id
                  ? 'bg-accent/10 font-semibold text-accent'
                  : 'text-stext hover:bg-[var(--color-row-hover)] hover:text-mtext'
              }`}
            >
              <span className="w-4 shrink-0 text-right font-mono text-[11px] tabular-nums opacity-70">
                {index + 1}
              </span>
              <span className="min-w-0">{item.label}</span>
            </a>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ol className="mt-3 space-y-0.5 border-l border-lborder">
      {items.map((item, index) => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            aria-current={activeId === item.id ? 'location' : undefined}
            className={`-ml-px flex gap-2 border-l-2 py-1.5 pl-3 pr-2 text-sm leading-snug transition-colors ${
              activeId === item.id
                ? 'border-accent font-semibold text-accent'
                : 'border-transparent text-stext hover:border-lborder hover:text-mtext'
            }`}
          >
            <span className="w-4 shrink-0 text-right font-mono text-[11px] tabular-nums opacity-70">
              {index + 1}
            </span>
            <span className="min-w-0">{item.label}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}
