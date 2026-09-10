'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  Calendar,
  Clock,
  Newspaper,
  User,
  Tag as TagIcon,
  Flame,
} from 'lucide-react';
import Badge from '../Badge';
import Tabs from '../Tabs';
import EmptyState from '../EmptyState';
import Pagination from '../Pagination';
import AdSlot from '../AdSlot';
import type { NewsArticle } from '../../types';

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

function getArticleTags(item: NewsArticle): string[] {
  if (Array.isArray(item.tags) && item.tags.length > 0) {
    return item.tags.filter((tag) => typeof tag === 'string' && tag.trim());
  }
  if (typeof item.tag === 'string' && item.tag.trim()) {
    return [item.tag.trim()];
  }
  return [];
}

interface Props {
  items: NewsArticle[];
  categories?: { id: string; name: string; slug: string }[];
  page: number;
  total: number;
  totalPages: number;
  limit: number;
  selectedCategory?: string;
}

export default function NewsBoard({
  items,
  categories = [],
  page,
  total,
  totalPages,
  limit,
  selectedCategory = 'all',
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

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
        tabs.push({ key: c.slug, label: c.name });
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

  const filtered = restArticles;

  const updateQuery = (nextCategory: string, nextPage = 1) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextCategory !== selectedCategory) params.delete('tag');
    if (nextCategory === 'all') params.delete('category');
    else params.set('category', nextCategory);
    if (nextPage <= 1) params.delete('page');
    else params.set('page', String(nextPage));
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const spotlightCategory = featured ? getCategoryName(featured.category) : '';
  const spotlightTags = featured ? getArticleTags(featured) : [];

  return (
    <>
      <header className="mb-8">
        <div className="flex items-center gap-2 text-accent">
          <Newspaper size={18} />
          <span className="text-xs font-medium uppercase tracking-widest text-stext">
            Cricket Newsroom
          </span>
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-mtext">News & Updates</h1>
        <p className="mt-2 max-w-2xl text-sm text-stext">
          Match reports, PSL stories, team roster updates, and tactical analysis from the PAK CRICZONE team.
        </p>
      </header>

      {/* Filters apply to both the spotlight and the story grid. */}
      {categoryTabs.length > 1 && (
        <div className="mb-6 border-y border-lborder py-3">
          <Tabs
            tabs={categoryTabs}
            active={selectedCategory}
            onChange={(category) => updateQuery(category)}
            size="sm"
          />
        </div>
      )}

      {featured && (
        <Link
          href={`/news/${featured.id}`}
          className="group mb-10 block overflow-hidden rounded-md border border-lborder bg-card transition-colors hover:border-accent/60"
        >
          <div className="grid md:grid-cols-[minmax(0,1.45fr)_minmax(280px,1fr)]">
            <div className="relative aspect-[16/10] overflow-hidden md:aspect-auto md:min-h-[360px]">
              {featured.image ? (
                <img
                  src={featured.image}
                  alt={featured.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              ) : (
                <div className="relative flex h-full min-h-[260px] w-full items-center justify-center bg-primary">
                  <Newspaper size={72} className="relative z-10 text-white/20" />
                </div>
              )}
            </div>

            <div className="flex flex-col justify-between p-5 sm:p-7 lg:p-8">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded bg-[var(--color-brand)] px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                    <Flame size={13} />
                    Spotlight
                  </span>
                  {spotlightCategory && (
                    <Badge tone={categoryTone[spotlightCategory] || 'live'}>
                      {spotlightCategory}
                    </Badge>
                  )}
                  {spotlightTags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded border border-lborder bg-secondary px-2 py-1 text-xs font-medium text-stext"
                    >
                      <TagIcon size={10} className="text-accent" />
                      {tag}
                    </span>
                  ))}
                </div>

                <h2 className="mt-5 text-2xl font-semibold leading-tight text-mtext transition-colors group-hover:text-accent sm:text-3xl">
                  {featured.title}
                </h2>

                {featured.excerpt && (
                  <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-stext">
                    {featured.excerpt}
                  </p>
                )}
              </div>

              <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-lborder pt-4 text-xs text-stext">
                <div className="flex flex-wrap items-center gap-3">
                  {featured.author && (
                    <span className="flex items-center gap-1.5 font-medium text-mtext">
                      <User size={14} className="text-accent" />
                      {featured.author}
                    </span>
                  )}
                  {featured.date && (
                    <span className="flex items-center gap-1.5">
                      <Calendar size={12} />
                      {featured.date}
                    </span>
                  )}
                  {featured.readTime && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {featured.readTime}
                    </span>
                  )}
                </div>

                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                  <span>Read Article</span>
                  <ArrowRight size={15} />
                </span>
              </div>
            </div>
          </div>
        </Link>
      )}

      {filtered.length > 0 ? (
        <>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-accent">Latest coverage</p>
              <h2 className="text-lg font-semibold text-mtext">
                {selectedCategory === 'all'
                  ? 'More cricket stories'
                  : categoryTabs.find((tab) => tab.key === selectedCategory)?.label || 'More stories'}
              </h2>
            </div>
            <span className="text-xs text-stext">{total} published</span>
          </div>
          <div className="fade-in grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <ArticleCard key={item.id} item={item} />
          ))}
          </div>
          <AdSlot slot="news-list-below-grid" format="leaderboard" className="mt-8" />
        </>
      ) : !featured ? (
        <EmptyState
          title="No articles found"
          message={
            selectedCategory === 'all'
              ? 'No news articles available at the moment. Check back soon.'
              : `No articles in "${selectedCategory}". Check back soon for new updates.`
          }
        />
      ) : null}
      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        limit={limit}
        onPageChange={(nextPage) => updateQuery(selectedCategory, nextPage)}
      />
    </>
  );
}

function ArticleCard({ item }: { item: NewsArticle }) {
  const catName = getCategoryName(item.category);
  const tags = getArticleTags(item);

  return (
    <Link
      href={`/news/${item.id}`}
      className="group flex flex-col overflow-hidden rounded-md border border-lborder bg-card transition-colors hover:border-accent/50 hover:bg-elevated"
    >
      <div
        className="relative aspect-[16/9] overflow-hidden bg-primary"
      >
        {item.image ? (
          <img
            src={item.image}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Newspaper size={44} className="text-white/20" />
          </div>
        )}
        <div className="absolute bottom-3 left-3 flex max-w-[90%] flex-wrap items-center gap-1.5">
          {catName && (
            <Badge tone={categoryTone[catName] || 'neutral'}>
              {catName}
            </Badge>
          )}
          {tags[0] && tags[0] !== catName && (
            <span className="inline-flex items-center gap-1 rounded bg-primary/90 px-2 py-0.5 text-xs font-medium text-white">
              <TagIcon size={9} className="text-accent" />
              {tags[0]}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-mtext transition-colors group-hover:text-accent">
          {item.title}
        </h3>

        {item.excerpt && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-stext">
            {item.excerpt}
          </p>
        )}

        {tags.length > 1 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="Article tags">
            {tags.slice(1, 3).map((t) => (
              <span
                key={t}
                className="rounded border border-lborder bg-secondary px-2 py-0.5 text-xs font-medium text-stext"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-lborder pt-3 text-xs text-stext">
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

