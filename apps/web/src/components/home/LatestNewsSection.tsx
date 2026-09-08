'use client';

import Link from 'next/link';
import { getInitials } from '../../utils/helpers';

interface LatestNewsSectionProps {
  news: any[];
}

export default function LatestNewsSection({ news }: LatestNewsSectionProps) {
  if (!news.length) return null;

  const featured = news[0];
  const sidebar = news.slice(1, 4);
  const bottomRow = news.slice(4, 7);

  return (
    <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <h2 className="text-xl font-bold tracking-tight text-mtext sm:text-2xl">Latest News</h2>
        <Link
          href="/news"
          className="shrink-0 whitespace-nowrap text-sm font-semibold text-accent transition-colors hover:text-accent2"
        >
          All news
        </Link>
      </div>

      {/* Top row: large featured + sidebar */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Large featured image */}
        <Link
          href={`/news/${featured.id}`}
          className="group relative overflow-hidden rounded-xl lg:col-span-2 lg:row-span-2"
        >
          <div className="relative h-64 overflow-hidden sm:h-80 lg:h-full lg:min-h-[360px]">
            {featured.image ? (
              <img
                src={featured.image}
                alt={featured.title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className={`h-full w-full bg-gradient-to-br ${featured.imageGradient || 'from-slate-600 to-slate-800'}`} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute left-4 top-4">
              <span className="inline-block rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                {featured.tag || featured.category}
              </span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <h3 className="text-xl font-bold leading-snug text-white group-hover:text-accent">
                {featured.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-sm text-white/70">{featured.excerpt}</p>
              <p className="mt-2 text-xs text-white/50">{featured.date} • {featured.readTime}</p>
            </div>
          </div>
        </Link>

        {/* Right sidebar articles */}
        {sidebar.map((item) => (
          <Link
            key={item.id}
            href={`/news/${item.id}`}
            className="group flex gap-4 overflow-hidden rounded-xl bg-card p-3 ring-1 ring-lborder transition-all duration-300 hover:bg-elevated hover:ring-accent/30"
          >
            <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className={`h-full w-full bg-gradient-to-br ${item.imageGradient || 'from-slate-600 to-slate-800'}`} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="inline-block rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent">
                {item.tag || item.category}
              </span>
              <h4 className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-mtext group-hover:text-accent">
                {item.title}
              </h4>
              <p className="mt-1 text-[11px] text-stext">{item.date} • {item.readTime}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Bottom row: additional articles */}
      {bottomRow.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {bottomRow.map((item) => (
            <Link
              key={item.id}
              href={`/news/${item.id}`}
              className="group flex gap-4 overflow-hidden rounded-xl bg-card p-3 ring-1 ring-lborder transition-all duration-300 hover:bg-elevated hover:ring-accent/30"
            >
              <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className={`h-full w-full bg-gradient-to-br ${item.imageGradient || 'from-slate-600 to-slate-800'}`} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="inline-block rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent">
                  {item.tag || item.category}
                </span>
                <h4 className="mt-1 line-clamp-2 text-[13px] font-bold leading-snug text-mtext group-hover:text-accent">
                  {item.title}
                </h4>
                <p className="mt-1 text-[10px] text-stext">{item.date}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
