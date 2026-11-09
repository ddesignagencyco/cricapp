import { rapidGet } from './rapidHttp.js';
import { ProviderUnsupportedError } from './errors.js';
import { PSL_SEASONS } from '../schemas.js';

/**
 * unofficial-cricbuzz (RapidAPI) → SportsRadar-shaped JSON, for reference data: the
 * tournament catalogue, PSL fixtures / standings / leaders / squads for every season,
 * and team and player images.
 *
 * It speaks Cricbuzz ids, the same id space as the live Cricbuzz Cricket hosts, so a
 * tournament, a fixture and a live match all share ids (`cb:*`). Shapes come from
 * recorded responses (test/fixtures/cricbuzzu/).
 */

const HOST = () => process.env.RAPIDAPI_CRICBUZZU_HOST || 'unofficial-cricbuzz.p.rapidapi.com';
const REF_TTL_S = () => Number(process.env.RAPIDAPI_REF_TTL_S || 86400);

const IMG = (imageId, size = '152x152') =>
  imageId ? `https://static.cricbuzz.com/a/img/v1/${size}/i1/c${imageId}/i.jpg` : undefined;

const PREFIX = { team: 'cb:team:', player: 'cb:player:', tournament: 'cb:tournament:', season: 'cb:season:', match: 'cb:match:' };
const teamId = (id) => (id == null ? null : `${PREFIX.team}${id}`);
const playerId = (id) => (id == null ? null : `${PREFIX.player}${id}`);
const CRICKET = { id: 'sr:sport:21', name: 'Cricket' };

function get(path, query, ttlSeconds = REF_TTL_S()) {
  return rapidGet({
    provider: 'cricbuzzu',
    host: HOST(),
    path,
    query,
    ttlSeconds,
    budget: { period: 'month', limit: Number(process.env.RAPIDAPI_CRICBUZZU_MONTHLY_BUDGET || 500) },
  });
}

/**
 * The app's own season / tournament ids (PSL years are `sr:season:*`, hard-wired in the
 * database and URLs) → Cricbuzz series ids. `cb:season:N` and `cb:tournament:N` map to N.
 */
function seriesMap() {
  let extra = {};
  try {
    extra = JSON.parse(process.env.CRICBUZZ_SERIES_MAP || '{}');
  } catch {
    /* ignore a malformed override */
  }
  return {
    'sr:season:114833': 7492, // PSL 2024
    'sr:season:129023': 11372, // PSL 2025
    'sr:season:140552': 11537, // PSL 2026
    'sr:tournament:14931': 11537, // PSL → latest edition
    ...extra,
  };
}

export function seriesIdFor(id) {
  const s = String(id);
  const mapped = seriesMap()[s];
  if (mapped) return Number(mapped);
  const m = s.match(/^cb:(?:season|tournament):(\d+)$/);
  if (m) return Number(m[1]);
  throw new ProviderUnsupportedError(`cricbuzzu has no series for ${s} (set CRICBUZZ_SERIES_MAP)`);
}

const titleCase = (name) =>
  name && name === name.toUpperCase()
    ? name.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase())
    : name;
const norm = (v) => String(v ?? '').trim().toLowerCase();
const iso = (ms) => (Number(ms) > 0 ? new Date(Number(ms)).toISOString() : null);

// ----------------------------------------------------------------- catalogue

const MATCH_TYPES = ['international', 'league', 'domestic', 'women'];
const CATEGORY_NAME = { international: 'International', league: 'League', domestic: 'Domestic', women: 'Women' };

/** `{ seriesMap: [{ date, series: [...] }] }` → flat series list. */
function flattenSeries(payload) {
  return (payload?.seriesMap ?? []).flatMap((g) => g.series ?? []);
}

export function toTournament(series, matchType) {
  const start = iso(series.startDt);
  const end = iso(series.endDt);
  const year = (start ?? end ?? '').slice(0, 4) || null;
  return {
    id: `${PREFIX.tournament}${series.id}`,
    name: series.name,
    type: matchType === 'league' ? 'league' : 'tournament',
    gender: matchType === 'women' ? 'women' : 'men',
    category: { id: `cb:category:${matchType}`, name: CATEGORY_NAME[matchType] },
    sport: CRICKET,
    current_season: {
      id: `${PREFIX.season}${series.id}`,
      name: series.name,
      year,
      start_date: start?.slice(0, 10) ?? null,
      end_date: end?.slice(0, 10) ?? null,
    },
  };
}

async function catalogue() {
  const years = (process.env.RAPIDAPI_CATALOGUE_YEARS || `${new Date().getFullYear()},${new Date().getFullYear() - 1}`)
    .split(',')
    .map((y) => Number(y.trim()))
    .filter(Boolean);
  const seen = new Map();
  for (const matchType of MATCH_TYPES) {
    const lists = [await get('series/list', { matchType })];
    for (const year of years) lists.push(await get('series/list-archives', { matchType, year }));
    for (const payload of lists) {
      for (const s of flattenSeries(payload)) {
        if (s?.id != null && !seen.has(s.id)) seen.set(s.id, { series: s, matchType });
      }
    }
  }
  return [...seen.values()];
}

/** Cricbuzz has no tours; the app synthesizes them from tournament categories (backfillTours). */
export async function fetchTours() {
  return { tours: [] };
}

/**
 * The app's own PSL tournament (`sr:tournament:14931`, referenced by PSL pages and as the
 * parent of its seasons) is not a Cricbuzz series, so it is added next to the catalogue.
 */
function pslTournament(entries) {
  const latest = PSL_SEASONS[PSL_SEASONS.length - 1];
  const hit = entries.find((e) => e.series.id === seriesIdFor(latest.id));
  const dates = hit ? toTournament(hit.series, hit.matchType).current_season : {};
  return {
    id: 'sr:tournament:14931',
    name: 'Pakistan Super League',
    type: 'league',
    gender: 'men',
    category: { id: 'cb:category:league', name: CATEGORY_NAME.league },
    sport: CRICKET,
    current_season: { id: latest.id, name: latest.name, year: latest.year, start_date: dates.start_date ?? null, end_date: dates.end_date ?? null },
  };
}

export async function fetchTournaments() {
  const entries = await catalogue();
  return { tournaments: [pslTournament(entries), ...entries.map(({ series, matchType }) => toTournament(series, matchType))] };
}

export async function fetchTournamentSeasons(tournamentId) {
  // The PSL has one Cricbuzz series per edition. Its seasons come from the app's own list
  // (not the catalogue, which only reaches back a year or two); dates are added when known.
  if (String(tournamentId) === 'sr:tournament:14931') {
    const entries = await catalogue();
    return {
      seasons: PSL_SEASONS.map((s) => {
        const hit = entries.find((e) => e.series.id === seriesIdFor(s.id));
        const dates = hit ? toTournament(hit.series, hit.matchType).current_season : {};
        return { id: s.id, name: s.name, year: s.year, start_date: dates.start_date ?? null, end_date: dates.end_date ?? null };
      }),
    };
  }
  const id = seriesIdFor(tournamentId);
  const hit = (await catalogue()).find((e) => e.series.id === id);
  return { seasons: hit ? [toTournament(hit.series, hit.matchType).current_season] : [] };
}

// ------------------------------------------------------------------- matches

const flattenMatches = (payload) =>
  (payload?.adWrapper ?? []).flatMap((w) => w.matchDetails?.matches ?? []).filter((m) => m?.matchInfo);

const seriesMatches = (seriesId) => get('series/get-matches', { seriesId }).then(flattenMatches);

/** League-stage fixtures only ("1st Match" …), i.e. what a points table counts. */
const isLeagueMatch = (info) => /^\d+(st|nd|rd|th) match$/i.test(String(info.matchDesc ?? '').trim());
const isFinished = (info) => String(info.state ?? '').toLowerCase() === 'complete';

function competitor(team, qualifier) {
  return {
    id: teamId(team.teamId),
    name: titleCase(team.teamName),
    abbreviation: team.teamSName,
    qualifier,
    logo_url: IMG(team.imageId),
  };
}

export function toSportEvent(entry, seasonId) {
  const info = entry.matchInfo;
  const finished = isFinished(info);
  return {
    id: `${PREFIX.match}${info.matchId}`,
    scheduled: iso(info.startDate),
    status: finished ? 'closed' : /progress|live/i.test(info.state ?? '') ? 'live' : 'not_started',
    // normalize.js reads the result text from here for closed events
    match_status: finished ? info.status : null,
    tournament: { id: `${PREFIX.tournament}${info.seriesId}`, name: info.seriesName },
    tournament_round: { name: info.matchDesc ?? null },
    season: { id: seasonId ?? `${PREFIX.season}${info.seriesId}` },
    venue: { name: info.venueInfo?.ground ?? null },
    competitors: [competitor(info.team1, 'home'), competitor(info.team2, 'away')],
  };
}

export async function fetchSeasonSchedule(seasonId) {
  const sid = seriesIdFor(seasonId);
  return (await seriesMatches(sid)).map((m) => toSportEvent(m, seasonId));
}

/** Results in SportsRadar's `{ results: [{ sport_event, sport_event_status }] }` shape. */
export async function fetchTournamentResults(tournamentOrSeasonId) {
  const sid = seriesIdFor(tournamentOrSeasonId);
  const done = (await seriesMatches(sid)).filter((m) => isFinished(m.matchInfo));
  return {
    results: done.map((m) => ({
      sport_event: toSportEvent(m, tournamentOrSeasonId),
      sport_event_status: { status: 'closed', match_status: 'ended', match_result_text: m.matchInfo.status ?? null },
    })),
  };
}

export async function fetchTournamentInfo(tournamentId) {
  const sid = seriesIdFor(tournamentId);
  const teams = new Map();
  for (const { matchInfo } of await seriesMatches(sid)) {
    for (const t of [matchInfo.team1, matchInfo.team2]) {
      if (t?.teamId != null && !teams.has(t.teamId)) {
        teams.set(t.teamId, { id: teamId(t.teamId), name: titleCase(t.teamName), abbreviation: t.teamSName, logo_url: IMG(t.imageId) });
      }
    }
  }
  return { tournament: { id: tournamentId }, groups: [{ id: 'group:1', name: 'Teams', teams: [...teams.values()] }] };
}

// ----------------------------------------------------------------- standings

const num = (v) => {
  const n = Number(String(v ?? '').replace('+', ''));
  return Number.isFinite(n) ? n : 0;
};

/** Cricket-notation overs (14.3) → balls. */
const oversToBalls = (o) => {
  const n = Number(o);
  if (!Number.isFinite(n)) return 0;
  const whole = Math.floor(n);
  return whole * 6 + Math.round((n - whole) * 10);
};

/**
 * Standings computed from league-stage results, for seasons where the upstream points
 * table is empty. Win = 2 points, no result = 1 each. Net run rate follows the usual rule
 * (a side bowled out is charged its full quota of overs); rain-reduced games are not
 * adjusted, so treat NRR as approximate. Verified against the official 2024 and 2026 tables.
 */
export function deriveStandings(matches, maxOvers = 20) {
  const rows = new Map();
  const row = (t) => {
    if (!rows.has(t.teamId)) {
      rows.set(t.teamId, {
        team: t, played: 0, win: 0, loss: 0, no_result: 0, points: 0, rf: 0, bf: 0, ra: 0, ba: 0,
      });
    }
    return rows.get(t.teamId);
  };
  for (const { matchInfo: info, matchScore } of matches) {
    if (!isLeagueMatch(info) || !isFinished(info)) continue;
    const a = row(info.team1);
    const b = row(info.team2);
    a.played += 1;
    b.played += 1;
    const text = norm(info.status);
    const winner = [info.team1, info.team2].find((t) => text.startsWith(norm(titleCase(t.teamName))) && /won/.test(text));
    if (winner) {
      const w = winner.teamId === info.team1.teamId ? a : b;
      const l = w === a ? b : a;
      w.win += 1;
      w.points += 2;
      l.loss += 1;
    } else {
      a.no_result += 1;
      b.no_result += 1;
      a.points += 1;
      b.points += 1;
      continue; // an abandoned game contributes no runs or overs
    }
    for (const [own, ownScore, oppScore] of [
      [a, matchScore?.team1Score?.inngs1, matchScore?.team2Score?.inngs1],
      [b, matchScore?.team2Score?.inngs1, matchScore?.team1Score?.inngs1],
    ]) {
      if (!ownScore || !oppScore) continue;
      const ownBalls = Number(ownScore.wickets) >= 10 ? maxOvers * 6 : oversToBalls(ownScore.overs);
      const oppBalls = Number(oppScore.wickets) >= 10 ? maxOvers * 6 : oversToBalls(oppScore.overs);
      own.rf += Number(ownScore.runs) || 0;
      own.bf += ownBalls;
      own.ra += Number(oppScore.runs) || 0;
      own.ba += oppBalls;
    }
  }
  return [...rows.values()]
    .map((r) => ({
      ...r,
      nrr: r.bf && r.ba ? (r.rf / (r.bf / 6)) - (r.ra / (r.ba / 6)) : 0,
    }))
    .sort((x, y) => y.points - x.points || y.nrr - x.nrr);
}

function standingsEnvelope(rows, { derived }) {
  return {
    derived,
    standings: [
      {
        type: 'total',
        groups: [
          {
            id: 'group:1',
            name: null,
            team_standings: rows.map((r, i) => ({
              team: r.team,
              rank: i + 1,
              played: r.played,
              win: r.win,
              loss: r.loss,
              draw: 0,
              no_result: r.no_result,
              points: r.points,
              net_run_rate: Number(r.nrr.toFixed(3)),
              change: 0,
            })),
          },
        ],
      },
    ],
  };
}

export async function fetchSeasonStandingsRaw(seasonId) {
  const sid = seriesIdFor(seasonId);
  const [table, matches] = await Promise.all([get('series/get-points-table', { seriesId: sid }), seriesMatches(sid)]);
  const infos = new Map();
  for (const { matchInfo } of matches) for (const t of [matchInfo.team1, matchInfo.team2]) infos.set(t.teamId, t);
  const asTeam = (t) => ({ id: teamId(t.teamId), name: titleCase(t.teamName), abbreviation: t.teamSName, logo_url: IMG(t.imageId) });

  const official = (table?.pointsTable ?? []).flatMap((g) => g.pointsTableInfo ?? []);
  if (official.length) {
    const rows = official
      .map((p) => ({
        team: asTeam(infos.get(p.teamId) ?? { teamId: p.teamId, teamName: p.teamName, teamSName: p.teamName }),
        played: p.matchesPlayed ?? 0,
        win: p.matchesWon ?? 0,
        loss: p.matchesLost ?? 0,
        no_result: p.noRes ?? 0,
        points: p.points ?? 0,
        nrr: num(p.nrr),
      }))
      .sort((x, y) => y.points - x.points || y.nrr - x.nrr);
    return standingsEnvelope(rows, { derived: false });
  }
  const rows = deriveStandings(matches).map((r) => ({ ...r, team: asTeam(r.team) }));
  if (!rows.length) throw new ProviderUnsupportedError(`cricbuzzu has no standings for ${seasonId}`);
  return standingsEnvelope(rows, { derived: true });
}

export async function fetchSeasonStandings(seasonId) {
  return (await fetchSeasonStandingsRaw(seasonId)).standings;
}

// ------------------------------------------------------------------- leaders

/** statsType → [SportsRadar list, header holding the value, field name psl.js reads]. */
const LEADER_SPECS = {
  mostRuns: ['batting', 'top_runs', 'R', 'total'],
  highestScore: ['batting', 'highest_score', 'HS', 'total'],
  highestAvg: ['batting', 'top_average', 'Avg', 'average'],
  highestSr: ['batting', 'top_strike_rate', 'SR', 'rate'],
  mostFifties: ['batting', 'top_fifties', '50s', 'total'],
  mostHundreds: ['batting', 'top_hundreds', '100s', 'total'],
  mostFours: ['batting', 'top_fours', '4s', 'total'],
  mostSixes: ['batting', 'top_sixes', '6s', 'total'],
  mostWickets: ['bowling', 'top_wickets', 'W', 'total'],
  lowestEcon: ['bowling', 'top_economy', 'Eco', 'rate'],
  lowestAvg: ['bowling', 'top_bowling_average', 'Avg', 'average'],
};

export function toLeaderList(stats, valueHeader, field) {
  const block = stats?.t20Stats?.[0] ?? Object.values(stats ?? {}).find(Array.isArray)?.[0];
  const headers = block?.headers ?? [];
  const col = headers.indexOf(valueHeader) + 1; // values[0] is the player id; headers start at the name
  if (!col) return [];
  return (block.values ?? []).map((v, i) => {
    const cells = v.values ?? [];
    return {
      rank: i + 1,
      player: { id: playerId(cells[0]), full_name: cells[1], name: cells[1] },
      [field]: num(cells[col]),
    };
  });
}

export async function fetchSeasonLeaders(seasonId) {
  const sid = seriesIdFor(seasonId);
  const out = { batting: {}, bowling: {}, fielding: {} };
  for (const [statsType, [group, key, header, field]] of Object.entries(LEADER_SPECS)) {
    const stats = await get('series/get-stats', { seriesId: sid, statsType });
    out[group][key] = toLeaderList(stats, header, field);
  }
  return out;
}

// -------------------------------------------------------------------- squads

const ROLE = (role) => {
  const r = norm(role);
  if (/wk|keeper/.test(r)) return 'wicketkeeper';
  if (/all/.test(r)) return 'all_rounder';
  if (/bowl/.test(r)) return 'bowler';
  if (/bat/.test(r)) return 'batsman';
  return 'player';
}; 

export function toSquadPlayers(payload) {
  return (payload?.player ?? [])
    .filter((p) => p && !p.isHeader && p.id)
    .map((p) => ({
      id: playerId(p.id),
      name: p.name,
      full_name: p.name,
      type: ROLE(p.role),
      batting_style: p.battingStyle ?? null,
      bowling_style: p.bowlingStyle ?? null,
      avatar_url: IMG(p.imageId),
    }));
}

/** Squad lists name teams inconsistently ("Karachi Kings" in 2025, "Karachi Kings Squad" in 2024). */
export const squadNameKey = (name) => norm(name).replace(/\s+squad$/, '');

export async function fetchSeasonSquad(seasonId, wantedTeamId) {
  const sid = seriesIdFor(seasonId);
  const want = String(wantedTeamId).replace(PREFIX.team, '');
  // squads are listed by team name; the id → name link comes from the fixtures
  const teams = (await fetchTournamentInfo(seasonId)).groups[0].teams;
  const team = teams.find((t) => t.id === `${PREFIX.team}${want}`);
  if (!team) throw new ProviderUnsupportedError(`cricbuzzu: team ${wantedTeamId} not in ${seasonId}`);
  const list = await get('series/get-squads', { seriesId: sid });
  const squad = (list?.squadAnnouncedList ?? []).find((s) => s.squadId && squadNameKey(s.squadType) === squadNameKey(team.name));
  if (!squad) throw new ProviderUnsupportedError(`cricbuzzu: no squad for ${team.name} in ${seasonId}`);
  const players = await get('series/get-players', { seriesId: sid, squadId: squad.squadId });
  return { team, players: toSquadPlayers(players) };
}
