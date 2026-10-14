'use client';

import { useEffect, useRef, useState } from 'react';
import type { Match } from '../types';
import { mergeLiveUpdate, useMatchStream } from '../hooks/useMatchStream';
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
  const [list, setList] = useState<Match[]>(matches);
  const liveUpdate = useMatchStream(undefined, true);
  const liveQuery = useLiveMatchesQuery();
  // Keeps `applyRows` stable so the effects below do not re-run on every render.
  const applyRows = useRef((rows: Match[] | undefined) => {
    if (!rows?.length) return;
    setList((prev) => {
      if (!prev.length) return rows;
      const byId = new Map(rows.map((row) => [String(row.matchId ?? row.id ?? ''), row]));
      let touched = false;
      const next = prev.map((row) => {
        const incoming = byId.get(String(row.matchId ?? row.id ?? ''));
        if (!incoming) return row;
        if (
          JSON.stringify(incoming.currentInnings ?? null) ===
          JSON.stringify(row.currentInnings ?? null)
        ) {
          return row;
        }
        touched = true;
        return { ...row, ...incoming };
      });
      return touched ? next : prev;
    });
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