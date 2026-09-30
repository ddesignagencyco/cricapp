import { fetchMatchById, fetchMatchesPage } from '../services/matches';
import type { Match } from '../types/index';
import type { EntityChoice } from '../components/admin/EntityIdPicker';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') {
    const text = value.trim();
    return !text || text === '[object Object]' ? '' : text;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join(' ');
  if (typeof value !== 'object') return '';
  const rec = asRecord(value);
  const nested = rec.name ?? rec.full_name ?? rec.fullName ?? rec.short_name ?? rec.shortName ?? rec.abbr ?? rec.title;
  if (nested === undefined || nested === null || nested === value) return '';
  return asText(nested);
}

export function matchIdOf(match: unknown): string {
  const row = asRecord(match);
  const raw = row.matchId ?? row.match_id ?? row.id;
  if (typeof raw === 'string' || typeof raw === 'number') return String(raw).trim();
  return asText(raw);
}

function teamNameList(match: unknown): string[] {
  const row = asRecord(match);
  const names = row.teamNames ?? row.team_names;
  return Array.isArray(names) ? names.map(asText).filter(Boolean) : [];
}

function sideName(side: unknown): string {
  const rec = asRecord(side);
  return asText(rec.name ?? rec.full_name ?? rec.fullName ?? rec.short_name ?? rec.qualifier ?? side);
}

export function matchLabel(match: unknown): string {
  if (!match) return 'Match';
  const row = asRecord(match);
  const names = teamNameList(match);
  const teamsVal = row.teams;
  let home = '';
  let away = '';
  if (Array.isArray(teamsVal)) {
    home = sideName(teamsVal[0]) || names[0] || '';
    away = sideName(teamsVal[1]) || names[1] || '';
  } else {
    const teams = asRecord(teamsVal);
    home = sideName(teams.home) || names[0] || sideName(row.home);
    away = sideName(teams.away) || names[1] || sideName(row.away);
  }
  if (home && away) return `${home} vs ${away}`;
  if (home || away) return home || away;
  return asText(row.tournamentName) || asText(row.tournament) || asText(row.matchId) || 'Match';
}

/** `2023-07-21T19:30:00Z` -> `21 Jul 2023`. Formatted from the ISO parts, not the
 *  runtime locale, so a reader in any timezone sees the same day. */
function matchDay(match: unknown): string {
  const raw = asText(asRecord(match).scheduled);
  const day = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!day) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[Number(day[2]) - 1];
  if (!month) return '';
  return `${Number(day[3])} ${month} ${day[1]}`;
}

interface MatchIndexEntry {
  id: string;
  label: string;
  /** Everything a reader might type, lowercased once so each keystroke is a scan. */
  haystack: string;
}

function toEntry(match: Match): MatchIndexEntry | null {
  const id = matchIdOf(match);
  if (!id) return null;
  const row = asRecord(match);
  const teams = matchLabel(match);
  // Venue stays searchable but out of the label: the row already carries both sides,
  // the competition and the day, which is what tells two similar fixtures apart.
  const parts = [teams, asText(row.tournament), matchDay(match)];
  const live = asText(row.status).toLowerCase() === 'live';
  const label = [...parts.filter(Boolean), ...(live ? ['LIVE'] : [])].join(' · ');
  const haystack = [id, teams, ...teamNameList(match), asText(row.tournament), asText(row.venue), asText(row.status)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return { id, label, haystack };
}

/** The API's documented maximum page size. */
const PAGE_SIZE = 100;
/**
 * Ceiling on how much of the table is indexed (40 pages = 4000 matches). The search
 * covers the entire stored table today - a name search reads every match, whatever its
 * status, instead of a live-only or per-team slice. The cap only exists so a table that
 * grows without bound cannot turn one keystroke into an unbounded crawl; past it a
 * pasted id still resolves through `fetchMatchById`.
 */
const MAX_PAGES = 40;
/** Pages fetched at once. Enough to keep the first search quick without swamping the API. */
const PAGE_CONCURRENCY = 5;
/** How long a loaded index is reused before it is rebuilt. */
const INDEX_TTL_MS = 5 * 60 * 1000;
/** Rows shown in the dropdown. */
const MAX_RESULTS = 25;

let cached: { at: number; entries: MatchIndexEntry[] } | null = null;
let inFlight: Promise<MatchIndexEntry[]> | null = null;

async function buildIndex(): Promise<MatchIndexEntry[]> {
  const first = await fetchMatchesPage({ page: 1, limit: PAGE_SIZE });
  const pages = Math.min(first.totalPages || 1, MAX_PAGES);
  const rest: Match[] = [];
  for (let start = 2; start <= pages; start += PAGE_CONCURRENCY) {
    const batch: number[] = [];
    for (let page = start; page < start + PAGE_CONCURRENCY && page <= pages; page += 1) batch.push(page);
    const results = await Promise.all(
      batch.map((page) => fetchMatchesPage({ page, limit: PAGE_SIZE })),
    );
    for (const result of results) rest.push(...result.items);
  }
  return [first.items, ...rest]
    .flat()
    .map((match) => toEntry(match))
    .filter((entry): entry is MatchIndexEntry => entry !== null);
}

/**
 * The whole match table, loaded once and reused.
 *
 * Deliberately not tied to a caller's AbortSignal: the picker aborts the previous
 * keystroke's request, and a shared load that died with it would leave every later
 * search with no index at all.
 */
async function loadIndex(): Promise<MatchIndexEntry[]> {
  if (cached && Date.now() - cached.at < INDEX_TTL_MS) return cached.entries;
  if (!inFlight) {
    inFlight = buildIndex()
      .then((entries) => {
        cached = { at: Date.now(), entries };
        return entries;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

/** Drops the cached index. Exported so a reload can be forced after new fixtures land. */
export function resetMatchIndex(): void {
  cached = null;
  inFlight = null;
}

/**
 * Matches offered in the news editor's "Linked to" section, searched by name or id
 * across every match the database holds - live, upcoming, completed and cancelled
 * alike, so an article can be tied to the fixture it is actually about.
 *
 * WORKAROUND (delete once the backend can search matches server-side):
 * `/api/search` answers with match rows that carry no id at all, and `/api/matches?q=`
 * drops the id too, so neither can produce something linkable. `/api/matches` unfiltered
 * does return the id, so the table is indexed here and searched in the browser. The
 * earlier version fanned out to the first couple of teams a name search matched, which
 * missed a team whenever a same-named duplicate was ranked above the one with fixtures.
 */
export async function searchLinkedMatches(q: string, signal?: AbortSignal): Promise<EntityChoice[]> {
  const found = new Map<string, EntityChoice>();
  const addHit = (id: string, label: string) => {
    if (id && !found.has(id)) found.set(id, { id, label });
  };

  // A pasted id resolves in one request, and works even for a match the index missed.
  if (/^(sr:match:|[0-9a-f-]{8,})/i.test(q)) {
    const exact = await fetchMatchById(q, signal).catch(() => null);
    if (exact) addHit(matchIdOf(exact), matchLabel(exact));
  }

  const needle = q.trim().toLowerCase();
  if (needle) {
    const entries = await loadIndex();
    const scored: { entry: MatchIndexEntry; rank: number }[] = [];
    for (const entry of entries) {
      if (!entry.haystack.includes(needle)) continue;
      const id = entry.id.toLowerCase();
      let rank = 3;
      if (id === needle) rank = 0;
      else if (id.startsWith(needle)) rank = 1;
      else if (entry.label.toLowerCase().startsWith(needle)) rank = 2;
      scored.push({ entry, rank });
    }
    scored.sort((a, b) => a.rank - b.rank);
    for (const { entry } of scored.slice(0, MAX_RESULTS)) addHit(entry.id, entry.label);
  }

  return [...found.values()];
}
