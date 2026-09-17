import Link from 'next/link';
import type { ReactNode } from 'react';

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
  const current = EDITORIAL_PAGES.find((page) => page.slug === slug);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      <nav className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-stext" aria-label="Breadcrumb">
        <Link href="/" className="transition-colors hover:text-accent">Home</Link>
        <span aria-hidden="true">/</span>
        <span>Company</span>
        <span aria-hidden="true">/</span>
        <span className="font-medium text-mtext">{current?.label || title}</span>
      </nav>

      <div className="mt-5 flex gap-2 overflow-x-auto no-scrollbar lg:hidden">
        {EDITORIAL_PAGES.map((page) => {
          const active = page.slug === slug;
          return (
            <Link
              key={page.slug}
              href={page.href}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-colors ${
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

      <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_16.5rem] lg:gap-14">
        <article className="min-w-0">
          <header className="border-b border-lborder pb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Pak Criczone</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-mtext sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
              {title}
            </h1>
            {updated ? (
              <p className="mt-4 text-sm text-stext">Last updated {updated}</p>
            ) : null}
            {intro ? (
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-stext sm:text-lg">{intro}</p>
            ) : null}
          </header>

          {toc.length > 1 ? (
            <details className="mt-6 rounded-xl bg-secondary/70 p-4 ring-1 ring-lborder lg:hidden">
              <summary className="cursor-pointer text-xs font-bold uppercase tracking-widest text-mtext">
                On this page
              </summary>
              <ol className="mt-3 space-y-2">
                {toc.map((item, index) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`} className="text-sm text-stext hover:text-accent">
                      {index + 1}. {item.label}
                    </a>
                  </li>
                ))}
              </ol>
            </details>
          ) : null}

          <div className="editorial-doc tiptap-content mt-8 max-w-3xl">
            {children}
          </div>

          <div className="mt-12 flex max-w-3xl flex-col gap-3 border-t border-lborder pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-stext">Questions about this page? The newsroom can help.</p>
            <Link href="/contact" className="btn-brand inline-flex shrink-0 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold">
              Contact us
            </Link>
          </div>
        </article>

        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-6">
            {toc.length > 1 ? (
              <div className="rounded-2xl bg-card p-4 ring-1 ring-lborder">
                <p className="text-[11px] font-bold uppercase tracking-widest text-stext">On this page</p>
                <ol className="mt-3 space-y-2">
                  {toc.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="block text-sm leading-snug text-stext transition-colors hover:text-accent"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            <div className="rounded-2xl bg-card p-4 ring-1 ring-lborder">
              <p className="text-[11px] font-bold uppercase tracking-widest text-stext">Policies</p>
              <nav className="mt-3 flex flex-col" aria-label="Company pages">
                {EDITORIAL_PAGES.map((page) => {
                  const active = page.slug === slug;
                  return (
                    <Link
                      key={page.slug}
                      href={page.href}
                      className={`border-l-2 px-3 py-2 text-sm transition-colors ${
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
