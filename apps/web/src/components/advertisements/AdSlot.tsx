'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import HouseAd from './HouseAd';
import { useAdConfig } from './AdProvider';
import { resolveDummyAdCreative } from '../../lib/advertisements/placements';
import {
  adPlacement,
  adPlacementSize,
  resolveAdSlotId,
  shouldRenderAd,
  type AdSize,
} from '../../lib/advertisements/registry';

export type AdSlotProps = {
  /** Registry key. Must be one of `AD_PLACEMENTS`. */
  placement: string;
  /** Defaults to the placement's registered size. */
  size?: AdSize;
  className?: string;
  /** Defaults to the placement's registered `inFeed`. */
  inFeed?: boolean;
};

/**
 * How long a slot waits for AdSense to report a status before collapsing itself.
 *
 * An ad blocker stops `adsbygoogle.js` from ever running, so `data-ad-status` never
 * appears and the reserved box would otherwise sit there empty.
 */
export const AD_BLOCK_GRACE_MS = 2500;

/** Anything that can absorb a queued ad request. */
type Pushable = { push: (_options: object) => void };

/** Marks an `<ins>` that has already had a request queued for it. */
const QUEUED_ATTR = 'data-ad-queued';

/**
 * Queues exactly one ad request for `el`, and only when there is genuinely somewhere
 * for the tag to put the result.
 *
 * Three things make this easy to get wrong, and all three happen in practice:
 *
 * 1. **The global is not a shape we can assume.** Before the tag loads, Google's own
 *    snippet makes it an *array* it drains on load; after the tag loads, the tag
 *    replaces it with an *object* exposing `push`; an *ad blocker* may leave anything
 *    at all in its place, including an object with no `push`. Calling one blindly
 *    throws `w.adsbygoogle.push is not a function` and takes the page down.
 *
 * 2. **A push can be rejected.** The tag answers
 *    `All 'ins' elements in the DOM with class=adsbygoogle already have ads in them`
 *    when there is no unfilled `<ins>` left to receive it. That is not fatal — it
 *    means a request went nowhere because the slot was already served or because the
 *    same ad unit cannot be placed twice on one page. It must not break the page.
 *
 * 3. **More requests than slots get issued** because `reactStrictMode` double-invokes
 *    effects in dev, and because several placements on one page deliberately share a
 *    single size default.
 *
 * So the `<ins>` is marked once queued, a request is only issued while an unfilled,
 * unqueued `<ins>` still exists, and the tag's own rejection is swallowed.
 */
function queueAdRequest(el: HTMLElement): void {
  // StrictMode re-runs this effect against the same DOM node.
  if (el.hasAttribute(QUEUED_ATTR)) return;

  const waiting = document.querySelectorAll(
    `ins.adsbygoogle:not([${QUEUED_ATTR}]):not([data-ad-status])`,
  );
  if (waiting.length === 0) return;

  el.setAttribute(QUEUED_ATTR, '');

  const w = window as unknown as { adsbygoogle?: unknown };
  const existing = w.adsbygoogle as Partial<Pushable> | undefined;

  try {
    if (existing && typeof existing.push === 'function') {
      (existing as Pushable).push({});
      return;
    }
    w.adsbygoogle = [{}] as unknown;
  } catch {
    // The tag rejected the request. The slot simply stays empty and is collapsed by
    // the ad-block grace period, which is the correct outcome — a lost ad request is
    // never worth taking the page down for.
  }
}

function AdSenseUnit({
  placement,
  slotId,
  size,
  className,
  inFeed,
}: {
  placement: string;
  slotId: string;
  size: AdSize;
  className: string;
  inFeed: boolean;
}) {
  const insRef = useRef<HTMLModElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const el = insRef.current;
    if (!el) return;
    // One request per mounted slot, never re-issued on re-render.
    queueAdRequest(el);
  }, []);

  useEffect(() => {
    const el = insRef.current;
    if (!el) return;

    // AdSense sets `data-ad-status` to `filled` or `unfilled` once it has decided.
    const settle = () => {
      const status = el.getAttribute('data-ad-status');
      if (status) setCollapsed(status !== 'filled');
    };
    settle();

    const timer = window.setTimeout(() => {
      if (!el.getAttribute('data-ad-status')) setCollapsed(true);
    }, AD_BLOCK_GRACE_MS);

    const observer = typeof MutationObserver === 'undefined' ? null : new MutationObserver(settle);
    observer?.observe(el, { attributes: true, attributeFilter: ['data-ad-status'] });

    return () => {
      window.clearTimeout(timer);
      observer?.disconnect();
    };
  }, []);

  if (collapsed) return null;

  // Only used for the box model, so the reserved space matches `house` mode.
  const creative = resolveDummyAdCreative(size, placement, size === 'leaderboard' ? 'desktop' : undefined);
  const isLeaderboard = size === 'leaderboard';
  const hideOnMobile = size === 'half-page';

  const ins = (
    <ins
      ref={insRef}
      className={isLeaderboard ? 'adsbygoogle adsbygoogle-leaderboard' : 'adsbygoogle'}
      data-ad-slot={slotId}
      {...(isLeaderboard ? { 'data-ad-format': 'auto', 'data-full-width-responsive': 'true' } : {})}
      style={
        isLeaderboard
          ? { display: 'block' }
          : { display: 'inline-block', width: creative.width, height: creative.height }
      }
    />
  );

  if (inFeed) {
    return (
      <aside
        data-ad-placement={placement}
        aria-label="Advertisement"
        className={`relative flex h-full min-h-[148px] flex-col overflow-hidden rounded-md border border-lborder ${className}`.trim()}
      >
        <div className="relative min-h-0 flex-1">{ins}</div>
      </aside>
    );
  }

  return (
    <aside
      data-ad-placement={placement}
      aria-label="Advertisement"
      className={`relative mx-auto flex w-full min-w-0 max-w-full flex-col ${hideOnMobile ? 'hidden lg:flex' : ''} ${className}`.trim()}
      style={isLeaderboard ? undefined : { maxWidth: creative.width }}
    >
      {ins}
    </aside>
  );
}

/**
 * The mode-aware slot. Replaces the old `DummyAd` at every call site so the three
 * gates — mode, route, placement — are applied in one place rather than at ~26
 * places where one could be forgotten:
 *
 *   `off`      render nothing
 *   `house`    render the placeholder creative
 *   `adsense`  render a real unit, or nothing when no slot id resolves
 *
 * Note there is deliberately no site badge in `adsense` mode: AdSense renders its
 * own "Ad" label above the creative, so ours would duplicate it.
 */
export default function AdSlot({ placement, size, className = '', inFeed }: AdSlotProps) {
  const config = useAdConfig();
  const pathname = usePathname() ?? '/';

  const registered = adPlacement(placement);
  const resolvedSize = size ?? registered?.size ?? adPlacementSize(placement);
  const resolvedInFeed = inFeed ?? registered?.inFeed ?? false;

  if (!shouldRenderAd(config, placement, pathname)) return null;

  if (config.mode === 'house') {
    return <HouseAd size={resolvedSize} placement={placement} className={className} inFeed={resolvedInFeed} />;
  }

  // `shouldRenderAd` already guarantees a non-null slot id in adsense mode.
  const slotId = resolveAdSlotId(placement, resolvedSize, config);
  if (!slotId) return null;

  return (
    <AdSenseUnit
      placement={placement}
      slotId={slotId}
      size={resolvedSize}
      className={className}
      inFeed={resolvedInFeed}
    />
  );
}