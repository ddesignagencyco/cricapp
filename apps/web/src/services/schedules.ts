import { apiGet, extractPage } from './api/client';
import type { SportEventRecord } from '../types/index';
import type { PageMeta } from './api/client';
import { toKarachiISODate } from '../utils/helpers';

const PAGE_SIZE = 20;

/**
 * `/schedules/{date}` reads `SportEventRecord` rows of kind `daily_schedule` /
 * `daily_results`, which are written by the provider ingestion job. When that
 * job has not populated a day, the same fixtures are still available from
 * `/matches`, so the day is rebuilt from that endpoint instead of showing an
 * empty page.
 */

interface MatchSummaryLike {
  matchId?: string;
  status?: string;
  scheduled?: string | null;
  tournament?: string | null;
  venue?: string | null;
  teams?: string[];
  teamNames?: string[];
  displayScore?: string | null;
  matchStatus?: string | null;
}

const MATCH_INDEX_TTL_MS = 5 * 60 * 1000;
const MATCH_INDEX_PAGE_LIMIT = 100;
const MATCH_INDEX_MAX_PAGES = 8;

let matchIndexCache: { at: number; matches: MatchSummaryLike[] } | null = null;
let matchIndexInFlight: Promise<MatchSummaryLike[]> | null = null;

async function fetchMatchStatus(status: string): Promise<MatchSummaryLike[]> {
  const collected: MatchSummaryLike[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const res = await apiGet('/matches', { status, page, limit: MATCH_INDEX_PAGE_LIMIT });
    const { items, meta } = extractPage<MatchSummaryLike>(res);
    collected.push(...items);
    totalPages = meta.totalPages || 1;
    page += 1;
  } while (page <= totalPages && page <= MATCH_INDEX_MAX_PAGES);
  return collected;
}

/**
 * All known matches, loaded once and reused for every day the user browses.
 * The API allows 100 requests per minute, so the full set is cached rather than
 * re-fetched on each date change.
 */
async function loadMatchIndex(): Promise<MatchSummaryLike[]> {
  if (matchIndexCache && Date.now() - matchIndexCache.at < MATCH_INDEX_TTL_MS) {
    return matchIndexCache.matches;
  }
  if (matchIndexInFlight) return matchIndexInFlight;

  matchIndexInFlight = (async () => {
    const groups: MatchSummaryLike[] = [];
    for (const status of ['live', 'upcoming', 'completed']) {
      groups.push(...(await fetchMatchStatus(status)));
    }
    matchIndexCache = { at: Date.now(), matches: groups };
    return groups;
  })().finally(() => {
    matchIndexInFlight = null;
  });

  return matchIndexInFlight;
}

function toSportEventRecord(match: MatchSummaryLike, date: string, kind: string): SportEventRecord {
  const teamIds = match.teams || [];
  const teamNames = match.teamNames || [];
  const competitors = [0, 1].map((i) => ({
    id: teamIds[i] || '',
    name: teamNames[i] || 'TBD',
    abbreviation: '',
    qualifier: i === 0 ? 'home' : 'away',
  }));

  return {
    kind,
    scopeKey: date,
    eventId: match.matchId || `${date}-${teamNames.join('-')}`,
    status: match.status,
    scheduled: match.scheduled || undefined,
    payload: {
      sport_event: {
        id: match.matchId,
        scheduled: match.scheduled,
        tournament: match.tournament ? { name: match.tournament } : undefined,
        venue: match.venue || undefined,
        competitors,
        coverage: { live: match.status === 'live' },
      },
      sport_event_status: {
        match_status: match.matchStatus || match.status,
        display_score: match.displayScore || undefined,
      },
    },
  };
}

function paginate<T>(items: T[], page: number, limit: number): { items: T[]; meta: PageMeta } {
  const total = items.length;
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    meta: {
      total,
      page: safePage,
      limit,
      totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
    },
  };
}

async function buildDayFromMatches(
  date: string,
  page: number,
  limit: number,
  kind: 'daily_schedule' | 'daily_results'
): Promise<{ items: SportEventRecord[]; meta: PageMeta }> {
  const matches = await loadMatchIndex();
  const onDate = matches.filter((m) => {
    if (!m.scheduled) return false;
    const parsed = new Date(m.scheduled);
    if (Number.isNaN(parsed.getTime())) return false;
    return toKarachiISODate(parsed) === date;
  });

  const relevant =
    kind === 'daily_results' ? onDate.filter((m) => m.status === 'completed') : onDate;

  relevant.sort((a, b) => String(a.scheduled).localeCompare(String(b.scheduled)));

  const paged = paginate(relevant, page, limit);
  return {
    items: paged.items.map((m) => toSportEventRecord(m, date, kind)),
    meta: paged.meta,
  };
}

export async function fetchDailySchedule(
  date: string,
  page = 1,
  limit = PAGE_SIZE
): Promise<{ items: SportEventRecord[]; meta: PageMeta }> {
  const res = await apiGet(`/schedules/${date}`, { page, limit });
  const extracted = extractPage<SportEventRecord>(res);
  if (extracted.meta.total > 0) return extracted;
  return buildDayFromMatches(date, page, limit, 'daily_schedule');
}

export async function fetchDailyResults(
  date: string,
  page = 1,
  limit = PAGE_SIZE
): Promise<{ items: SportEventRecord[]; meta: PageMeta }> {
  const res = await apiGet(`/schedules/${date}/results`, { page, limit });
  const extracted = extractPage<SportEventRecord>(res);
  if (extracted.meta.total > 0) return extracted;
  return buildDayFromMatches(date, page, limit, 'daily_results');
}
