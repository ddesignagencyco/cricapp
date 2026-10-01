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

/** The match row itself. */
export function useMatchDetailQuery(
  matchId: string,
  initialMatch?: Match | null,
  options: { enabled?: boolean } = {},
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
  });
}

/**
 * The ball-by-ball timeline.
 *
 * Not seeded, because the server render passes the raw payload separately to avoid
 * deserialising 1,600 events twice. It is fetched on demand by the panels that read
 * it and then cached for the rest of the visit, so switching tabs is free.
 */
export function useMatchTimelineQuery(matchId: string, options: { enabled?: boolean } = {}) {
  const enabled = (options.enabled ?? true) && Boolean(matchId);
  return useQuery<MatchTimeline | null, Error>({
    queryKey: matchKeys.timeline(matchId),
    queryFn: ({ signal }) =>
      runAbortable(signal, (requestSignal) => fetchMatchTimeline(matchId, requestSignal)),
    enabled,
    // A 404 means the provider has no timeline for this fixture. That is an answer,
    // not a failure, so it is cached and the empty state renders immediately.
    retry: false,
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
 */
export function useSeriesMatchesQuery(
  tournament: string | null,
  options: { enabled?: boolean; limit?: number } = {},
) {
  const limit = options.limit ?? 24;
  const enabled = (options.enabled ?? true) && Boolean(tournament);
  return useQuery<Match[], Error>({
    queryKey: matchKeys.list({ tournament: tournament ?? undefined, limit }),
    queryFn: ({ signal }) =>
      runAbortable(signal, (requestSignal) =>
        fetchMatches(
          { tournament: tournament ?? undefined, limit } as MatchesListParams,
          requestSignal,
        ).catch(() => [] as Match[]),
      ),
    enabled,
    retry: false,
  });
}
