import { rapidGet, remember } from './rapidHttp.js';
import { ProviderUnsupportedError } from './errors.js';
import { cricbuzzMatchInfo } from './cricbuzz.js';

/**
 * cricbuzz-live1 (RapidAPI) → SportsRadar-shaped JSON, for what the Cricbuzz Cricket hosts
 * lack: the ball-by-ball timeline, PSL standings, squads and the tournament team list.
 *
 * Ids: `lv:match:<sx id>`, `lv:team:<numeric id>`, `lv:player:<numeric id>`. A Cricbuzz
 * match id (`cb:match:…`) is accepted for the timeline and mapped to its live1 match by
 * team pair and start time, so a timeline is stored under the id the poller already uses.
 *
 * Shapes were taken from recorded live responses (see test/fixtures/live1/).
 */

const HOST = () => process.env.RAPIDAPI_LIVE1_HOST || 'cricbuzz-live1.p.rapidapi.com';
const BASE = 'cricket/api/v2';
const LIVE_TTL_S = Number(process.env.RAPIDAPI_LIVE_TTL_S || 60);
const STATIC_TTL_S = Number(process.env.RAPIDAPI_LIST_TTL_S || 21600);
const DAY_MS = 86400000;

const PREFIX = { match: 'lv:match:', team: 'lv:team:', player: 'lv:player:', tournament: 'lv:tournament:' };
const teamId = (id) => (id == null || id === '' ? null : `${PREFIX.team}${String(id).replace(PREFIX.team, '')}`);
const playerRef = (id, name) => ({ id: id == null ? null : `${PREFIX.player}${id}`, name: name ?? null });
const norm = (v) => String(v ?? '').trim().toLowerCase();

function get(path, ttlSeconds, query) {
  return rapidGet({
    provider: 'live1',
    host: HOST(),
    path: `${BASE}/${path}`,
    query,
    ttlSeconds,
    budget: { period: 'month', limit: Number(process.env.RAPIDAPI_LIVE1_MONTHLY_BUDGET || 100) },
  });
}

/** Season / tournament ids this app already uses → live1 series ids. Only PSL 2026 exists upstream. */
function seriesMap() {
  let extra = {};
  try {
    extra = JSON.parse(process.env.LIVE1_SERIES_MAP || '{}');
  } catch {
    /* ignore a malformed override */
  }
  return {
    'sr:season:140552': 'sx_hCVTIvl',
    'sr:tournament:14931': 'sx_hCVTIvl',
    ...extra,
  };
}

function seriesFor(id) {
  const series = seriesMap()[id];
  if (!series) throw new ProviderUnsupportedError(`live1 has no series for ${id} (set LIVE1_SERIES_MAP)`);
  return series;
}

// ---------------------------------------------------------------- timeline

const int = (v) => {
  const n = parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : 0;
};

/** live1 ball `type` → the extra the web reads from `bowling_params.extra_runs_type`. */
export function extraOf(type) {
  const t = String(type ?? '').toUpperCase();
  if (t === 'WD') return 'wide';
  if (/NB$/.test(t)) return 'no_ball';
  if (t === 'LB') return 'leg_bye';
  if (t === 'B') return 'bye';
  return null;
}

export function dismissalType(text) {
  const t = String(text ?? '').toLowerCase();
  if (/run out/.test(t)) return 'run_out';
  if (/stumped/.test(t)) return 'stumped';
  if (/lbw/.test(t)) return 'lbw';
  if (/hit wicket/.test(t)) return 'hit_wicket';
  if (/caught/.test(t)) return 'caught';
  if (/bowled/.test(t)) return 'bowled';
  return 'wicket';
}

/**
 * Commentary entries → a SportsRadar-style timeline.
 *
 * The feed mixes record kinds: `ball` (every delivery), `wicketWidget` (a second record
 * that follows each wicket ball at id+1 and carries the dismissal), plus `summary`, `IS`
 * and `extra` bookkeeping. Only `ball` becomes an event; the widget is merged into its
 * ball, otherwise every wicket would be counted twice.
 *
 * `runs` is the total on the ball including extras ("1wd", "4lb", "2NB" all parse to the
 * total) — verified: per-ball runs sum exactly to the innings total.
 */
export function toTimeline(entries, matchId) {
  const list = Array.isArray(entries) ? entries : [];
  const widgets = new Map();
  for (const w of list) {
    if (w?.ballType === 'wicketWidget' && w.id != null) widgets.set(`${w.innings}|${Number(w.id) - 1}`, w);
  }
  const balls = list
    .filter((e) => e?.ballType === 'ball' && e.id != null)
    .sort((a, b) => Number(a.id) - Number(b.id));

  const totals = new Map(); // innings → { runs, wickets }
  const timeline = balls.map((e) => {
    const inning = int(e.innings);
    const t = totals.get(inning) ?? { runs: 0, wickets: 0 };
    totals.set(inning, t);
    const runs = int(e.runs);
    const extra = extraOf(e.type);
    const wicket = e.wicket === true || String(e.type).toUpperCase() === 'W';
    t.runs += runs;
    if (wicket) t.wickets += 1;
    const widget = wicket ? widgets.get(`${e.innings}|${Number(e.id)}`) : null;
    const over = String(e.over ?? '');

    const event = {
      id: e.id,
      sequence: Number(e.id),
      type: wicket ? 'wicket' : 'ball',
      inning,
      over_number: int(e.overNumber),
      ball_number: int(over.split('.')[1]) || undefined,
      display_overs: over,
      display_score: `${t.runs}/${t.wickets}`,
      runs,
      commentary: e.commentary ?? undefined,
      batting_params: { striker: playerRef(e.batsmanID, e.batsmanName) },
      bowling_params: {
        bowler: playerRef(e.bowlerID, e.bowlerName),
        ...(extra && {
          extra_runs_type: extra,
          extra_runs_conceded: extra === 'no_ball' ? 1 : runs,
        }),
      },
    };
    if (wicket) {
      event.dismissal_params = {
        dismissal_details: { type: dismissalType(widget?.commentary ?? e.commentary) },
        player: widget
          ? playerRef(widget.playerDetails?.playerID ?? widget.batsmanID, widget.dismissed ?? widget.batsmanName)
          : playerRef(e.batsmanID, e.dismissed ?? e.batsmanName),
      };
    }
    return event;
  });

  // First innings is "home", second "away": the same batting-order convention as the
  // Cricbuzz summary, so the two sources agree on which side is which.
  const last = new Map();
  for (const ev of timeline) last.set(ev.inning, ev);
  const period_scores = [...totals.entries()].map(([inning, t]) => {
    const side = inning % 2 === 1 ? 'home' : 'away';
    return {
      number: inning,
      [`${side}_score`]: t.runs,
      [`${side}_wickets`]: t.wickets,
      display_overs: last.get(inning)?.display_overs ?? 0,
    };
  });
  const latest = timeline[timeline.length - 1];

  return {
    sport_event: { id: matchId },
    sport_event_status: {
      current_inning: latest?.inning ?? null,
      display_score: latest?.display_score ?? null,
      display_overs: latest?.display_overs ?? null,
      period_scores,
    },
    timeline,
  };
}

// --------------------------------------------------------------- id mapping

const flattenSchedule = (list) => (Array.isArray(list) ? list : []).flatMap((s) => s.matches ?? []);

/** Same two teams (by short name or name), started within 36h of each other. */
function sameFixture(lv, cb) {
  const lvTeams = [lv.homeTeamShortName, lv.homeTeamName, lv.awayTeamShortName, lv.awayTeamName].map(norm);
  const has = (t) => [norm(t?.teamSName), norm(t?.teamName)].some((k) => k && lvTeams.includes(k));
  const close = Math.abs(Number(lv.startDate) - Number(cb.startDate)) < 1.5 * DAY_MS;
  return has(cb.team1) && has(cb.team2) && close;
}

async function liveMatchFor(cbId) {
  return remember(`cb2lv:${cbId}`, 30 * 86400, async () => {
    const info = await cricbuzzMatchInfo(cbId);
    for (const status of ['live', 'completed', 'upcoming']) {
      const list = await get('match/schedule', status === 'live' ? LIVE_TTL_S : STATIC_TTL_S, { status });
      const hit = flattenSchedule(list).find((m) => sameFixture(m, info));
      if (hit) return hit.matchID ?? hit.id;
    }
    return null;
  });
}

async function rawMatchId(id) {
  const s = String(id);
  if (s.startsWith(PREFIX.match)) return s.slice(PREFIX.match.length);
  if (s.startsWith('cb:match:')) {
    const mapped = await liveMatchFor(s);
    if (!mapped) throw new ProviderUnsupportedError(`live1 has no match for ${s}`);
    return mapped;
  }
  throw new ProviderUnsupportedError(`live1 cannot serve match id ${s}`);
}

export async function fetchMatchTimeline(id) {
  const raw = await rawMatchId(id);
  const entries = await get(`match/${raw}/commentary`, LIVE_TTL_S);
  return toTimeline(entries, id);
}

/** Same request as the full timeline (so it is a cache hit), filtered to entries after `since`. */
export async function fetchMatchTimelineDelta(id, since = 0) {
  const full = await fetchMatchTimeline(id);
  return { ...full, timeline: full.timeline.filter((e) => e.sequence > Number(since || 0)) };
}

// ------------------------------------------------------- standings & squads

const num = (v) => {
  const n = Number(String(v ?? '').replace('+', ''));
  return Number.isFinite(n) ? n : 0;
};

export function toStandings(table) {
  const groups = (Array.isArray(table) ? table : []).map((g, i) => ({
    id: `group:${i + 1}`,
    name: g.name ?? null,
    team_standings: (g.teams ?? []).map((t) => ({
      team: {
        id: teamId(t.teamID),
        name: t.teamName,
        abbreviation: t.teamShortName,
        logo_url: t.teamImage ?? undefined,
      },
      rank: int(t.pos),
      played: int(t.all),
      win: int(t.wins),
      loss: int(t.lost),
      draw: 0,
      no_result: int(t.noResult),
      points: num(t.points),
      net_run_rate: num(t.nrr),
      change: 0,
    })),
  }));
  return { standings: [{ type: 'total', groups }] };
}

export function toTournamentInfo(table, tournamentId) {
  const groups = (Array.isArray(table) ? table : []).map((g, i) => ({
    id: `group:${i + 1}`,
    name: g.name ?? null,
    teams: (g.teams ?? []).map((t) => ({
      id: teamId(t.teamID),
      name: t.teamName,
      abbreviation: t.teamShortName,
      logo_url: t.teamImage ?? undefined,
    })),
  }));
  return { tournament: { id: tournamentId }, groups };
}

const ROLES = { BATSMAN: 'batsman', BOWLER: 'bowler', ALL_ROUNDER: 'all_rounder', KEEPER: 'wicketkeeper' };

export function toSquad(squads, wantedTeamId) {
  const want = String(wantedTeamId).replace(PREFIX.team, '');
  const team = (squads?.squadData ?? []).find((t) => String(t.teamID) === want);
  if (!team) throw new ProviderUnsupportedError(`live1 squads have no team ${wantedTeamId}`);
  const seen = new Set();
  const players = [];
  for (const format of team.squad ?? []) {
    for (const p of format.playersArray ?? []) {
      if (seen.has(p.playerID)) continue;
      seen.add(p.playerID);
      players.push({
        id: `${PREFIX.player}${p.playerID}`,
        name: p.playerName,
        full_name: p.playerName,
        type: ROLES[p.playerRole] ?? (p.iswk ? 'wicketkeeper' : 'player'),
        avatar_url: p.playerImage ?? undefined,
      });
    }
  }
  return {
    team: { id: teamId(team.teamID), name: team.name, abbreviation: team.teamShortName, logo_url: team.teamImage ?? undefined },
    players,
  };
}

export async function fetchSeasonStandingsRaw(seasonId) {
  return toStandings(await get(`series/${seriesFor(seasonId)}/point-table`, STATIC_TTL_S));
}

export async function fetchSeasonStandings(seasonId) {
  return (await fetchSeasonStandingsRaw(seasonId)).standings;
}

/** Team list for a tournament, from the points table (the same cached request as the standings). */
export async function fetchTournamentInfo(tournamentId) {
  return toTournamentInfo(await get(`series/${seriesFor(tournamentId)}/point-table`, STATIC_TTL_S), tournamentId);
}

export async function fetchSeasonSquad(seasonId, teamId) {
  return toSquad(await get(`series/${seriesFor(seasonId)}/squads`, STATIC_TTL_S), teamId);
}
