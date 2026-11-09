import { rapidGet } from './rapidHttp.js';

/**
 * Cricbuzz Cricket (RapidAPI, cricketapilive) → SportsRadar-shaped JSON.
 *
 * The rest of the pipeline reads SportsRadar's shape, so this module only translates.
 * Response shapes are mapped from the provider's documented endpoints and have not been
 * checked against a live response yet — keep all field access in this file so a
 * correction stays local.
 */

const LIVE_TTL_S = Number(process.env.RAPIDAPI_LIVE_TTL_S || 60);
const LIST_TTL_S = Number(process.env.RAPIDAPI_LIST_TTL_S || 21600);

const PREFIX = { match: 'cb:match:', team: 'cb:team:', tournament: 'cb:tournament:' };
const matchId = (id) => `${PREFIX.match}${rawMatchId(id)}`;
const teamId = (id) => (id == null ? null : `${PREFIX.team}${id}`);
const rawMatchId = (id) => String(id).replace(PREFIX.match, '');

/**
 * Cricbuzz "state" (+ free-text status) → SportsRadar status words.
 * `match_status` is chosen so normalize.js's status regexes read it correctly: a live
 * match must never contain won/ended/complete/result, or it is marked finished.
 */
export function mapState(state = '', status = '') {
  const s = String(state).toLowerCase();
  const text = String(status).toLowerCase();
  if (/abandon|no result/.test(s) || /abandon/.test(text)) {
    return { status: 'closed', matchStatus: 'abandoned' };
  }
  if (/cancel|postpon/.test(s)) return { status: 'cancelled', matchStatus: 'cancelled' };
  if (/complete/.test(s)) return { status: 'closed', matchStatus: 'ended' };
  if (/innings break/.test(s)) return { status: 'live', matchStatus: 'inprogress' };
  if (/rain|light|delay|stump|lunch|tea|dinner|drinks|interrupt/.test(s)) {
    return { status: 'interrupted', matchStatus: 'interrupted' };
  }
  if (/progress|live/.test(s)) return { status: 'live', matchStatus: 'inprogress' };
  return { status: 'not_started', matchStatus: 'scheduled' };
}

function iso(ms) {
  const n = Number(ms);
  return Number.isFinite(n) && n > 0 ? new Date(n).toISOString() : null;
}

function flattenMatches(payload) {
  const out = [];
  for (const type of payload?.typeMatches ?? []) {
    for (const series of type.seriesMatches ?? []) {
      for (const m of series.seriesAdWrapper?.matches ?? []) {
        if (m?.matchInfo) out.push(m);
      }
    }
  }
  return out;
}

function competitor(team, qualifier) {
  return {
    id: teamId(team?.teamId ?? team?.id),
    name: team?.teamName ?? team?.name ?? null,
    abbreviation: team?.teamSName ?? team?.shortName ?? null,
    qualifier,
  };
}

/** One list entry (`matchInfo`) → SportsRadar `sport_event` + status word. */
export function toSportEvent(info) {
  const { status } = mapState(info.state, info.status);
  return {
    id: matchId(info.matchId),
    scheduled: iso(info.startDate),
    status,
    tournament: { id: `${PREFIX.tournament}${info.seriesId}`, name: info.seriesName ?? null },
    venue: { name: info.venueInfo?.ground ?? null },
    competitors: [competitor(info.team1, 'home'), competitor(info.team2, 'away')],
  };
}

const norm = (v) => String(v ?? '').trim().toLowerCase();

/** Which of the match's two teams a scorecard innings belongs to (the scorecard has no team ids). */
function teamForInnings(inn, t1, t2) {
  const keys = [norm(inn?.batteamsname), norm(inn?.batteamname)].filter(Boolean);
  const is = (t) => keys.some((k) => k === norm(t?.teamSName) || k === norm(t?.teamName));
  if (is(t1)) return t1;
  if (is(t2)) return t2;
  return null;
}

/** "Day 1: Stumps - Sri Lanka opt to bowl" → { team, decision }. Null when the text has no toss. */
function parseToss(text, t1, t2) {
  const m = String(text ?? '').match(/(?:^|[-:]\s*)([^-:]+?)\s+(?:opt|elected|chose)\s+to\s+(bat|bowl|field)/i);
  if (!m) return null;
  const who = norm(m[1]);
  const team = [t1, t2].find((t) => norm(t?.teamName) === who || norm(t?.teamSName) === who);
  return team ? { team, decision: /bat/i.test(m[2]) ? 'bat' : 'field' } : null;
}

/**
 * List entry (`matchInfo`: teams, series, venue, state) + scorecard (`mcenter/v1/{id}/scard`:
 * innings totals, status text) → SportsRadar match summary. The scorecard alone has no
 * team ids, series or start time, so both are needed.
 */
export function toSummary(info, scard) {
  const innings = scard?.scorecard ?? [];
  const t1 = info.team1 ?? {};
  const t2 = info.team2 ?? {};
  const statusText = scard?.status ?? info.status ?? null;
  const mapped = mapState(info.state, statusText);
  const finished = mapped.status === 'closed' || scard?.ismatchcomplete === true;
  const { status, matchStatus } = finished && mapped.status !== 'closed'
    ? { status: 'closed', matchStatus: 'ended' }
    : mapped;

  // The normalizer treats the first innings as "home" and the second as "away", so
  // qualifiers follow batting order, not the fixture list.
  const homeTeam = teamForInnings(innings[0], t1, t2) ?? t1;
  const awayTeam = homeTeam === t1 ? t2 : t1;

  const periods = innings.map((inn, i) => {
    const side = teamForInnings(inn, t1, t2) === homeTeam ? 'home' : 'away';
    return {
      number: i + 1,
      [`${side}_score`]: Number(inn.score ?? 0),
      [`${side}_wickets`]: Number(inn.wickets ?? 0),
      display_overs: inn.overs ?? 0,
    };
  });

  const last = innings[innings.length - 1];
  const toss = parseToss(statusText, t1, t2);

  return {
    sport_event: {
      id: matchId(info.matchId),
      scheduled: iso(info.startDate),
      status,
      tournament: { id: `${PREFIX.tournament}${info.seriesId}`, name: info.seriesName ?? null },
      venue: { name: info.venueInfo?.ground ?? null },
      competitors: [competitor(homeTeam, 'home'), competitor(awayTeam, 'away')],
    },
    sport_event_status: {
      status,
      match_status: matchStatus,
      display_score: last ? `${last.batteamsname ?? ''} ${last.score}/${last.wickets}`.trim() : null,
      display_overs: last?.overs ?? null,
      current_inning: innings.length || null,
      period_scores: periods,
      // "Team X need 20 runs" is not a result: only a finished match has one. The winner
      // is read from this text downstream (Cricbuzz gives no winner id here).
      match_result_text: finished ? statusText : null,
      winner_id: null,
      toss_won_by: toss ? teamId(toss.team.teamId) : null,
      toss_decision: toss?.decision ?? null,
    },
  };
}

const onDate = (m, date) => iso(m.matchInfo.startDate)?.slice(0, 10) === date;

/**
 * One adapter per Cricbuzz Cricket RapidAPI host. Both hosts serve the same endpoints and
 * JSON, so a second host is a second free-tier quota: each instance spends its own budget
 * but they share one response cache (`cacheNamespace`), so a fallback to the second host
 * costs nothing when the first already fetched the same page.
 */
export function createCricbuzz({ provider, host, budgetLimit, cacheNamespace = 'cricbuzz' }) {
  const get = (path, ttlSeconds) =>
    rapidGet({
      provider,
      cacheNamespace,
      host: host(),
      path,
      ttlSeconds,
      budget: { period: 'month', limit: budgetLimit() },
    });

  async function fetchLiveSchedule() {
    const data = await get('matches/v1/live', LIVE_TTL_S);
    return flattenMatches(data).map((m) => toSportEvent(m.matchInfo));
  }

  /** The list entry for a match. The poller has just fetched the live list, so that lookup is a cache hit. */
  async function findMatchInfo(id) {
    const want = Number(rawMatchId(id));
    for (const [kind, ttl] of [['live', LIVE_TTL_S], ['recent', LIST_TTL_S], ['upcoming', LIST_TTL_S]]) {
      const hit = flattenMatches(await get(`matches/v1/${kind}`, ttl)).find((m) => Number(m.matchInfo.matchId) === want);
      if (hit) return hit.matchInfo;
    }
    throw new Error(`cricbuzz match ${id} not found in the live, recent or upcoming lists`);
  }

  async function fetchMatchSummary(id) {
    const info = await findMatchInfo(id);
    const scard = await get(`mcenter/v1/${rawMatchId(id)}/scard`, LIVE_TTL_S);
    return toSummary(info, scard);
  }

  async function allListed() {
    const [live, recent, upcoming] = await Promise.all(
      ['live', 'recent', 'upcoming'].map((k) => get(`matches/v1/${k}`, LIST_TTL_S)),
    );
    const seen = new Set();
    return [...flattenMatches(live), ...flattenMatches(recent), ...flattenMatches(upcoming)].filter((m) => {
      const id = m.matchInfo.matchId;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }


  async function fetchDailySchedule(date) {
    const matches = (await allListed()).filter((m) => onDate(m, date));
    return { sport_events: matches.map((m) => toSportEvent(m.matchInfo)) };
  }

  async function fetchDailyResults(date) {
    const matches = (await allListed()).filter(
      (m) => onDate(m, date) && mapState(m.matchInfo.state, m.matchInfo.status).status === 'closed',
    );
    return {
      results: matches.map((m) => {
        const { status, matchStatus } = mapState(m.matchInfo.state, m.matchInfo.status);
        return {
          sport_event: toSportEvent(m.matchInfo),
          sport_event_status: {
            status,
            match_status: matchStatus,
            match_result_text: m.matchInfo.status ?? null,
          },
        };
      }),
    };
  }

  return { fetchLiveSchedule, fetchMatchSummary, fetchDailySchedule, fetchDailyResults };
}

const primary = createCricbuzz({
  provider: 'cricbuzz',
  host: () => process.env.RAPIDAPI_CRICBUZZ_HOST || 'cricbuzz-cricket.p.rapidapi.com',
  budgetLimit: () => Number(process.env.RAPIDAPI_CRICBUZZ_MONTHLY_BUDGET || 200),
});

/** cricbuzz-cricket2: same endpoints and shape, its own 100-request free plan. */
export const cricbuzz2 = createCricbuzz({
  provider: 'cricbuzz2',
  host: () => process.env.RAPIDAPI_CRICBUZZ2_HOST || 'cricbuzz-cricket2.p.rapidapi.com',
  budgetLimit: () => Number(process.env.RAPIDAPI_CRICBUZZ2_MONTHLY_BUDGET || 100),
});

export const { fetchLiveSchedule, fetchMatchSummary, fetchDailySchedule, fetchDailyResults } = primary;
