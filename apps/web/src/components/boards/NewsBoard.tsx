'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  Clock,
  ChevronRight,
  Newspaper,
  User,
  Sparkles,
  Tag as TagIcon,
  Flame,
} from 'lucide-react';
import Badge from '../Badge';
import Tabs from '../Tabs';
import EmptyState from '../EmptyState';

const categoryTone: Record<string, string> = {
  'Match Report': 'live',
  'PSL News': 'upcoming',
  'Team News': 'neutral',
  International: 'neutral',
  Statistics: 'gold',
  Editorials: 'accent',
  Interviews: 'live',
};

function getCategoryName(category: unknown): string {
  if (typeof category === 'string' && category.trim()) return category.trim();
  if (category && typeof category === 'object') {
    const obj = category as Record<string, unknown>;
    return (
      (obj.name as string) ||
      (obj.title as string) ||
      (obj.slug as string) ||
      'Cricket'
    );
  }
  return 'Cricket';
}

function getArticleTags(item: any): string[] {
  if (Array.isArray(item.tags) && item.tags.length > 0) {
    return item.tags.filter((t: any) => typeof t === 'string' && t.trim());
  }
  if (typeof item.tag === 'string' && item.tag.trim()) {
    return [item.tag.trim()];
  }
  return [];
}

interface Props {
  items: any[];
  categories?: { id: string; name: string; slug: string }[];
}

export default function NewsBoard({ items, categories = [] }: Props) {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const safeItems = useMemo(() => items || [], [items]);

  // Spotlight: Priority to type === 'featured', otherwise the most recent item (first in list)
  const featured = useMemo(() => {
    if (safeItems.length === 0) return null;
    return safeItems.find((n) => n.type === 'featured' || n.isSpotlight) || safeItems[0];
  }, [safeItems]);

  // Remaining articles (cards)
  const restArticles = useMemo(() => {
    return safeItems.filter((n) => (featured ? n.id !== featured.id : true));
  }, [safeItems, featured]);

  // ONLY display explicitly created categories (from DB / backend)
  const categoryTabs = useMemo(() => {
    const tabs = [{ key: 'all', label: 'All Stories' }];
    const seen = new Set<string>();

    // 1. First add all categories created in DB (passed via props)
    for (const c of categories) {
      if (c && c.name && !seen.has(c.name.toLowerCase())) {
        seen.add(c.name.toLowerCase());
        tabs.push({ key: c.name, label: c.name });
      }
    }

    // 2. Fallback: If categories prop is empty, only add categories that actually exist on articles
    if (tabs.length === 1) {
      for (const item of safeItems) {
        const cat = getCategoryName(item.category);
        if (cat && !seen.has(cat.toLowerCase())) {
          seen.add(cat.toLowerCase());
          tabs.push({ key: cat, label: cat });
        }
      }
    }

    return tabs;
  }, [categories, safeItems]);

  // Filtered list when category selected: 'all' shows all articles
  const filtered = useMemo(() => {
    if (selectedCategory === 'all') {
      return safeItems;
    }
    const target = selectedCategory.toLowerCase();
    return safeItems.filter((n) => {
      const name = getCategoryName(n.category).toLowerCase();
      const slug = (typeof n.category === 'object' && n.category?.slug ? String(n.category.slug).toLowerCase() : '');
      const catId = n.categoryId ? String(n.categoryId).toLowerCase() : '';
      return name === target || slug === target || catId === target;
    });
  }, [safeItems, selectedCategory]);

  const spotlightCategory = featured ? getCategoryName(featured.category) : '';
  const spotlightTags = featured ? getArticleTags(featured) : [];

  return (
    <>
      <header className="mb-8">
        <div className="flex items-center gap-2 text-accent">
          <Newspaper size={18} />
          <span className="text-xs font-bold uppercase tracking-widest text-stext">
            Cricket Newsroom
          </span>
        </div>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-mtext sm:text-4xl">News & Updates</h1>
        <p className="mt-2 max-w-2xl text-sm text-stext">
          Match reports, PSL stories, team roster updates, and tactical analysis from the PAK CRICZONE team.
        </p>
      </header>

      {/* Spotlight: Pro Editorial Cover Showcase */}
      {featured && (
        <Link
          href={`/news/${featured.id}`}
          className="group relative mb-12 block overflow-hidden rounded-3xl border border-lborder bg-card shadow-sm transition-all duration-300 hover:border-accent/50 hover:bg-elevated hover:shadow-2xl"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Left/Top Cover Image Area */}
            <div className="relative min-h-[280px] overflow-hidden sm:min-h-[360px] lg:col-span-7 lg:min-h-[440px]">
              {featured.image ? (
                <img
                  src={featured.image}
                  alt={featured.title}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
              ) : (
                <div className="relative flex h-full min-h-[280px] w-full items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-primary">
                  <div className="hero-grad absolute inset-0 opacity-30" />
                  <Newspaper size={72} className="relative z-10 text-white/20" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent lg:hidden" />

              {/* Spotlight Pill on Image */}
              <div className="absolute left-4 top-4 z-10 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-accent/30">
                  <Flame size={13} className="text-white" />
                  Spotlight Story
                </span>
                {spotlightCategory && (
                  <Badge tone={categoryTone[spotlightCategory] || 'live'}>
                    {spotlightCategory}
                  </Badge>
                )}
              </div>
            </div>

            {/* Right Content Panel */}
            <div className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-5 lg:p-10">
              <div>
                {/* Meta tags for desktop */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {spotlightTags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-[11px] font-semibold text-stext border border-lborder/70"
                    >
                      <TagIcon size={10} className="text-accent" />
                      {tag}
                    </span>
                  ))}
                  {featured.date && (
                    <span className="ml-auto flex items-center gap-1.5 text-xs text-stext">
                      <Calendar size={12} className="text-accent" />
                      {featured.date}
                    </span>
                  )}
                </div>

                <h2 className="mt-4 text-2xl font-black leading-tight tracking-tight text-mtext transition-colors group-hover:text-accent sm:text-3xl lg:text-[28px] xl:text-3xl">
                  {featured.title}
                </h2>

                {featured.excerpt && (
                  <p className="mt-3.5 text-sm leading-relaxed text-stext line-clamp-4">
                    {featured.excerpt}
                  </p>
                )}
              </div>

              {/* Bottom Details & CTA */}
              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-lborder/60 pt-5 text-xs text-stext">
                <div className="flex items-center gap-3">
                  {featured.author && (
                    <span className="flex items-center gap-1.5 font-bold text-mtext">
                      <User size={14} className="text-accent" />
                      {featured.author}
                    </span>
                  )}
                  {featured.readTime && (
                    <span className="flex items-center gap-1 text-[11px]">
                      <Clock size={12} />
                      {featured.readTime}
                    </span>
                  )}
                </div>

                <span className="inline-flex items-center gap-1.5 font-bold text-accent transition-all duration-300 group-hover:translate-x-1">
                  <span>Read Article</span>
                  <ArrowRight size={15} />
                </span>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* Navigation Filter Tabs - Only shows created categories */}
      {categoryTabs.length > 1 && (
        <div className="mb-8">
          <Tabs
            tabs={categoryTabs}
            active={selectedCategory}
            onChange={setSelectedCategory}
            size="sm"
          />
        </div>
      )}

      {/* Articles Cards Grid */}
      {filtered.length > 0 ? (
        <div className="fade-in grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <ArticleCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No articles found"
          message={
            selectedCategory === 'all'
              ? 'No news articles available at the moment. Check back soon.'
              : `No articles in "${selectedCategory}". Check back soon for new updates.`
          }
        />
      )}
    </>
  );
}

function ArticleCard({ item }: { item: any }) {
  const catName = getCategoryName(item.category);
  const tags = getArticleTags(item);

  return (
    <Link
      href={`/news/${item.id}`}
      className="group flex flex-col overflow-hidden rounded-3xl bg-card ring-1 ring-lborder transition-all duration-300 hover:-translate-y-1 hover:bg-elevated hover:ring-accent/40 hover:shadow-lg"
    >
      <div
        className={`relative h-48 overflow-hidden ${
          item.image ? '' : `bg-gradient-to-br ${item.imageGradient || 'from-slate-700 to-slate-900'}`
        }`}
      >
        {item.image ? (
          <img
            src={item.image}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Newspaper size={44} className="text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

        {/* Top Badges: Category + Primary Tag */}
        <div className="absolute left-3.5 top-3.5 flex flex-wrap items-center gap-1.5 max-w-[90%]">
          {catName && (
            <Badge tone={categoryTone[catName] || 'neutral'}>
              {catName}
            </Badge>
          )}
          {tags[0] && tags[0] !== catName && (
            <span className="inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ring-1 ring-white/20 backdrop-blur-sm">
              <TagIcon size={9} className="text-accent" />
              {tags[0]}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-base font-bold leading-snug text-mtext group-hover:text-accent transition-colors">
          {item.title}
        </h3>

        {item.excerpt && (
          <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-stext">
            {item.excerpt}
          </p>
        )}

        {/* Tags Row if multiple tags exist */}
        {tags.length > 1 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {tags.slice(1, 3).map((t) => (
              <span
                key={t}
                className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-stext border border-lborder/60"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-lborder/60 pt-4 text-[11px] text-stext">
          <span className="flex items-center gap-1.5 font-medium">
            <Calendar size={12} className="text-accent" /> {item.date || 'Recent'}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={12} /> {item.readTime || '3 min read'}
          </span>
        </div>
      </div>
    </Link>
  );
}

