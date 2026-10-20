'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Match } from '../types';
import { useLiveMatchesQuery } from '../queries/useDirectoryQueries';
import { mergeLiveRows, mergeLiveUpdate, useMatchStream } from './useMatchStream';

/**
 * The live matches, keyed by match id, kept current from the shared 30s live-list
 * poll and the socket — through the same reconciler every other live surface uses,
 * so a surface built on this can never show a different (or older) score than the
 * ticker and the match page.
 *
 * For surfaces whose own rows carry no live score (the schedule's stored fixtures).
 * `enabled` keeps the poll and socket off when nothing on screen is live.
 */
export function useLiveMatchMap(enabled = true): Map<string, Match> {
  const query = useLiveMatchesQuery(enabled);
  const update = useMatchStream(undefined, enabled);
  const [rows, setRows] = useState<Match[]>([]);

  useEffect(() => {
    if (query.data) setRows((prev) => mergeLiveRows(prev, query.data));
  }, [query.data]);

  useEffect(() => {
    if (update) setRows((prev) => mergeLiveUpdate(prev, update));
  }, [update]);

  return useMemo(() => new Map(rows.map((row) => [String(row.matchId ?? row.id ?? ''), row])), [rows]);
}
