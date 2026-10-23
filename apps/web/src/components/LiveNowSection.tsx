'use client';

import { useEffect, useRef, useState } from 'react';
import type { Match } from '../types';
import { mergeLiveRows, mergeLiveUpdate, useMatchStream, withLatestLive } from '../hooks/useMatchStream';
import { useLiveMatchesQuery } from '../queries/useDirectoryQueries';
import MatchCard from './MatchCard';
import SectionHeader from './SectionHeader';

/**
 * The homepage "Live Now" strip.
 *
 * Two things keep this row honest, because the server render alone cannot:
 *
 * 1. **A polling fallback.** `matches` arrives from the server component, where
 *    `fetchLiveMatches()` sits behind a 60s `revalidate`. The socket is the fast path,
 *    but when it is unavailable the card used to sit on that snapshot indefinitely —
 *    and refreshing re-served the same cached snapshot, which is why the card looked
 *    frozen *and* appeared to go backwards. `useLiveMatchesQuery` polls on the shared
 *    `LIVE_MATCH_REFETCH_MS`, the same cadence the match page and the live list use.
 *
 * 2. **A server snapshot may never walk the score backwards.** Incoming props are
 *    merged into the rows already on screen instead of replacing them, so a stale ISR
 *    payload cannot undo newer socket state.
 */
export default function LiveNowSection({ matches }: { matches: Match[] }) {
  // Seeded from the newest score this tab has seen, not just the (cached) server render.
  const [list, setList] = useState<Match[]>(() => matches.map(withLatestLive));
  const liveUpdate = useMatchStream(undefined, true);
  const liveQuery = useLiveMatchesQuery();
  // Keeps `applyRows` stable so the effects below do not re-run on every render.
  // Rows go through the same reconciler as socket frames, so an older snapshot is
  // ignored per row rather than overwriting it, and newly started matches appear.
  const applyRows = useRef((rows: Match[] | undefined) => {
    if (!rows?.length) return;
    setList((prev) => mergeLiveRows(prev, rows));
  }).current;

  // The server render seeds the list; later snapshots top it up rather than replace it.
  useEffect(() => {
    applyRows(matches);
  }, [matches, applyRows]);

  useEffect(() => {
    if (liveQuery.data?.length) applyRows(liveQuery.data);
  }, [liveQuery.data, applyRows]);

  useEffect(() => {
    if (!liveUpdate) return;
    setList((prev) => mergeLiveUpdate(prev, liveUpdate));
  }, [liveUpdate]);

  const live = list.filter((match) => match.status === 'live');
  if (live.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
      <SectionHeader
        title="Live Now"
        subtitle={`${live.length} match${live.length === 1 ? '' : 'es'} in progress`}
        icon="zap"
        to="/matches?tab=live"
        actionLabel="All live"
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {live.slice(0, 3).map((m) => (
          <MatchCard key={m.matchId || m.id} match={m} />
        ))}
      </div>
    </section>
  );
}