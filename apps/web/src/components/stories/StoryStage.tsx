'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import Button from '../ui/Button';
import StoryViewer from './StoryViewer';
import type { Story } from '../../services/stories';

interface StoryStageProps {
  /** The whole page of stories, so next/prev has somewhere to go from a cold deep link. */
  items: Story[];
  /** Where this story sits in `items`. */
  initialIndex: number;
}

/**
 * The interactive half of a story's own page.
 *
 * A shared or bookmarked story URL should land the reader *in* the story, not on
 * a poster they have to click again, so the player opens on mount. Closing it
 * reveals the page underneath with a replay control, which keeps the deep link
 * useful for someone who dismissed the overlay on purpose.
 */
export default function StoryStage({ items, initialIndex }: StoryStageProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(initialIndex);
  const [canReplay, setCanReplay] = useState(false);

  if (!items[initialIndex]) return null;

  return (
    <>
      {openIndex !== null ? (
        <StoryViewer
          stories={items}
          index={openIndex}
          onClose={() => {
            setOpenIndex(null);
            setCanReplay(true);
          }}
          onIndexChange={setOpenIndex}
        />
      ) : null}

      {canReplay ? (
        <div className="mt-4">
          <Button
            variant="secondary"
            icon={<Play size={15} aria-hidden="true" />}
            onClick={() => {
              setCanReplay(false);
              setOpenIndex(initialIndex);
            }}
          >
            Replay story
          </Button>
        </div>
      ) : null}
    </>
  );
}
