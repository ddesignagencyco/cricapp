import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { fetchPlayersPage, type PlayersListParams, type PlayersPageResult } from '../services/players';
import { fetchTeamsPage, type TeamsListParams, type TeamPageResult } from '../services/teams';
import { fetchToursPage, type ToursListParams, type ToursPageResult } from '../services/tours';
import { fetchTournamentsPage, type TournamentsListParams, type TournamentPageResult } from '../services/tournaments';
import { fetchLiveMatches, fetchMatchById, fetchMatchesPage, type MatchesListParams, type MatchesPageResult } from '../services/matches';
import { fetchSiteSettings, type SiteSettings } from '../services/siteSettings';
import { fetchGalleryPage, type GalleryListParams, type GalleryPageResult } from '../services/gallery';
import {
  normalizeParams,
  playerKeys,
  teamKeys,
  tourKeys,
  tournamentKeys,
  matchKeys,
  galleryKeys,
  siteSettingsKeys,
  type GalleryQueryParams,
  type MatchesQueryParams,
  type PlayersQueryParams,
  type TeamsQueryParams,
  type ToursQueryParams,
  type TournamentsQueryParams,
} from './keys';
import { QUERY_STALE_TIME } from './constants';
import { LIVE_MATCH_REFETCH_MS } from './useMatchCentreQueries';
import { runAbortable } from './queryUtils';
import type { Match } from '../types/index';

function sameListContext(currentParams: Record<string, unknown>, previousQuery: any): boolean {
  const previousParams = previousQuery?.queryKey?.[2];
  if (!previousParams || typeof previousParams !== 'object') return false;
  const currentComparable = normalizeParams({ ...currentParams, page: undefined });
  const previousComparable = normalizeParams({ ...(previousParams as Record<string, unknown>), page: undefined });
  return JSON.stringify(currentComparable) === JSON.stringify(previousComparable);
}

function keepPreviousListData<T>(currentParams: Record<string, unknown>) {
  return (previousData: T | undefined, previousQuery: any): T | undefined => {
    if (!sameListContext(currentParams, previousQuery)) return undefined;
    return keepPreviousData(previousData);
  };
}

function asListParams<T>(params: Record<string, unknown>): T {
  return params as T;
}

export function usePlayersQuery(params: PlayersQueryParams) {
  const normalized = normalizeParams(params as Record<string, unknown>);
  return useQuery<PlayersPageResult, Error>({
    queryKey: playerKeys.list(normalized),
    queryFn: ({ signal }) => runAbortable(signal, (requestSignal) => fetchPlayersPage(asListParams<PlayersListParams>(normalized), requestSignal)),
    placeholderData: keepPreviousListData<PlayersPageResult>(normalized),
  });
}

export function useTeamsQuery(params: TeamsQueryParams) {
  const normalized = normalizeParams(params as Record<string, unknown>);
  return useQuery<TeamPageResult, Error>({
    queryKey: teamKeys.list(normalized),
    queryFn: ({ signal }) => runAbortable(signal, (requestSignal) => fetchTeamsPage(asListParams<TeamsListParams>(normalized), requestSignal)),
    placeholderData: keepPreviousListData<TeamPageResult>(normalized),
  });
}

export function useToursQuery(params: ToursQueryParams) {
  const normalized = normalizeParams(params as Record<string, unknown>);
  const requestParams = asListParams<ToursListParams>({
    page: Number(normalized.page || 1),
    limit: Number(normalized.limit || 20),
  });
  return useQuery<ToursPageResult, Error>({
    queryKey: tourKeys.list(normalized),
    queryFn: ({ signal }) => runAbortable(signal, (requestSignal) => fetchToursPage(requestParams, requestSignal)),
    placeholderData: keepPreviousListData<ToursPageResult>(normalized),
  });
}

export function useTournamentsQuery(params: TournamentsQueryParams) {
  const normalized = normalizeParams(params as Record<string, unknown>);
  return useQuery<TournamentPageResult, Error>({
    queryKey: tournamentKeys.list(normalized),
    queryFn: ({ signal }) => runAbortable(signal, (requestSignal) => fetchTournamentsPage(asListParams<TournamentsListParams>(normalized), requestSignal)),
    placeholderData: keepPreviousListData<TournamentPageResult>(normalized),
  });
}

export function useGalleryQuery(params: GalleryQueryParams, enabled = true) {
  const normalized = normalizeParams(params as Record<string, unknown>);
  return useQuery<GalleryPageResult, Error>({
    queryKey: galleryKeys.list(normalized),
    queryFn: ({ signal }) => runAbortable(signal, (requestSignal) => fetchGalleryPage(asListParams<GalleryListParams>(normalized), requestSignal)),
    placeholderData: keepPreviousListData<GalleryPageResult>(normalized),
    enabled,
  });
}

export function useMatchesQuery(params: MatchesQueryParams, enabled = true) {
  const normalized = normalizeParams(params as Record<string, unknown>);
  return useQuery<MatchesPageResult, Error>({
    queryKey: matchKeys.list(normalized),
    queryFn: ({ signal }) => runAbortable(signal, (requestSignal) => fetchMatchesPage(asListParams<MatchesListParams>(normalized), requestSignal)),
    placeholderData: keepPreviousListData<MatchesPageResult>(normalized),
    enabled,
  });
}

/**
 * The live match list.
 *
 * Polls on the same `LIVE_MATCH_REFETCH_MS` cadence as the single-match query in
 * `useMatchCentreQueries`. Both are backstops for the socket, and the point of
 * using one shared constant is that a card and the match page it links to must
 * never sit on visibly different scores: when the socket is unavailable the two
 * re-check together instead of one lagging the other until a manual refresh.
 *
 * `refetchIntervalInBackground` is off so a backgrounded tab is not polled.
 */
export function useLiveMatchesQuery(enabled = true) {
  return useQuery({
    queryKey: matchKeys.live(),
    queryFn: ({ signal }) => runAbortable(signal, (requestSignal) => fetchLiveMatches(requestSignal)),
    enabled,
    refetchInterval: LIVE_MATCH_REFETCH_MS,
    refetchIntervalInBackground: false,
  });
}

/**
 * Full match records for a set of ids, keyed by id.
 *
 * `/favorites?expand=true` returns a deliberately thin match — no `team_scores`,
 * no `result_text` and a `teams` array rather than `{home, away}` — so a completed
 * favourite has nothing for `scoreboardFromMatch` or `describeMatchResult` to read
 * and the card renders blank. `/matches/:id` returns the complete summary, so each
 * missing row is topped up from there.
 *
 * Deduplicated and cached under `matchKeys.detail`, so a match shown on several
 * cards — or revisited on a later visit — is fetched once and reused. A `null` value
 * means the id is genuinely gone, which is cached too: without that, every render
 * would retry a 404 forever.
 */
export function useMatchDetailsQuery(matchIds: readonly string[]) {
  const ids = useMemo(
    () => [...new Set(matchIds.map((id) => id.trim()).filter(Boolean))].sort(),
    [matchIds],
  );
  // A stable key so the query instance is not rebuilt on every parent render.
  const key = useMemo(() => ids.join('|'), [ids]);

  return useQuery<Record<string, Match>, Error>({
    queryKey: [...matchKeys.all, 'details', key],
    enabled: ids.length > 0,
    staleTime: QUERY_STALE_TIME,
    queryFn: ({ signal }) =>
      runAbortable(signal, async (requestSignal) => {
        const entries = await Promise.all(
          ids.map(async (id) => [id, await fetchMatchById(id, requestSignal)] as const),
        );
        return Object.fromEntries(entries) as Record<string, Match>;
      }),
  });
}

export function useSiteSettingsQuery() {
  return useQuery<SiteSettings, Error>({
    queryKey: siteSettingsKeys.current(),
    queryFn: ({ signal }) => runAbortable(signal, (requestSignal) => fetchSiteSettings(requestSignal)),
    staleTime: 60 * 1000,
  });
}

type PrefetchFetcher = (_signal: AbortSignal) => Promise<unknown>;

export function usePrefetchNextPage({
  page,
  totalPages,
  enabled,
  queryKey,
  queryFn,
}: {
  page: number;
  totalPages: number;
  enabled: boolean;
  queryKey: readonly unknown[];
  queryFn: PrefetchFetcher;
}) {
  const queryClient = useQueryClient();
  const queryKeyJson = JSON.stringify(queryKey);
  const queryKeyRef = useRef(queryKey);
  queryKeyRef.current = queryKey;
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;

  useEffect(() => {
    if (!enabled || page >= totalPages) return;
    const nextKey = queryKeyRef.current;
    const state = queryClient.getQueryState(nextKey);
    const isFresh = Boolean(
      state?.data !== undefined &&
      !state.isInvalidated &&
      state.dataUpdatedAt > 0 &&
      Date.now() - state.dataUpdatedAt < QUERY_STALE_TIME
    );
    if (isFresh) return;
    void queryClient.prefetchQuery({
      queryKey: nextKey,
      queryFn: ({ signal }) => runAbortable(signal, (requestSignal) => queryFnRef.current(requestSignal)),
    });
  }, [enabled, page, totalPages, queryKeyJson, queryClient]);
}
