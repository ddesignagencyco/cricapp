'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Calendar, Clock, Newspaper, User } from 'lucide-react';
import Badge from '../Badge';
import Tabs from '../Tabs';
import EmptyState from '../EmptyState';

const categoryTone: Record<string, string> = {
  'Match Report': 'live',
  'PSL News': 'upcoming',
  'Team News': 'neutral',
  International: 'neutral',
  Statistics: 'gold',
};

const newsTabs = [
  { key: 'all', label: 'All' },
  { key: 'Match Report', label: 'Match Reports' },
  { key: 'PSL News', label: 'PSL News' },
  { key: 'Team News', label: 'Team News' },
  { key: 'International', label: 'International' },
  { key: 'Statistics', label: 'Statistics' },
];

interface Props {
  items: any[];
}

export default function NewsBoard({ items }: Props) {
  const [category, setCategory] = useState('all');

  const featured = (items || []).find((n) => n.type === 'featured');
  const filtered = useMemo(() => {
    let list = items || [];
    if (category !== 'all') {
      list = list.filter((n) => n.category === category);
    }
    return list.filter((n) => (featured ? n.id !== featured.id : true));
  }, [items, category, featured]);

  return (
    <>
      <header className="mb-8">
        <div className="flex items-center gap-2 text-accent">
          <Newspaper size={18} />
          <span className="text-xs font-bold uppercase tracking-widest text-stext">
            Cricket Newsroom
          </span>
        </div>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">News</h1>
        <p className="mt-2 max-w-2xl text-sm text-stext">
          Match reports, PSL updates and analysis. All content is sample/mock data for demonstration purposes.
        </p>
      </header>

      {featured && (
        <Link
          href={`/news/${featured.id}`}
          className="group relative mb-10 block overflow-hidden rounded-3xl ring-1 ring-lborder"
        >
          {featured.image ? (
            <img
              src={featured.image}
              alt={featured.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <>
              <div className={`absolute inset-0 bg-gradient-to-br ${featured.imageGradient || 'from-cyan-600 to-blue-800'} opacity-80`} />
              <div className="hero-grad absolute inset-0 opacity-40" />
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/40" />
          <div className="hero-content relative p-6 sm:p-10">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="live">Featured</Badge>
              <Badge tone="neutral">{featured.category}</Badge>
              <span className="flex items-center gap-1 text-xs text-slate-300">
                <Clock size={13} /> {featured.date}
              </span>
            </div>
            <h2 className="hero-title mt-4 max-w-3xl text-2xl font-black leading-tight tracking-tight sm:text-4xl">
              {featured.title}
            </h2>
            <p className="hero-lead mt-4 max-w-2xl text-sm leading-relaxed sm:text-base">
              {featured.excerpt}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-5 text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <User size={14} /> {featured.author}
              </span>
              <span>{featured.readTime}</span>
              <span className="inline-flex items-center gap-1 font-semibold text-accent group-hover:text-accent2">
                Read article <ArrowRight size={14} />
              </span>
            </div>
          </div>
        </Link>
      )}

      <div className="mb-8">
        <Tabs tabs={newsTabs} active={category} onChange={setCategory} size="sm" />
      </div>

      {filtered.length > 0 ? (
        <div className="fade-in grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <ArticleCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No articles in this category"
          message="Check back soon — new articles are added regularly."
        />
      )}
    </>
  );
}

function ArticleCard({ item }: { item: any }) {
  return (
    <Link
      href={`/news/${item.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-lborder transition-all duration-300 hover:-translate-y-0.5 hover:bg-elevated hover:ring-accent/30"
    >
      <div className={`relative h-44 overflow-hidden ${item.image ? '' : `bg-gradient-to-br ${item.imageGradient || 'from-slate-600 to-slate-800'}`}`}>
        {item.image ? (
          <img
            src={item.image}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Newspaper size={48} className="text-white/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute left-3 top-3">
          <Badge tone={categoryTone[item.category] || 'neutral'}>{item.tag || item.category}</Badge>
        </div>
        <div className="pointer-events-none absolute -bottom-6 -right-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-base font-bold leading-snug text-mtext group-hover:text-accent">
          {item.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-stext">{item.excerpt}</p>
        <div className="mt-auto flex items-center justify-between pt-4 text-[11px] text-stext">
          <span className="flex items-center gap-1.5">
            <Calendar size={12} /> {item.date}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={12} /> {item.readTime}
          </span>
        </div>
      </div>
    </Link>
  );
}
