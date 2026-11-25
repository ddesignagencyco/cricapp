'use client';

import { useEffect, useMemo, useRef, useState, Fragment } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  Clock,
  Newspaper,
  Flame,
} from 'lucide-react';
import Badge from '../Badge';
import Tabs from '../Tabs';
import EmptyState from '../EmptyState';
import ErrorState from '../ErrorState';
import Pagination from '../Pagination';
import AdSlot from '../advertisements/AdSlot';
import RemoteImage from '../RemoteImage';
import NewsCopy from '../NewsCopy';
import { AuthorByline } from '../PersonAvatar';
import type { NewsArticle } from '../../types';
import { newsHref, newsListPath } from '../../utils/newsConstraints';
import { authorAvatarFromArticle } from '../../services/authors';

const categoryTone: Record<string, string> = {
  Breaking: 'danger',
  'Match Report': 'live',
  'Match News': 'primary',
  PSL: 'primary',
  'PSL News': 'primary',
  'Pakistan Cricket': 'success',
  International: 'info',
  'Team News': 'info',
  Analysis: 'warning',
  Records: 'warning',
  Statistics: 'warning',
  Features: 'accent',
  Editorials: 'accent',
  Interviews: 'info',
  Explainers: 'success',
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

interface Props {
  items: NewsArticle[];
  categories?: { id: string; name: string; slug: string }[];
  page: number;
  total: number;
  totalPages: number;
  limit: number;
  selectedCategory?: string;
  language?: 'en' | 'ur';
  loadError?: boolean;
}

const CORE_CATEGORY_ORDER = [
  'breaking',
  'psl',
  'pakistan-cricket',
  'international',
  'match-news',
  'analysis',
  'features',
  'interviews',
  'records',
  'explainers',
];
const MAX_VISIBLE_CATEGORIES = 7;

export default function NewsBoard({
  items,
  categories = [],
  page,
  total,
  totalPages,
  limit,
  selectedCategory = 'all',
  language = 'en',
  loadError = false,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

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

  // Prioritize core editorial categories so the filter bar stays a crisp single row;
  // any overflow categories live cleanly inside the "More" dropdown.
  const { primaryTabs, overflowTabs } = useMemo(() => {
    const allCats: { key: string; label: string }[] = [];
    const seen = new Set<string>();

    for (const c of categories) {
      if (c && c.name && !seen.has(c.slug.toLowerCase())) {
        seen.add(c.slug.toLowerCase());
        allCats.push({ key: c.slug, label: c.name });
      }
    }

    if (allCats.length === 0) {
      for (const item of safeItems) {
        const cat = getCategoryName(item.category);
        if (cat && !seen.has(cat.toLowerCase())) {
          seen.add(cat.toLowerCase());
          allCats.push({ key: cat, label: cat });
        }
      }
    }

    allCats.sort((a, b) => {
      const ia = CORE_CATEGORY_ORDER.indexOf(a.key.toLowerCase());
      const ib = CORE_CATEGORY_ORDER.indexOf(b.key.toLowerCase());
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.label.localeCompare(b.label);
    });

    const visible = allCats.slice(0, MAX_VISIBLE_CATEGORIES);
    const overflow = allCats.slice(MAX_VISIBLE_CATEGORIES);

    // If the user selected a category from the overflow menu, surface it in the visible row.
    const selectedOverflowIdx = overflow.findIndex((t) => t.key === selectedCategory);
    if (selectedOverflowIdx !== -1) {
      const [picked] = overflow.splice(selectedOverflowIdx, 1);
      visible.push(picked);
    }

    return {
      primaryTabs: [{ key: 'all', label: 'All Stories' }, ...visible],
      overflowTabs: overflow,
    };
  }, [categories, safeItems, selectedCategory]);

  const filtered = restArticles;

  const updateQuery = (nextCategory: string, nextPage = 1) => {
    setMoreOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    if (nextCategory === 'all') params.delete('category');
    else params.set('category', nextCategory);
    if (nextPage <= 1) params.delete('page');
    else params.set('page', String(nextPage));
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const spotlightCategory = featured ? getCategoryName(featured.category) : '';

  const newsListHref = (lang: 'en' | 'ur') =>
    newsListPath(lang, { category: selectedCategory });

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
          Match reports, PSL stories, team roster updates, and tactical analysis from the CriczApp team.
        </p>
      </header>

      <div className="mb-6 flex flex-col gap-3 border-y border-lborder py-3 sm:flex-row sm:items-center sm:justify-between">
        {primaryTabs.length > 1 ? (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Tabs
              tabs={primaryTabs}
              active={selectedCategory}
              onChange={(category) => updateQuery(category)}
              variant="tags"
            />
            {overflowTabs.length > 0 && (
              <div ref={moreRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMoreOpen((o) => !o)}
                  aria-expanded={moreOpen}
                  aria-haspopup="menu"
                  className="inline-flex items-center gap-1 rounded-md border border-lborder bg-card px-2.5 py-1.5 text-xs font-semibold text-stext transition-colors hover:border-accent/40 hover:text-mtext"
                >
                  More ({overflowTabs.length})
                  <ChevronDown size={13} className={`transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
                </button>
                {moreOpen && (
                  <div
                    role="menu"
                    className="elev-overlay absolute left-0 top-full z-30 mt-1.5 max-h-72 w-60 overflow-y-auto rounded-md border border-lborder bg-card p-1.5 shadow-lg"
                  >
                    {overflowTabs.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        role="menuitem"
                        onClick={() => updateQuery(tab.key)}
                        className={`block w-full truncate rounded px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
                          selectedCategory === tab.key
                            ? 'bg-accent/15 font-semibold text-accent'
                            : 'text-mtext hover:bg-[var(--color-row-hover)]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs font-medium uppercase tracking-wider text-stext">Language</p>
        )}
        <div className="inline-flex shrink-0 self-start rounded-md border border-lborder bg-card p-0.5 text-xs font-semibold">
          <Link
            href={newsListHref('en')}
            className={`rounded px-2.5 py-1 ${language === 'en' ? 'btn-brand' : 'text-stext hover:text-mtext'}`}
          >
            EN
          </Link>
          <Link
            href={newsListHref('ur')}
            className={`rounded px-2.5 py-1 ${language === 'ur' ? 'btn-brand' : 'text-stext hover:text-mtext'}`}
          >
            اردو
          </Link>
        </div>
      </div>

      {loadError ? (
        <ErrorState
          title="Server unavailable"
          message="Can't reach the API, so stories aren't listed. Start the backend or try again."
        />
      ) : null}

      {!loadError && featured && (
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
                    <AuthorByline
                      name={featured.author}
                      src={authorAvatarFromArticle(featured)}
                      size={20}
                    />
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

      {!loadError && filtered.length > 0 ? (
        <>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-accent">Latest coverage</p>
              <h2 className="text-lg font-semibold text-mtext">
                {selectedCategory === 'all'
                  ? 'More cricket stories'
                  : [...primaryTabs, ...overflowTabs].find((tab) => tab.key === selectedCategory)?.label || 'More stories'}
              </h2>
            </div>
            <span className="text-xs text-stext">{total} published</span>
          </div>
          <div className="fade-in grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item, index) => (
            <Fragment key={item.id}>
              <ArticleCard item={item} language={language} />
              {filtered.length >= 4 && index === 3 ? (
                <AdSlot placement="news-list-infeed" />
              ) : null}
            </Fragment>
          ))}
          </div>
          {filtered.length >= 8 ? (
            <div className="mt-8">
              <AdSlot placement="news-list-bottom" />
            </div>
          ) : null}
        </>
      ) : !loadError && !featured ? (
        <EmptyState
          title="No news articles found"
          message={
            selectedCategory === 'all'
              ? 'No news articles available at the moment. Check back soon.'
              : `No news articles in "${selectedCategory}". Check back soon for new updates.`
          }
        />
      ) : null}
      {!loadError && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={(nextPage) => updateQuery(selectedCategory, nextPage)}
        />
      )}
    </>
  );
}

function ArticleCard({ item, language }: { item: NewsArticle; language: 'en' | 'ur' }) {
  const catName = getCategoryName(item.category);

  return (
    <Link
      href={newsHref(item)}
      className="news-card card-interactive group flex h-full flex-col overflow-hidden rounded-md"
    >
      <div className="news-card-media relative aspect-[16/9] bg-secondary media-fallback">
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

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-lborder pt-3 text-xs text-stext">
          <AuthorByline name={item.author} src={authorAvatarFromArticle(item)} size={18} />
          <span className="flex shrink-0 items-center gap-1.5">
            <Calendar size={12} className="text-accent" /> {item.date || 'Recent'}
          </span>
        </div>
      </div>
    </Link>
  );
}

