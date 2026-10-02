'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  ClipboardList,
  FileText,
  LayoutDashboard,
  MapPin,
  Radio,
  Scale,
  Swords,
  type LucideIcon,
} from 'lucide-react';

/** A tab that is worth showing. A tab whose feature does not exist is never rendered. */
export type MatchTab = {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Short label used on narrow screens where the full one would overflow. */
  shortLabel?: string;
};

export const MATCH_TABS = {
  overview: { key: 'overview', label: 'Overview', shortLabel: 'Overview', icon: LayoutDashboard },
  scorecard: { key: 'scorecard', label: 'Scorecard', shortLabel: 'Scorecard', icon: ClipboardList },
  commentary: { key: 'commentary', label: 'Commentary', shortLabel: 'Ball-by-ball', icon: Radio },
  squads: { key: 'squads', label: 'Squads', shortLabel: 'Squads', icon: FileText },
  stats: { key: 'stats', label: 'Head to Head', shortLabel: 'H2H', icon: Swords },
  odds: { key: 'odds', label: 'Odds', shortLabel: 'Odds', icon: Scale },
  info: { key: 'info', label: 'Match Info', shortLabel: 'Info', icon: MapPin },
} satisfies Record<string, MatchTab>;

export const ALL_MATCH_TAB_KEYS = Object.keys(MATCH_TABS);

/**
 * Which tab a match opens on.
 *
 * Live matches open on the commentary, because a reader who lands on a live match is
 * there for the next ball. Upcoming and finished matches open on the overview, which
 * is the state summary they are actually looking for.
 */
export function defaultMatchTab(phase: string, available: readonly string[]): string {
  const first = available[0] ?? 'overview';
  if (phase === 'live' && available.includes(MATCH_TABS.commentary.key)) {
    return MATCH_TABS.commentary.key;
  }
  if (available.includes(MATCH_TABS.overview.key)) return MATCH_TABS.overview.key;
  return first;
}

/**
 * The sticky tab bar.
 *
 * ## Keyboard
 *
 * Implements the WAI-ARIA tabs pattern with manual activation: arrow keys move
 * focus, Enter or Space selects. Automatic activation on arrow would swap panels
 * while a keyboard user is still reading the tab list, which on a page this heavy
 * means the content under them changes before they have chosen anything.
 *
 * ## Overflow
 *
 * The bar scrolls horizontally inside its own container. It never widens the page —
 * the list is `min-w-0` inside a grid track that is already `minmax(0, 1fr)`, so a
 * long tab set cannot push the layout wider than the viewport. The selected tab is
 * scrolled into view on change so it stays visible when it is activated from a deep
 * link or the keyboard.
 */
export default function MatchTabNavigation({
  tabs,
  active,
  onChange,
  idPrefix = 'mc',
}: {
  tabs: MatchTab[];
  active: string;
  onChange: (_key: string) => void;
  idPrefix?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  const focusTab = useCallback(
    (index: number) => {
      const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      if (!buttons || buttons.length === 0) return;
      const bounded = (index + buttons.length) % buttons.length;
      buttons[bounded]?.focus();
    },
    [],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          focusTab(index + 1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          focusTab(index - 1);
          break;
        case 'Home':
          event.preventDefault();
          focusTab(0);
          break;
        case 'End':
          event.preventDefault();
          focusTab(tabs.length - 1);
          break;
        default:
          break;
      }
    },
    [focusTab, tabs.length],
  );

  // Keep the active tab visible when it is changed from outside the bar — a deep
  // link, or the "View full scorecard" action in the overview.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [active]);

  if (tabs.length === 0) return null;

  return (
    <div className="mc-tabs-sticky">
      <div className="mc-tabs">
        <div
          ref={listRef}
          role="tablist"
          aria-label="Match sections"
          className="no-scrollbar mc-tabs__list"
        >
          {tabs.map((tab, index) => {
            const selected = active === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                ref={selected ? activeRef : undefined}
                type="button"
                role="tab"
                id={`${idPrefix}-tab-${tab.key}`}
                aria-selected={selected}
                aria-controls={`${idPrefix}-panel-${tab.key}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => onChange(tab.key)}
                onKeyDown={(event) => onKeyDown(event, index)}
                className={`mc-tab tab-pill ${selected ? 'tab-pill--active' : 'tab-pill--idle'}`.trim()}
              >
                <Icon size={15} strokeWidth={2.4} aria-hidden="true" className="shrink-0" />
                <span className="mc-tab__label">{tab.label}</span>
                {tab.shortLabel ? (
                  <span className="mc-tab__short">{tab.shortLabel}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** The panel wrapper, so each tab is announced against the tab that selected it. */
export function MatchTabPanel({
  tabKey,
  active,
  idPrefix = 'mc',
  children,
}: {
  tabKey: string;
  active: string;
  idPrefix?: string;
  children: React.ReactNode;
}) {
  if (active !== tabKey) return null;
  return (
    <div
      role="tabpanel"
      id={`${idPrefix}-panel-${tabKey}`}
      aria-labelledby={`${idPrefix}-tab-${tabKey}`}
      tabIndex={0}
      className="min-w-0 focus-visible:outline-none"
    >
      {children}
    </div>
  );
}
