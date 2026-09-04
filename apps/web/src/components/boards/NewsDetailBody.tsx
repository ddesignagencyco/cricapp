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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav className="mb-6 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-stext" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-accent">Home</Link>
        <span>/</span>
        <Link href="/news" className="hover:text-accent">News</Link>
        <span>/</span>
        <span className="font-medium text-mtext">{item.title}</span>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <article className="min-w-0 lg:col-span-2">
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

          <div className="mt-10">
            <div className="space-y-6">
              {paragraphs.map((p, i) => (
                <p key={i} className="text-base leading-8 text-mtext/90">
                  {p}
                </p>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-lborder pt-6">
              <Link href="/news" className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent2">
                <ArrowLeft size={15} /> Back to all news
              </Link>
              <span className="flex items-center gap-1.5 text-xs text-stext">
                <Newspaper size={14} /> PAK CRICZONE Newsroom
              </span>
            </div>
          </div>
        </article>

        <aside className="min-w-0 lg:col-span-1">
          <div className="space-y-8 lg:sticky lg:top-20">
            <section>
              <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-stext">
                Sponsored
              </p>
              <AdBanner variant="vertical" />
            </section>

            {related.length > 0 && (
              <section>
                <div className="mb-4 flex items-end justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-mtext">
                    More News
                  </h2>
                  <Link href="/news" className="flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent2">
                    All <ArrowRight size={13} />
                  </Link>
                </div>
                <div className="space-y-4">
                  {related.map((a) => (
                    <Link
                      key={a.id}
                      href={`/news/${a.id}`}
                      className="group flex gap-3"
                    >
                      <div
                        className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-sm ring-1 ring-lborder ${
                          a.image ? '' : `bg-gradient-to-br ${a.imageGradient || 'from-slate-600 to-slate-800'}`
                        }`}
                      >
                        {a.image && (
                          <img
                            src={a.image}
                            alt={a.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-mtext transition-colors group-hover:text-accent">
                          {a.title}
                        </h3>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-stext">
                          <Calendar size={11} /> {a.date}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
