import { rapidGet } from './rapidHttp.js';

/**
 * Cricbuzz Cricket (RapidAPI, cricketapilive) → SportsRadar-shaped JSON.
 *
 * The rest of the pipeline reads SportsRadar's shape, so this module only translates.
 * Response shapes are mapped from the provider's documented endpoints and have not been
 * checked against a live response yet — keep all field access in this file so a
 * correction stays local.
 */

const HOST = process.env.RAPIDAPI_CRICBUZZ_HOST || 'cricbuzz-cricket.p.rapidapi.com';
const LIVE_TTL_S = Number(process.env.RAPIDAPI_LIVE_TTL_S || 60);
const LIST_TTL_S = Number(process.env.RAPIDAPI_LIST_TTL_S || 1800);
const budget = () => ({
  period: 'month',
  limit: Number(process.env.RAPIDAPI_CRICBUZZ_MONTHLY_BUDGET || 200),
});

const PREFIX = { match: 'cb:match:', team: 'cb:team:', tournament: 'cb:tournament:' };
const matchId = (id) => `${PREFIX.match}${rawMatchId(id)}`;
const teamId = (id) => (id == null ? null : `${PREFIX.team}${id}`);
const rawMatchId = (id) => String(id).replace(PREFIX.match, '');

function get(path, ttlSeconds) {
  return rapidGet({ provider: 'cricbuzz', host: HOST, path, ttlSeconds, budget: budget() });
}

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

/** Scorecard response (`mcenter/v1/{id}/scard`) → SportsRadar match summary. */
export function toSummary(scard, id) {
  const header = scard?.matchHeader ?? {};
  const innings = scard?.scoreCard ?? [];
  const { status, matchStatus } = mapState(header.state, header.status);

  const first = innings[0]?.batTeamDetails;
  const firstBatId = first?.batTeamId ?? header.team1?.id;
  const t1 = header.team1 ?? {};
  const t2 = header.team2 ?? {};
  // The normalizer treats the first innings as "home" and the second as "away", so
  // qualifiers follow batting order here, not the fixture list.
  const homeTeam = String(t1.id) === String(firstBatId) ? t1 : String(t2.id) === String(firstBatId) ? t2 : t1;
  const awayTeam = homeTeam === t1 ? t2 : t1;

  const periods = innings.map((inn, i) => {
    const side = String(inn.batTeamDetails?.batTeamId) === String(homeTeam.id) ? 'home' : 'away';
    const d = inn.scoreDetails ?? {};
    return {
      number: i + 1,
      [`${side}_score`]: Number(d.runs ?? 0),
      [`${side}_wickets`]: Number(d.wickets ?? 0),
      display_overs: d.overs ?? 0,
    };
  });

  const lastInn = innings[innings.length - 1];
  const last = lastInn?.scoreDetails;
  const lastBat = lastInn?.batTeamDetails;
  const displayScore = last
    ? `${lastBat?.batTeamShortName ?? ''} ${last.runs}/${last.wickets}`.trim()
    : null;

  const finished = status === 'closed';
  const toss = header.tossResults ?? {};
  const decision = String(toss.decision ?? '').toLowerCase();
  const winnerId = header.result?.winningteamId ?? header.result?.winningTeamId ?? null;

  return {
    sport_event: {
      id: matchId(id ?? header.matchId),
      scheduled: iso(header.matchStartTimestamp),
      status,
      tournament: { id: `${PREFIX.tournament}${header.seriesId}`, name: header.seriesName ?? null },
      venue: { name: null },
      competitors: [competitor(homeTeam, 'home'), competitor(awayTeam, 'away')],
    },
    sport_event_status: {
      status,
      match_status: matchStatus,
      display_score: displayScore,
      display_overs: last?.overs ?? null,
      current_inning: innings.length || null,
      period_scores: periods,
      // Free text like "Team X need 20 runs" is only a result once the match is over.
      match_result_text: finished ? (header.status ?? null) : null,
      winner_id: finished ? teamId(winnerId) : null,
      toss_won_by: teamId(toss.tossWinnerId),
      toss_decision: /bat/.test(decision) ? 'bat' : /bowl|field/.test(decision) ? 'field' : null,
    },
  };
}

export async function fetchLiveSchedule() {
  const data = await get('matches/v1/live', LIVE_TTL_S);
  return flattenMatches(data).map((m) => toSportEvent(m.matchInfo));
}

export async function fetchMatchSummary(id) {
  const data = await get(`mcenter/v1/${rawMatchId(id)}/scard`, LIVE_TTL_S);
  return toSummary(data, id);
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

const onDate = (m, date) => iso(m.matchInfo.startDate)?.slice(0, 10) === date;

export async function fetchDailySchedule(date) {
  const matches = (await allListed()).filter((m) => onDate(m, date));
  return { sport_events: matches.map((m) => toSportEvent(m.matchInfo)) };
}

export async function fetchDailyResults(date) {
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
