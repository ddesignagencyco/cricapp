'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, Calendar, Clock, Newspaper, User } from 'lucide-react';
import Badge from '../Badge';
import AdBanner from '../AdBanner';
import ShareButton from '../ShareButton';

const categoryTone: Record<string, string> = {
  'Match Report': 'live',
  'PSL News': 'upcoming',
  'Team News': 'neutral',
  International: 'neutral',
  Statistics: 'gold',
};

interface Props {
  item: any;
  related?: any[];
}

export default function NewsDetailBody({ item, related = [] }: Props) {
  if (!item) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <Newspaper size={40} className="mx-auto text-stext" />
        <h1 className="mt-4 text-2xl font-bold text-mtext">Article not found</h1>
        <p className="mt-2 text-sm text-stext">We couldn&apos;t find that article. It may have been moved or removed.</p>
        <Link href="/news" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:text-accent2">
          <ArrowLeft size={14} /> Back to all news
        </Link>
      </div>
    );
  }

  const paragraphs = (item.content || '').split('\n\n').filter(Boolean);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <nav className="mb-6 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-stext" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-accent">Home</Link>
        <span>/</span>
        <Link href="/news" className="hover:text-accent">News</Link>
        <span>/</span>
        <span className="font-medium text-mtext">{item.title}</span>
      </nav>

      <article>
        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={categoryTone[item.category] || 'neutral'}>{item.tag || item.category}</Badge>
            {item.type === 'featured' && <Badge tone="live">Featured</Badge>}
          </div>
          <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-mtext sm:text-5xl">
            {item.title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-stext sm:text-lg">
            {item.excerpt}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-5 border-b border-lborder pb-6 text-xs text-stext">
            <span className="flex items-center gap-1.5">
              <User size={14} className="text-accent" /> {item.author}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar size={14} /> {item.date}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={14} /> {item.readTime}
            </span>
            <ShareButton title={item.title} text={item.excerpt} className="ml-auto" />
          </div>
        </header>

        <div className={`relative h-56 overflow-hidden rounded-3xl sm:h-80 ${item.image ? '' : `bg-gradient-to-br ${item.imageGradient || 'from-slate-600 to-slate-800'}`}`}>
          {item.image ? (
            <img
              src={item.image}
              alt={item.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Newspaper size={72} className="text-white/25" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />
        </div>

        <div className="mx-auto mt-10 max-w-3xl">
          <div className="space-y-6">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-base leading-8 text-mtext/90">
                {p}
              </p>
            ))}
          </div>

          <div className="mt-10 rounded-2xl bg-card p-5 ring-1 ring-lborder">
            <AdBanner variant="horizontal" />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-lborder pt-6">
            <Link href="/news" className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent2">
              <ArrowLeft size={15} /> Back to all news
            </Link>
            <span className="flex items-center gap-1.5 text-xs text-stext">
              <Newspaper size={14} /> PAK CRICZONE Newsroom
            </span>
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section className="mt-14">
          <div className="mb-5 flex items-end justify-between">
            <h2 className="text-xl font-bold text-mtext">More News</h2>
            <Link href="/news" className="text-sm font-semibold text-accent hover:text-accent2">
              All news <ArrowRight size={14} className="inline" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((a) => (
              <Link
                key={a.id}
                href={`/news/${a.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-lborder transition-all duration-300 hover:-translate-y-0.5 hover:bg-elevated hover:ring-accent/30"
              >
                <div className={`relative h-32 overflow-hidden ${a.image ? '' : `bg-gradient-to-br ${a.imageGradient || 'from-slate-600 to-slate-800'}`}`}>
                  {a.image && (
                    <img
                      src={a.image}
                      alt={a.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute left-3 top-3">
                    <Badge tone={categoryTone[a.category] || 'neutral'}>{a.tag || a.category}</Badge>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="line-clamp-2 text-sm font-bold leading-snug text-mtext group-hover:text-accent">
                    {a.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-xs text-stext">{a.excerpt}</p>
                  <div className="mt-auto flex items-center justify-between pt-3 text-[11px] text-stext">
                    <span className="flex items-center gap-1.5"><Calendar size={11} /> {a.date}</span>
                    <span className="flex items-center gap-1.5"><Clock size={11} /> {a.readTime}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
