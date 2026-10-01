import Link from 'next/link';
import type { ReactNode } from 'react';
import { CalendarClock, ChevronRight, FileText, MessageSquare } from 'lucide-react';
import EditorialToc from './EditorialToc';

export const EDITORIAL_PAGES = [
  { slug: 'about', href: '/about', label: 'About' },
  { slug: 'privacy', href: '/privacy', label: 'Privacy Policy' },
  { slug: 'terms', href: '/terms', label: 'Terms of Service' },
  { slug: 'editorial-policy', href: '/editorial/editorial-policy', label: 'Editorial Policy' },
  { slug: 'corrections', href: '/editorial/corrections', label: 'Corrections' },
] as const;

export type EditorialTocItem = { id: string; label: string };

function formatUpdatedAt(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function EditorialLayout({
  title,
  slug,
  updatedAt,
  intro,
  toc = [],
  children,
}: {
  title: string;
  slug: string;
  updatedAt?: string | null;
  intro?: string;
  toc?: EditorialTocItem[];
  children: ReactNode;
}) {
  const updated = formatUpdatedAt(updatedAt);
  const currentIndex = EDITORIAL_PAGES.findIndex((page) => page.slug === slug);
  const current = currentIndex >= 0 ? EDITORIAL_PAGES[currentIndex] : undefined;
  const prev = currentIndex > 0 ? EDITORIAL_PAGES[currentIndex - 1] : undefined;
  const next =
    currentIndex >= 0 && currentIndex < EDITORIAL_PAGES.length - 1
      ? EDITORIAL_PAGES[currentIndex + 1]
      : undefined;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-14 pt-6 sm:px-6 lg:pb-20 lg:pt-10">
      <nav
        className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-stext"
        aria-label="Breadcrumb"
      >
        <Link href="/" className="transition-colors hover:text-accent">
          Home
        </Link>
        <ChevronRight size={12} aria-hidden="true" className="opacity-60" />
        <span>Company</span>
        <ChevronRight size={12} aria-hidden="true" className="opacity-60" />
        <span className="font-medium text-mtext" aria-current="page">
          {current?.label || title}
        </span>
      </nav>

      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:hidden">
        {EDITORIAL_PAGES.map((page) => {
          const active = page.slug === slug;
          return (
            <Link
              key={page.slug}
              href={page.href}
              aria-current={active ? 'page' : undefined}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 transition-colors ${
                active
                  ? 'bg-accent/10 text-accent ring-accent/30'
                  : 'bg-card text-stext ring-lborder hover:text-mtext'
              }`}
            >
              {page.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-6 grid items-start gap-x-12 gap-y-10 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <article className="min-w-0">
          <header className="overflow-hidden rounded-2xl border border-lborder bg-card">
            <div className="h-1 w-full bg-[linear-gradient(90deg,var(--color-brand),var(--color-accent))]" />
            <div className="px-5 py-6 sm:px-8 sm:py-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
                  <FileText size={11} aria-hidden="true" />
                  PAK CRICZONE
                </span>
                {updated ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-stext">
                    <CalendarClock size={11} aria-hidden="true" />
                    Updated {updated}
                  </span>
                ) : null}
              </div>

              <h1 className="mt-4 text-balance text-3xl font-black leading-[1.12] tracking-tight text-mtext sm:text-4xl lg:text-[2.75rem]">
                {title}
              </h1>

              {intro ? (
                <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-stext sm:text-lg">
                  {intro}
                </p>
              ) : null}
            </div>
          </header>

          {toc.length > 1 ? (
            <details className="group mt-5 rounded-2xl border border-lborder bg-card lg:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-4 text-xs font-bold uppercase tracking-[0.14em] text-mtext [&::-webkit-details-marker]:hidden">
                On this page
                <ChevronRight
                  size={16}
                  aria-hidden="true"
                  className="shrink-0 text-stext transition-transform group-open:rotate-90"
                />
              </summary>
              <div className="border-t border-lborder px-5 py-4">
                <EditorialToc items={toc} variant="inline" />
              </div>
            </details>
          ) : null}

          <div className="editorial-doc tiptap-content mt-8 max-w-3xl">{children}</div>

          {prev || next ? (
            <nav
              className="mt-12 grid max-w-3xl gap-3 border-t border-lborder pt-6 sm:grid-cols-2"
              aria-label="Other company pages"
            >
              {prev ? (
                <Link
                  href={prev.href}
                  className="group flex min-w-0 flex-col gap-0.5 rounded-xl border border-lborder bg-card px-4 py-3 transition-colors hover:border-accent/40 hover:bg-row-hover"
                >
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-stext">
                    Previous
                  </span>
                  <span className="truncate text-sm font-semibold text-mtext">{prev.label}</span>
                </Link>
              ) : (
                <span aria-hidden="true" />
              )}
              {next ? (
                <Link
                  href={next.href}
                  className="group flex min-w-0 flex-col items-end gap-0.5 rounded-xl border border-lborder bg-card px-4 py-3 text-right transition-colors hover:border-accent/40 hover:bg-row-hover sm:col-start-2"
                >
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-stext">
                    Next
                  </span>
                  <span className="truncate text-sm font-semibold text-mtext">{next.label}</span>
                </Link>
              ) : null}
            </nav>
          ) : null}

          <div className="mt-6 flex max-w-3xl flex-col gap-4 rounded-2xl border border-lborder bg-secondary/60 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-mtext">Questions about this page?</p>
              <p className="mt-1 text-sm leading-relaxed text-stext">
                The newsroom can help with corrections, sourcing and takedown requests.
              </p>
            </div>
            <Link
              href="/contact"
              className="btn-brand inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
            >
              <MessageSquare size={15} aria-hidden="true" />
              Contact us
            </Link>
          </div>
        </article>

        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-5">
            {toc.length > 1 ? (
              <div className="rounded-2xl border border-lborder bg-card p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-mtext">
                  On this page
                </p>
                <EditorialToc items={toc} />
              </div>
            ) : null}

            <div className="rounded-2xl border border-lborder bg-card p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-mtext">
                Policy pages
              </p>
              <nav className="mt-3 flex flex-col" aria-label="Company pages">
                {EDITORIAL_PAGES.map((page) => {
                  const active = page.slug === slug;
                  return (
                    <Link
                      key={page.slug}
                      href={page.href}
                      aria-current={active ? 'page' : undefined}
                      className={`-ml-0.5 rounded-md border-l-2 px-3 py-2 text-sm transition-colors ${
                        active
                          ? 'border-accent bg-accent/10 font-semibold text-accent'
                          : 'border-transparent text-stext hover:border-lborder hover:text-mtext'
                      }`}
                    >
                      {page.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
