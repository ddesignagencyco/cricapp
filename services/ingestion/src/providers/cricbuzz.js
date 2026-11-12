import { rapidGet } from './rapidHttp.js';

/**
 * Cricbuzz Cricket (RapidAPI, cricketapilive) → SportsRadar-shaped JSON.
 *
 * The rest of the pipeline reads SportsRadar's shape, so this module only translates.
 * Shapes are checked against recorded official responses (test/fixtures/cricbuzz,
 * test/fixtures/cricbuzz-official); keep all field access in this file so a correction
 * stays local. Reference data, profiles and the timeline live in the sibling cricbuzz*
 * modules, all on the same host, cache and budget.
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

/**
 * A team's recent results (`teamMatchesData[].matchDetailsMap.match[]`) → SportsRadar's
 * `{ results: [{ sport_event, sport_event_status }] }`. Only finished games are results; the
 * winner is left to be read from the result text, as everywhere else.
 */
export function toTeamResults(payload) {
  const entries = (payload?.teamMatchesData ?? []).flatMap((g) => g.matchDetailsMap?.match ?? []);
  return {
    results: entries
      .filter((m) => m?.matchInfo && /complete/i.test(m.matchInfo.state ?? ''))
      .map((m) => ({
        sport_event: toSportEvent(m.matchInfo),
        sport_event_status: { status: 'closed', match_status: 'ended', match_result_text: m.matchInfo.status ?? null },
      })),
  };
}

/** Cricbuzz serves team flags / logos publicly by image id, so a logo costs no API request. */
const logoUrl = (imageId) =>
  imageId ? `https://static.cricbuzz.com/a/img/v1/152x152/i1/c${imageId}/i.jpg` : undefined;

function competitor(team, qualifier) {
  return {
    id: teamId(team?.teamId ?? team?.id),
    name: team?.teamName ?? team?.name ?? null,
    abbreviation: team?.teamSName ?? team?.shortName ?? null,
    qualifier,
    logo_url: logoUrl(team?.imageId),
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
  scard = normalizeScard(scard);
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

/**
 * `matchScore` on a list entry (`team1Score.inngs1 = {runs, wickets, overs}` ...) → SportsRadar-style
 * `period_scores`. team1 is "home" and team2 "away", the same order as `toSportEvent`'s competitors,
 * so the two stay consistent. Innings are numbered in the order Cricbuzz numbers them (`inningsId`).
 */
export function periodsFromMatchScore(matchScore) {
  const innings = [];
  for (const [side, block] of [['home', matchScore?.team1Score], ['away', matchScore?.team2Score]]) {
    for (const [key, inn] of Object.entries(block ?? {})) {
      const n = Number(key.replace(/\D/g, ''));
      if (!inn || inn.runs == null || !Number.isFinite(n)) continue;
      innings.push({ order: Number(inn.inningsId) || n, n, side, inn });
    }
  }
  innings.sort((a, b) => a.order - b.order || a.n - b.n);
  return innings.map(({ side, inn }, i) => ({
    number: i + 1,
    [`${side}_score`]: Number(inn.runs),
    ...(inn.wickets != null ? { [`${side}_wickets`]: Number(inn.wickets) } : {}),
    display_overs: inn.overs != null ? String(inn.overs) : '0',
  }));
}

const onDate = (m, date) => iso(m.matchInfo.startDate)?.slice(0, 10) === date;

const titleCaseName = (name) =>
  name && name === name.toUpperCase() ? name.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()) : name;

/**
 * The keywords (c, b, lbw, st) are matched case-sensitively: Cricbuzz writes them in lowercase, and
 * a fielder called "B Azam" must not be read as the separator before the bowler.
 *
 * "c Sahibzada Farhan b Awais Ali" → the dismissal the web scorecard reads. `names` maps
 * player names to ids so the bowler and fielder can link to their pages.
 */
export function parseDismissal(outdec, names) {
  const t = String(outdec ?? '').trim();
  if (!t || /^(not out|batting)$/i.test(t)) return null;
  const idOf = (n) => {
    const id = names.get(norm(n));
    return id == null ? null : `cb:player:${id}`;
  };
  let m;
  if ((m = t.match(/^c (?:&|and) b (.+)$/))) return { type: 'caught', bowler: idOf(m[1]), fielder: idOf(m[1]) };
  if ((m = t.match(/^c (.+?) b (.+)$/))) return { type: 'caught', bowler: idOf(m[2]), fielder: idOf(m[1]) };
  if ((m = t.match(/^lbw b (.+)$/))) return { type: 'lbw', bowler: idOf(m[1]), fielder: null };
  if ((m = t.match(/^st (.+?) b (.+)$/))) return { type: 'stumped', bowler: idOf(m[2]), fielder: idOf(m[1]) };
  if ((m = t.match(/^run out \((.+?)\)$/i))) return { type: 'run_out', bowler: null, fielder: idOf(m[1].split('/')[0]) };
  if ((m = t.match(/^hit wicket b (.+)$/))) return { type: 'hit_wicket', bowler: idOf(m[1]), fielder: null };
  if ((m = t.match(/^b (.+)$/))) return { type: 'bowled', bowler: idOf(m[1]), fielder: null };
  if (/^retired/i.test(t)) return { type: 'retired', bowler: null, fielder: null };
  return { type: t, bowler: null, fielder: null };
}

/**
 * List entry + scorecard → what the web's scorecard reads from the timeline payload:
 * `sport_event.competitors` and `statistics.innings[]` with every batter's and bowler's
 * figures. Home is the side that batted first, as everywhere else in this adapter.
 */
/**
 * Some matches come back with the batters and bowlers keyed by slot (`batsman.batsmenData.bat_1`,
 * `bowler.bowlersData.bowl_1`, camelCase fields) instead of as plain lists. Rewrite that layout
 * into the list layout the rest of the adapter reads; lists pass through untouched.
 */
export function normalizeScard(scard) {
  if (!scard || !Array.isArray(scard.scorecard)) return scard;
  const slots = (o) => Object.values(o ?? {}).filter((x) => x && typeof x === 'object');
  return {
    ...scard,
    scorecard: scard.scorecard.map((inn) => {
      const keyedBat = inn.batsman && !Array.isArray(inn.batsman);
      const keyedBowl = inn.bowler && !Array.isArray(inn.bowler);
      if (!keyedBat && !keyedBowl) return inn;
      return {
        ...inn,
        batsman: keyedBat
          ? slots(inn.batsman.batsmenData).map((b) => ({
              id: b.batId, name: b.batName, runs: b.runs, balls: b.balls, fours: b.fours, sixes: b.sixes,
              strkrate: b.strikeRate, outdec: b.outDesc, iscaptain: b.isCaptain, iskeeper: b.isKeeper,
            }))
          : inn.batsman,
        bowler: keyedBowl
          ? slots(inn.bowler.bowlersData).map((b) => ({
              id: b.bowlerId, name: b.bowlName, overs: b.overs, maidens: b.maidens, runs: b.runs,
              wickets: b.wickets, economy: b.economy, dots: b.dots, balls: b.balls,
            }))
          : inn.bowler,
      };
    }),
  };
}

export function toStatistics(info, scard) {
  scard = normalizeScard(scard);
  const t1 = info.team1 ?? {};
  const t2 = info.team2 ?? {};
  const list = scard?.scorecard ?? [];
  const home = teamForInnings(list[0], t1, t2) ?? t1;
  const away = home === t1 ? t2 : t1;

  const names = new Map();
  for (const inn of list) {
    for (const p of [...(inn.batsman ?? []), ...(inn.bowler ?? [])]) names.set(norm(p.name), p.id);
  }
  const teamRef = (t) => ({ id: teamId(t.teamId), name: titleCaseName(t.teamName), abbreviation: t.teamSName });

  const innings = list.map((inn, i) => {
    const bat = teamForInnings(inn, t1, t2) ?? (i % 2 === 0 ? home : away);
    const bowl = bat === t1 ? t2 : t1;
    const wickets = new Map((inn.fow?.fow ?? []).map((f) => [f.batsmanid, f]));

    const batters = (inn.batsman ?? [])
      .filter((b) => b.outdec || b.balls > 0) // an empty line is a player who has yet to bat
      .map((b, order) => {
        const d = parseDismissal(b.outdec, names);
        const fow = wickets.get(b.id);
        const over = fow ? Number(fow.overnbr) : null;
        return {
          id: `cb:player:${b.id}`,
          name: b.name,
          statistics: {
            order: order + 1,
            runs: b.runs,
            balls_faced: b.balls,
            fours: b.fours,
            sixes: b.sixes,
            strike_rate: Number(b.strkrate) || 0,
            ...(d && {
              dismissal: {
                type: d.type,
                bowler_id: d.bowler,
                fielder_id: d.fielder,
                ...(over != null && {
                  // fall-of-wicket overs are 0-based cricket notation; the reader wants one-based
                  over_number: Math.floor(over) + 1,
                  ball_number: Math.round((over - Math.floor(over)) * 10) || undefined,
                }),
              },
            }),
          },
        };
      });

    const bowlers = (inn.bowler ?? []).map((b, order) => ({
      id: `cb:player:${b.id}`,
      name: b.name,
      statistics: {
        order: order + 1,
        overs_bowled: String(b.overs),
        maidens: b.maidens,
        conceded_runs: b.runs,
        wickets: b.wickets,
        economy_rate: Number(b.economy) || 0,
        dot_balls: b.dots ?? undefined,
      },
    }));

    return {
      number: inn.inningsid ?? i + 1,
      batting_team: teamId(bat.teamId),
      bowling_team: teamId(bowl.teamId),
      overs_completed: Math.floor(Number(inn.overs)) || 0,
      teams: [
        { ...teamRef(bat), statistics: { batting: { runs: inn.score, wickets_lost: inn.wickets, players: batters } } },
        { ...teamRef(bowl), statistics: { bowling: { players: bowlers } } },
      ],
    };
  });

  return {
    competitors: [competitor(home, 'home'), competitor(away, 'away')],
    statistics: { innings },
  };
}

/** The official Cricbuzz Cricket listing on RapidAPI — the only host this app reads match data from. */
export const HOST = () => process.env.RAPIDAPI_CRICBUZZ_HOST || 'cricbuzz-cricket.p.rapidapi.com';

/**
 * Monthly request budget, enforced locally before RapidAPI's own cap. Set it to the plan:
 * Basic 200, Pro 20000, Ultra 300000 (leave headroom for retries and manual tests).
 */
export const BUDGET = () => ({ period: 'month', limit: Number(process.env.RAPIDAPI_CRICBUZZ_MONTHLY_BUDGET || 200) });

/** GET an official Cricbuzz Cricket path through the shared response cache and budget. */
export function cricbuzzGet(path, ttlSeconds, query = {}) {
  return rapidGet({ provider: 'cricbuzz', host: HOST(), path, query, ttlSeconds, budget: BUDGET() });
}

const get = (path, ttlSeconds) => cricbuzzGet(path, ttlSeconds);

export async function fetchLiveSchedule() {
  const data = await get('matches/v1/live', LIVE_TTL_S);
  return flattenMatches(data).map((m) => toSportEvent(m.matchInfo));
}

/** The list entry for a match. The poller has just fetched the live list, so that lookup is a cache hit. */
export async function findMatchInfo(id) {
  const want = Number(rawMatchId(id));
  for (const [kind, ttl] of [['live', LIVE_TTL_S], ['recent', LIST_TTL_S], ['upcoming', LIST_TTL_S]]) {
    const hit = flattenMatches(await get(`matches/v1/${kind}`, ttl)).find((m) => Number(m.matchInfo.matchId) === want);
    if (hit) return hit.matchInfo;
  }
  throw new Error(`cricbuzz match ${id} not found in the live, recent or upcoming lists`);
}

export async function fetchMatchSummary(id) {
  const info = await findMatchInfo(id);
  const scard = normalizeScard(await get(`mcenter/v1/${rawMatchId(id)}/scard`, LIVE_TTL_S));
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
          ...(m.matchScore ? { period_scores: periodsFromMatchScore(m.matchScore) } : {}),
        },
      };
    }),
  };
}

/** List entry + scorecard for a match: the raw material for the timeline's scorecard. */
export async function fetchScorecardBundle(id, hint = null) {
  // A match that has left the provider's recent list can still be read when the caller knows
  // its two sides ({ team1, team2 } in the provider's own field names).
  const info = hint ? await findMatchInfo(id).catch(() => hint) : await findMatchInfo(id);
  const scard = await get(`mcenter/v1/${rawMatchId(id)}/scard`, LIVE_TTL_S);
  return { info, scard };
}

/** `{ competitors, statistics }` for the web scorecard (what a timeline payload carries). */
export async function fetchMatchScorecard(id, hint = null) {
  const { info, scard } = await fetchScorecardBundle(id, hint);
  return toStatistics(info, scard);
}

/** A team's recent finished games (`teams/v1/{id}/results`); head-to-head is built from these. */
export async function fetchTeamResults(teamId) {
  const id = String(teamId).replace(PREFIX.team, '');
  return toTeamResults(await get(`teams/v1/${id}/results`, LIST_TTL_S));
}

/** Scorecard payload for the timeline (`sport_event.competitors` + `statistics`). */
export const cricbuzzStatistics = fetchMatchScorecard;
