'use client';

import { useMemo, Fragment } from 'react';
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
import DummyAd from '../advertisements/DummyAd';
import RemoteImage from '../RemoteImage';
import NewsCopy from '../NewsCopy';
import type { NewsArticle } from '../../types';
import { newsHref } from '../../utils/newsConstraints';

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
  language?: 'en' | 'ur';
}

export default function NewsBoard({
  items,
  categories = [],
  page,
  total,
  totalPages,
  limit,
  selectedCategory = 'all',
  language = 'en',
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const safeItems = useMemo(() => items || [], [items]);

  // Spotlight: Priority to type === 'featured', otherwise the most recent item (first in list)
  const featured = useMemo(() => {
    if (safeItems.length === 0) return null;
    return safeItems[0];
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

  const newsListHref = (lang: 'en' | 'ur') => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    if (lang === 'ur') params.set('lang', 'ur');
    else params.delete('lang');
    const query = params.toString();
    return query ? `/news?${query}` : '/news';
  };

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

      <div className="mb-6 flex flex-col gap-3 border-y border-lborder py-3 sm:flex-row sm:items-start sm:justify-between">
        {categoryTabs.length > 1 ? (
          <Tabs
            tabs={categoryTabs}
            active={selectedCategory}
            onChange={(category) => updateQuery(category)}
            variant="tags"
          />
        ) : (
          <p className="text-xs font-medium uppercase tracking-wider text-stext">Language</p>
        )}
        <div className="inline-flex shrink-0 self-start rounded-md border border-lborder bg-card p-0.5 text-xs font-semibold">
          <Link
            href={newsListHref('en')}
            className={`rounded px-2.5 py-1 ${language === 'en' ? 'bg-accent text-white' : 'text-stext hover:text-mtext'}`}
          >
            EN
          </Link>
          <Link
            href={newsListHref('ur')}
            className={`rounded px-2.5 py-1 ${language === 'ur' ? 'bg-accent text-white' : 'text-stext hover:text-mtext'}`}
          >
            اردو
          </Link>
        </div>
      </div>

      {featured && (
        <Link
          href={newsHref(featured)}
          className="group mb-10 block overflow-hidden rounded-md border border-lborder bg-card transition-colors hover:border-border-strong"
        >
          <div className="grid md:grid-cols-[minmax(0,1.45fr)_minmax(280px,1fr)]">
            <div className="bg-secondary">
              {featured.image ? (
                <RemoteImage
                  src={featured.image}
                  alt={featured.title}
                  width={1600}
                  height={900}
                  sizes="(min-width: 768px) 55vw, 100vw"
                  fit="contain"
                  className="news-image h-auto w-full"
                />
              ) : (
                <div className="relative flex h-full min-h-[260px] w-full items-center justify-center media-fallback">
                  <Newspaper size={72} className="relative z-10 text-stext/40" />
                </div>
              )}
            </div>

            <div className="flex flex-col justify-between p-5 sm:p-7 lg:p-8">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded bg-[var(--color-brand)] px-2.5 py-1 text-xs font-semibold tracking-wide text-white">
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

                <NewsCopy
                  as="h2"
                  language={featured.language as string | undefined || language}
                  text={featured.title}
                  className="mt-5 text-2xl font-semibold leading-tight text-mtext transition-colors group-hover:text-accent sm:text-3xl"
                >
                  {featured.title}
                </NewsCopy>

                {featured.excerpt && (
                  <NewsCopy
                    language={featured.language as string | undefined || language}
                    text={featured.excerpt}
                    className="mt-3 line-clamp-4 text-sm leading-relaxed text-stext"
                  >
                    {featured.excerpt}
                  </NewsCopy>
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
          {filtered.map((item, index) => (
            <Fragment key={item.id}>
              <ArticleCard item={item} language={language} />
              {filtered.length >= 4 && index === 3 ? (
                <DummyAd size="large-rectangle" placement="news-list-infeed" inFeed />
              ) : null}
            </Fragment>
          ))}
          </div>
          {filtered.length >= 8 ? (
            <div className="mt-8">
              <DummyAd size="leaderboard" placement="news-list-bottom" />
            </div>
          ) : null}
        </>
      ) : !featured ? (
        <EmptyState
          title="No news articles found"
          message={
            selectedCategory === 'all'
              ? 'No news articles available at the moment. Check back soon.'
              : `No news articles in "${selectedCategory}". Check back soon for new updates.`
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

function ArticleCard({ item, language }: { item: NewsArticle; language: 'en' | 'ur' }) {
  const catName = getCategoryName(item.category);
  const tags = getArticleTags(item);

  return (
    <Link
      href={newsHref(item)}
      className="group flex h-full flex-col overflow-hidden rounded-md border border-lborder bg-card transition-colors hover:border-border-strong hover:bg-elevated"
    >
      <div
        className="relative aspect-[16/9] overflow-hidden bg-secondary media-fallback"
      >
        {item.image ? (
          <RemoteImage
            src={item.image}
            alt={item.title}
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            fit="contain"
            className="news-image"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Newspaper size={44} className="text-stext/40" />
          </div>
        )}
        <div className="absolute bottom-3 left-3 flex max-w-[90%] flex-wrap items-center gap-1.5">
          {catName && (
            <Badge tone={categoryTone[catName] || 'neutral'}>
              {catName}
            </Badge>
          )}
          {tags[0] && tags[0] !== catName && (
            <span className="inline-flex items-center gap-1 rounded bg-elevated px-2 py-0.5 text-xs font-medium text-stext ring-1 ring-lborder">
              <TagIcon size={9} className="text-accent" />
              {tags[0]}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <NewsCopy
          as="h3"
          language={(item.language as string | undefined) || language}
          text={item.title}
          className="line-clamp-2 text-base font-semibold leading-snug text-mtext transition-colors group-hover:text-accent"
        >
          {item.title}
        </NewsCopy>

        {item.excerpt && (
          <NewsCopy
            language={(item.language as string | undefined) || language}
            text={item.excerpt}
            className="mt-2 line-clamp-2 text-sm leading-relaxed text-stext"
          >
            {item.excerpt}
          </NewsCopy>
        )}

        {tags.length > 1 && (
          <div className="mt-3 mb-3 flex flex-wrap items-center gap-2" aria-label="Article tags">
            {tags.slice(1, 3).map((t) => (
              <span
                key={t}
                className="rounded border border-lborder bg-secondary px-2.5 py-1 text-xs font-medium text-stext"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-lborder pt-3 text-xs text-stext">
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

