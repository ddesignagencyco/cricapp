'use client';

import AdSlot from './AdSlot';

export type AdInArticleProps = {
  placement?: string;
  /** Explicit AdSense ad-unit id for a dedicated in-article unit. */
  slot?: string | null;
  className?: string;
};

/**
 * In-article fluid advertisement (requirements §9).
 *
 * Uses the `fluid` format so the creative flows with the article width instead
 * of forcing a fixed 336px box on narrow phones. Render at most once per
 * article, after several paragraphs — never after every paragraph and never
 * adjacent to interactive controls (favorite/share buttons).
 */
export default function AdInArticle({ placement = 'news-detail-inarticle', slot, className = '' }: AdInArticleProps) {
  return (
    <div className={`my-8 flex w-full min-w-0 max-w-full justify-center overflow-hidden ${className}`.trim()}>
      <AdSlot placement={placement} slot={slot} format="fluid" className="w-full" />
    </div>
  );
}
