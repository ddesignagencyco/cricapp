'use client';

/**
 * Queries for one match centre.
 *
 * Three rules shape this file:
 *
 * 1. **Every key carries the match id.** A key scoped only by query type would let
 *    one match's timeline, odds or news be served on another match's page. All of
 *    them nest under `['matches', 'detail', matchId, …]`.
 * 2. **The server render is seeded, not refetched.** `page.tsx` already fetched the
 *    match and its timeline, so both queries start with that data and stay fresh for
 *    the configured stale time. The match centre therefore costs one request per
 *    endpoint for the whole visit, and tab changes refetch nothing.
 * 3. **Nothing is fetched until it is needed.** The timeline is only requested by the
 *    panels that read it, head-to-head only when the tab is opened, and the series
 *    fixture list only when the sidebar has room for it.
 */

import { useQuery } from '@tanstack/react-query';
import { fetchHeadToHead } from '../services/headToHead';
import { fetchMatchById, fetchMatchTimeline, fetchMatches, type MatchesListParams } from '../services/matches';
import { fetchMatchOdds } from '../services/odds';
import { fetchNews } from '../services/news';
import { matchKeys } from './keys';
import { runAbortable } from './queryUtils';
import type { HeadToHead, Match, NewsArticle } from '../types';
import type { MatchOddsFetchResult, MatchOddsResponse } from '../types/odds';
import type { MatchTimeline } from '../services/matches';

/**
 * How often a live match page re-checks its own score.
 *
 * The socket delivers updates within about a second, so this is only a backstop
 * for when it is unavailable — slow enough to be negligible, fast enough that a
 * frozen header corrects itself well before a reader would notice.
 */
export const LIVE_MATCH_REFETCH_MS = 30_000;

/** The match row itself. */
export function useMatchDetailQuery(
  matchId: string,
  initialMatch?: Match | null,
  options: { enabled?: boolean; live?: boolean } = {},
) {
  const enabled = (options.enabled ?? true) && Boolean(matchId);
  return useQuery<Match | null, Error>({
    queryKey: matchKeys.detail(matchId),
    queryFn: ({ signal }) => runAbortable(signal, (requestSignal) => fetchMatchById(matchId, requestSignal)),
    // Seeded from the server render. `initialData` (not `placeholderData`) so the
    // value is not re-fetched on mount, and a null seed still counts as "resolved"
    // so a genuine 404 is not retried on every render.
    initialData: initialMatch ?? undefined,
    enabled,
    /**
     * Safety net for the live score.
     *
     * The socket is the primary, instant path, but it is not the only thing keeping
     * this page honest: a socket that is blocked, still connecting, or dropped left the
     * header frozen on its server snapshot indefinitely, because `initialData` plus a
     * non-zero stale time means the query never revalidates on its own. That made the
     * same match show a different score here than on the live list until a manual
     * refresh. While the match is live, poll slowly so the page self-heals.
     *
     * `refetchIntervalInBackground` stays off so a backgrounded tab is not polled.
     */
    refetchInterval: options.live ? LIVE_MATCH_REFETCH_MS : false,
    refetchIntervalInBackground: false,
  });
}

/**
 * The ball-by-ball timeline.
 *
 * Not seeded, because the server render passes the raw payload separately to avoid
 * deserialising 1,600 events twice. It is fetched on demand by the panels that read
 * it and then cached for the rest of the visit, so switching tabs is free.
 *
 * `live` does **not** enable the query — it must never start the 1.6 MB download by
 * itself. It only makes an already-fetched timeline refetch on the live cadence, so
 * the commentary and the header (which reconciles against this same payload) cannot
 * drift apart while a match is running.
 */
export function useMatchTimelineQuery(
  matchId: string,
  options: { enabled?: boolean; live?: boolean } = {},
) {
  const enabled = (options.enabled ?? true) && Boolean(matchId);
  return useQuery<MatchTimeline | null, Error>({
    queryKey: matchKeys.timeline(matchId),
    queryFn: ({ signal }) =>
      runAbortable(signal, (requestSignal) => fetchMatchTimeline(matchId, requestSignal)),
    enabled,
    // A 404 means the provider has no timeline for this fixture. That is an answer,
    // not a failure, so it is cached and the empty state renders immediately.
    retry: false,
    refetchInterval: (query) => {
      // `query.state.data` is the gate: polling only ever re-reads a timeline that has
      // already been fetched, so an unopened Commentary tab still costs nothing.
      if (!options.live || query.state.data === null || query.state.data === undefined) return false;
      return LIVE_MATCH_REFETCH_MS;
    },
    refetchIntervalInBackground: false,
  });
}

/** Head-to-head between the two sides, when the API can name them by id. */
export function useMatchHeadToHeadQuery(
  matchId: string,
  teamAId: string,
  teamBId: string,
  options: { enabled?: boolean } = {},
) {
  const enabled = (options.enabled ?? true) && Boolean(matchId && teamAId && teamBId);
  return useQuery<HeadToHead | null, Error>({
    queryKey: matchKeys.headToHead(matchId, teamAId, teamBId),
    queryFn: ({ signal }) =>
      runAbortable(signal, async (requestSignal) => {
        try {
          return await fetchHeadToHead(teamAId, teamBId, requestSignal);
        } catch {
          return null;
        }
      }),
    enabled,
    retry: false,
  });
}

/**
 * Odds for the match.
 *
 * The route answers 403 when odds are disabled for the region and 404 when the match
 * has no stored snapshot. Both are answers the Odds tab renders as its own empty
 * state, so neither is retried or shown as a server error.
 */
export function useMatchOddsQuery(
  matchId: string,
  initialOdds?: MatchOddsResponse | null,
  initialOddsForbidden?: boolean,
  options: { enabled?: boolean } = {},
) {
  const enabled = (options.enabled ?? true) && Boolean(matchId);
  return useQuery<MatchOddsFetchResult, Error>({
    queryKey: matchKeys.odds(matchId),
    queryFn: ({ signal }) =>
      runAbortable(signal, (requestSignal) =>
        fetchMatchOdds(matchId, { signal: requestSignal }).catch(
          () => ({ status: 'not_found' }) as MatchOddsFetchResult,
        ),
      ),
    // Seeded from the server render, which already resolved the status, so the
    // client does not repeat the request the server just made.
    initialData:
      initialOdds || initialOddsForbidden
        ? initialOddsForbidden
          ? ({ status: 'forbidden' } as MatchOddsFetchResult)
          : ({ status: 'ok', data: initialOdds } as MatchOddsFetchResult)
        : undefined,
    enabled,
    retry: false,
  });
}

/** News linked to this match. */
export function useMatchNewsQuery(
  matchId: string,
  options: { enabled?: boolean; limit?: number } = {},
) {
  const limit = options.limit ?? 12;
  const enabled = (options.enabled ?? true) && Boolean(matchId);
  return useQuery<NewsArticle[], Error>({
    queryKey: [...matchKeys.news(matchId), { limit }],
    queryFn: ({ signal }) =>
      runAbortable(signal, (requestSignal) =>
        fetchNews({ matchId, limit }, requestSignal).catch(() => [] as NewsArticle[]),
      ),
    enabled,
    retry: false,
  });
}

/**
 * Other fixtures in the same competition, for the sidebar.
 *
 * One cached list request serves the whole "Other Matches" rail. No card in it ever
 * issues its own detail request, which is what used to turn a sidebar of six matches
 * into six extra round trips.
 *
 * Takes the competition's id when there is one and falls back to its name. The id is the
 * exact filter; the name is a substring match on the API's side, so "Global T20 Canada"
 * also matches "Global T20 Canada 2024" and the rail fills with another competition's
 * fixtures. A match whose `tournament_id` has not been written yet — which is every row
 * stored before that column existed — still works, just on the name.
 */
export function useSeriesMatchesQuery(
  tournament: { id?: string | null; name?: string | null } | string | null,
  options: { enabled?: boolean; limit?: number } = {},
) {
  const limit = options.limit ?? 24;
  const id = typeof tournament === 'string' ? null : (tournament?.id ?? null);
  const name = typeof tournament === 'string' ? tournament : (tournament?.name ?? null);
  const filter = id ? { tournamentId: id } : name ? { tournament: name } : null;
  const enabled = (options.enabled ?? true) && filter !== null;
  return useQuery<Match[], Error>({
    queryKey: matchKeys.list({ ...filter, limit }),
    queryFn: ({ signal }) =>
      runAbortable(signal, (requestSignal) =>
        fetchMatches({ ...filter, limit } as MatchesListParams, requestSignal).catch(
          () => [] as Match[],
        ),
      ),
    enabled,
    retry: false,
  });
}
