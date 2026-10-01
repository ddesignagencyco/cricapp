'use client';

import Link from 'next/link';
import { ArrowRight, CalendarRange } from 'lucide-react';
import { formatShortDate } from './matchFormat';
import type { Match } from '../../../types';
import type { MatchViewModel } from '../../../lib/matchViewModel';

/**
 * Where this fixture sits in its competition.
 *
 * Built from the **same cached series list** as the "Other Matches" rail, so the
 * previous and next fixtures cost nothing extra — they are already in the payload
 * that request returned. Ordering is by `scheduled`, which is the order the API sorts
 * the list in, and the current fixture is located by id rather than by position so a
 * match that appears in an unexpected place cannot shift the neighbours.
 */
export default function SeriesSnapshot({
  matches,
  view,
  seriesHref,
  loading,
}: {
  matches: Match[];
  view: MatchViewModel;
  seriesHref: string | null;
  loading?: boolean;
}) {
  const fixtures = [...matches]
    .filter((match) => String(match.matchId ?? match.id ?? '') !== view.matchId)
    .sort((a, b) => String(a.scheduled ?? '').localeCompare(String(b.scheduled ?? '')));

  const currentIndex = matches.findIndex(
    (match) => String(match.matchId ?? match.id ?? '') === view.matchId,
  );

  // The current fixture's own position, by scheduled date rather than list index:
  // the list is date-sorted already, but a match fetched from elsewhere may not be in
  // it at all, in which case its neighbours are simply the nearest by date.
  const currentTime = Date.parse(view.scheduled ?? '') || Number.POSITIVE_INFINITY;
  const previous = [...matches]
    .filter((match) => {
      const time = Date.parse(String(match.scheduled ?? ''));
      return Number.isFinite(time) && time < currentTime;
    })
    .sort((a, b) => Date.parse(String(b.scheduled ?? '')) - Date.parse(String(a.scheduled ?? '')))[0];
  const next = [...matches]
    .filter((match) => {
      const time = Date.parse(String(match.scheduled ?? ''));
      return Number.isFinite(time) && time > currentTime;
    })
    .sort((a, b) => Date.parse(String(a.scheduled ?? '')) - Date.parse(String(b.scheduled ?? '')))[0];

  if (!view.tournament && fixtures.length === 0) return null;

  return (
    <section className="mc-rail">
      <header className="mc-rail__head">
        <h2 className="mc-rail__title">
          <CalendarRange size={14} strokeWidth={2.4} aria-hidden="true" className="text-accent" />
          Series at a Glance
        </h2>
        {seriesHref ? (
          <Link href={seriesHref} prefetch={false} className="mc-rail__action">
            View all
          </Link>
        ) : null}
      </header>

      {view.seasonName || view.tournament ? (
        <p className="px-3 pb-2 text-[11px] font-semibold text-mtext">
          {view.seasonName ?? view.tournament}
        </p>
      ) : null}

      {loading ? (
        <ul className="space-y-1.5 px-3 pb-3" aria-busy="true">
          {[0, 1].map((i) => (
            <li key={i} className="h-9 rounded bg-[var(--color-skeleton)]" />
          ))}
        </ul>
      ) : (
        <ul className="px-1 pb-1">
          {previous ? <FixtureRow label="Previous" match={previous} /> : null}
          <li className="mc-series-row mc-series-row--current">
            <span className="mc-series-row__label">This match</span>
            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-mtext">
              {view.home.code} vs {view.away.code}
            </span>
            <span className="shrink-0 tabular-nums text-[11px] text-stext">
              {formatShortDate(view.scheduled)}
            </span>
          </li>
          {next ? <FixtureRow label="Next" match={next} /> : null}
          {!previous && !next && currentIndex === -1 && fixtures.length === 0 ? (
            <li className="px-3 py-3 text-xs text-stext">
              No other fixtures in this competition are listed yet.
            </li>
          ) : null}
        </ul>
      )}

      {seriesHref ? (
        <Link href={seriesHref} prefetch={false} className="mc-rail__footer">
          View full series
          <ArrowRight size={13} strokeWidth={2.6} aria-hidden="true" />
        </Link>
      ) : null}
    </section>
  );
}

function FixtureRow({ label, match }: { label: string; match: Match }) {
  const id = String(match.matchId ?? match.id ?? '');
  const teams = Array.isArray(match.teamNames)
    ? match.teamNames.filter(Boolean).join(' vs ')
    : Array.isArray(match.teams)
      ? match.teams.filter(Boolean).join(' vs ')
      : '';
  return (
    <li>
      <Link
        href={`/matches/${encodeURIComponent(id)}`}
        prefetch={false}
        className="mc-series-row group"
      >
        <span className="mc-series-row__label">{label}</span>
        <span className="min-w-0 flex-1 truncate text-xs text-mtext">{teams || 'Fixture'}</span>
        <span className="shrink-0 tabular-nums text-[11px] text-stext">
          {formatShortDate(match.scheduled)}
        </span>
      </Link>
    </li>
  );
}
