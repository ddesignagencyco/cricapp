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
  // The socket is not gated on the current status. A page reached mid-match can be
  // server-rendered with any status string (an innings break, a provider variant, a
  // snapshot taken before the match started), and gating on `isLive` meant a live
  // match could sit on a stale snapshot with the subscription switched off. Updates
  // for other matches are discarded by id inside `useMatchStream`, so staying
  // subscribed is safe and is what keeps every surface showing the same score.
  const liveUpdate = useMatchStream(matchId ?? undefined, enabled);
  /**
   * `liveUpdate.data`, never `liveUpdate` itself.
   *
   * This merged the whole socket *envelope* — `{ type, matchId, data, ts }` — so
   * `mergeMatchLivePayload` walked those four keys instead of the snapshot's, and the
   * score fields (`currentInnings`, `displayScore`) it needs were never copied across.
   * The result was a match whose only change was a stray `data` key, i.e. a live score
   * that silently never moved. The list surfaces do not hit this because
   * `mergeLiveUpdate` reads `update.data` itself.
   */
  const merged = useMemo(() => {
    if (!liveUpdate) return match;
    const payload = liveUpdate.data;
    if (!payload || typeof payload !== 'object') return match;
    return mergeMatchLivePayload(match ?? null, payload as Record<string, unknown>);
  }, [match, liveUpdate]);
  return useMemo(() => deriveMatchState(merged, timeline), [merged, timeline]);
}
