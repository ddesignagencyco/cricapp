'use client';

import { useCallback, useState } from 'react';
import { Clapperboard } from 'lucide-react';
import EmptyState from '../EmptyState';
import PaginationLinks from '../PaginationLinks';
import StoryCard from './StoryCard';
import StoryViewer from './StoryViewer';
import type { Story } from '../../services/stories';

interface StoriesBoardProps {
  items: Story[];
  page: number;
  totalPages: number;
  /** Set when the server could not reach the API, so the empty state is honest about it. */
  loadError?: boolean;
}

/**
 * The /stories listing.
 *
 * Items arrive from the server so the grid, its titles and its pagination links
 * are all in the HTML for a crawler and for a no-JavaScript reader. The only
 * thing the client adds is opening a story in the story player instead of
 * round-tripping to its page, and the card degrades to a plain link without it.
 */
export default function StoriesBoard({ items, page, totalPages, loadError = false }: StoriesBoardProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const close = useCallback(() => setOpenIndex(null), []);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Clapperboard}
        title={loadError ? 'Stories are unavailable' : 'No stories yet'}
        message={
          loadError
            ? 'We could not reach the media library. Please try again shortly.'
            : 'Short-form clips appear here as soon as they are published to the gallery.'
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((story, index) => (
          <StoryCard
            key={story.id}
            story={story}
            sizes="(min-width: 1280px) 15rem, (min-width: 1024px) 20vw, (min-width: 640px) 30vw, 45vw"
            onOpen={() => setOpenIndex(index)}
          />
        ))}
      </div>

      <PaginationLinks
        page={page}
        totalPages={totalPages}
        label="Stories"
        hrefFor={(target) => (target === 1 ? '/stories' : `/stories?page=${target}`)}
      />

      {openIndex !== null ? (
        <StoryViewer
          stories={items}
          index={openIndex}
          onClose={close}
          onIndexChange={setOpenIndex}
        />
      ) : null}
    </div>
  );
}
