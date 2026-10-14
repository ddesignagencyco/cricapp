import { apiGet, apiGetOptional, extractPage } from './api/client';
import type { Match } from '../types/index';

export interface MatchTimeline {
  matchId: string;
  payload: Record<string, unknown>;
  /**
   * Monotonic revision of the stored timeline. Send it back as `since` to fetch only
   * what is new, and compare two of them to know which snapshot is newer.
   */
  revision?: number | null;
  /** ISO-8601 time the revision was computed at. */
  updatedAt?: string | null;
  /**
   * `true` when `payload` holds the whole timeline, `false` when it holds only the
   * events after the `since` revision that was sent.
   */
  complete?: boolean;
}

export interface MatchesListParams {
  [key: string]: string | number | boolean | undefined | null;
  q?: string;
  status?: string;
  tournament?: string;
  /**
   * Exact provider tournament id, e.g. `sr:tournament:10020626`.
   *
   * Preferred over `tournament`, which the API matches as a substring: asking for
   * "Global T20 Canada" also returns "Global T20 Canada 2024", so a competition's rail
   * could list another competition's fixtures.
   */
  tournamentId?: string;
  page?: number;
  limit?: number;
}

export interface MatchesPageResult {
  items: Match[];
  total: number;
  totalPages: number;
}

export async function fetchMatches(
  params: MatchesListParams = {},
  signal?: AbortSignal
): Promise<Match[]> {
  const res = await apiGet('/matches', params, { signal });
  return extractPage<Match>(res).items;
}

export async function fetchMatchesPage(
  params: MatchesListParams = {},
  signal?: AbortSignal
): Promise<MatchesPageResult> {
  const res = await apiGet('/matches', params, { signal });
  const { items, meta } = extractPage<Match>(res);
  return { items, total: meta.total, totalPages: meta.totalPages };
}

export async function fetchLiveMatches(signal?: AbortSignal): Promise<Match[]> {
  const res = await apiGet('/matches/live', undefined, { signal });
  return extractPage<Match>(res).items;
}

function normalizeMatchId(id: string): string {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

export async function fetchMatchById(id: string, signal?: AbortSignal): Promise<Match | null> {
  return apiGetOptional(`/matches/${normalizeMatchId(id)}`, undefined, { signal });
}

/**
 * The ball-by-ball timeline.
 *
 * Pass `since` to get only the events newer than that revision instead of the whole
 * payload — a live match's full timeline runs to ~1.6 MB, so polling it whole is the
 * single heaviest request on the match page.
 *
 * The three outcomes are deliberately distinguishable, because the caller has to treat
 * them differently:
 *
 * - **`MatchTimeline`** — fresh data. `complete: true` is the whole payload,
 *   `complete: false` a delta to be merged onto what is already cached.
 * - **`undefined`** — the API answered `204`, meaning `since` is already at (or past)
 *   the current revision. There is nothing new; keep the cached timeline.
 * - **`null`** — the API answered `404`: this fixture genuinely has no timeline. That is
 *   an answer, not a failure, so it is cached and the empty state renders.
 *
 * Collapsing `undefined` into `null` would render an empty commentary tab on every poll
 * that happened to find no new ball.
 */
export async function fetchMatchTimeline(
  id: string,
  signal?: AbortSignal,
  since?: number | null,
): Promise<MatchTimeline | null | undefined> {
  return apiGetOptional(
    `/matches/${normalizeMatchId(id)}/timeline`,
    since === null || since === undefined ? undefined : { since },
    { signal },
  );
}

export function matchSideIds(match: Match): { home: string; away: string } {
  const teams = match.teams as unknown;
  if (Array.isArray(teams)) {
    return { home: String(teams[0] || ''), away: String(teams[1] || '') };
  }
  if (teams && typeof teams === 'object') {
    const obj = teams as { home?: { teamId?: string; id?: string; code?: string }; away?: { teamId?: string; id?: string; code?: string } };
    return {
      home: String(obj.home?.teamId || obj.home?.id || obj.home?.code || ''),
      away: String(obj.away?.teamId || obj.away?.id || obj.away?.code || ''),
    };
  }
  return { home: '', away: '' };
}
