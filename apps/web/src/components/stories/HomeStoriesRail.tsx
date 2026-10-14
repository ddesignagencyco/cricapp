'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import SectionHeader from '../SectionHeader';
import StoryRailCard from './StoryRailCard';
import StoryViewer from './StoryViewer';
import { useStoriesQuery } from '../../queries/useStoriesQueries';

const RAIL_LIMIT = 12;

const EMPTY: never[] = [];

/**
 * Cric Stories on the homepage.
 *
 * A rail of tall, full-bleed cards on a plain surface card, under the same
 * `SectionHeader` every other homepage section uses.
 *
 * Scrolling is native `overflow-x` with scroll-snap rather than a carousel
 * package: the project already has this exact rail in `MatchTickerBar`, it ships
 * no extra JS, and native touch scrolling, momentum and keyboard access are
 * better than anything a library would re-implement. The rail is fully responsive
 * on its own — the tile width is a viewport clamp, so it lands between two and
 * eight tiles from a 320px phone to a 1920px desktop without a breakpoint count
 * that could overflow the page, and the arrows only appear from `sm` up.
 *
 * Client-fetched like the gallery strip below it: it renders nothing until its
 * query resolves, so splitting it into its own chunk adds no content and only
 * moves when its JS loads.
 */
export default function HomeStoriesRail() {
  const query = useStoriesQuery({ page: 1, limit: RAIL_LIMIT });
  const stories = query.data?.items ?? EMPTY;
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 1);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      observer.disconnect();
    };
  }, [updateScrollState]);

  useEffect(() => {
    updateScrollState();
  }, [stories, updateScrollState]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    // One card plus its gap, so an arrow advances by a whole tile rather than an
    // arbitrary pixel count that lands mid-card.
    const card = el.firstElementChild;
    const amount = card instanceof HTMLElement ? card.offsetWidth + 12 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  const close = useCallback(() => setOpenIndex(null), []);

  if (query.isPending || query.isError || stories.length === 0) return null;

  const overflows = canScrollLeft || canScrollRight;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
      <SectionHeader
        title="Stories"
        subtitle="Your daily dose of cricket"
        to="/stories"
        actionLabel="View all"
      />

      {/* bg-card is white in the light theme and the standard raised surface in
          the dark one, so the rail reads as a card in both. */}
      <div className="rounded-2xl border border-lborder bg-card p-3 sm:p-4">
        <div className="relative">
          {/*
            Fewer stories than the rail is wide would otherwise leave a strip of
            empty card after the last tile, which reads as something broken. So a
            rail that fits is centred, and only a rail that actually scrolls is
            left-aligned — centring a scrollable flex row makes its left end
            unreachable in some browsers.
          */}
          <div
            ref={scrollRef}
            className={`no-scrollbar flex snap-x snap-mandatory items-start gap-2.5 overflow-x-auto scroll-smooth pb-1 sm:gap-3 ${
              overflows ? '' : 'justify-center'
            }`}
          >
            {stories.map((story, index) => (
              <StoryRailCard key={story.id} story={story} onOpen={() => setOpenIndex(index)} />
            ))}
          </div>

          {/* Both directions are always present, as on the match ticker, so the
              rail does not appear to grow a control the moment it is used. The
              one that leads nowhere is disabled and dimmed by
              .carousel-control:disabled rather than removed. */}
          <button
            type="button"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="carousel-control absolute -left-3 top-1/2 z-10 hidden -translate-y-1/2 sm:grid"
            aria-label="Scroll stories left"
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="carousel-control absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 sm:grid"
            aria-label="Scroll stories right"
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {openIndex !== null ? (
        <StoryViewer
          stories={stories}
          index={openIndex}
          onClose={close}
          onIndexChange={setOpenIndex}
        />
      ) : null}
    </section>
  );
}
