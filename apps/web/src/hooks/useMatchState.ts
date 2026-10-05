'use client';

import { useMemo } from 'react';
import {
  deriveMatchState,
  type MatchState,
  EMPTY_STATE as EMPTY_MATCH_STATE,
} from '../lib/deriveMatchState';
import { mergeMatchLivePayload, useMatchStream } from './useMatchStream';

// Re-exported so existing importers (libs, tests) keep working untouched.
export { deriveMatchState, type MatchState, EMPTY_MATCH_STATE };

/**
 * Live-updated state for one match.
 *
 * @param matchId  Subscribe to this match's SSE stream. Omit on list surfaces to track
 *                 every live match at once.
 * @param enabled  Pass `false` to leave the socket idle.
 */
export function useMatchState(
  match: Record<string, unknown> | null | undefined,
  matchId?: string | null,
  enabled = true,
  timeline?: Record<string, unknown> | null,
): MatchState {
  const isLive = String(match?.status ?? '').trim().toLowerCase() === 'live';
  const liveUpdate = useMatchStream(matchId ?? undefined, enabled && isLive);
  const merged = useMemo(
    () => (liveUpdate ? mergeMatchLivePayload(match ?? null, liveUpdate as never) : match),
    [match, liveUpdate],
  );
  return useMemo(() => deriveMatchState(merged, timeline), [merged, timeline]);
}
