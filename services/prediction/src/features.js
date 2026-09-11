import { redisKeys, PSL } from '@cricapp/shared-types';

export function detectFormat(tournament, matchStatus) {
  const text = `${tournament ?? ''} ${matchStatus ?? ''}`.toLowerCase();
  if (/\btest\b/.test(text)) return 'test';
  if (/\bodi\b|one.?day/.test(text)) return 'odi';
  if (/\bt20\b|twenty|psl|ipl|bbl|cpl|hundred|super league/.test(text)) return 't20';
  return 'unknown';
}

export function allottedBallsForFormat(format) {
  if (format === 'odi') return 300;
  if (format === 'test') return 540;
  return 120;
}

export function parScoreForFormat(format) {
  if (format === 'odi') return 270;
  if (format === 'test') return 320;
  return 160;
}

export function extractWinnerId(payload, teamIds = []) {
  const event = payload?.sport_event ?? payload ?? {};
  const status = payload?.sport_event_status ?? event.sport_event_status ?? {};
  const winner =
    status.winner_id ??
    payload?.winner_id ??
    event.winner_id ??
    null;
  if (winner) return winner;
  const resultText = `${status.match_result_text ?? status.result ?? ''}`.toLowerCase();
  for (const id of teamIds) {
    if (id && resultText.includes(String(id).toLowerCase())) return id;
  }
  return null;
}

export function meetingsFromHeadToHead(payload) {
  if (!payload || typeof payload !== 'object') return [];
  const candidates = [
    payload.last_meetings?.results,
    payload.last_meetings?.sport_events,
    payload.last_meetings,
    payload.last_matches,
    payload.sport_events,
    payload.results,
  ];
  for (const c of candidates) {
    if (Array.isArray(c) && c.some((x) => x && typeof x === 'object')) return c;
  }
  return [];
}

function asList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function competitorsFromPayload(payload) {
  const event = payload?.sport_event ?? payload ?? {};
  return Array.isArray(event.competitors) ? event.competitors : [];
}

function conditionsFromPayload(payload) {
  const event = payload?.sport_event ?? payload ?? {};
  const conditions = payload?.sport_event_conditions ?? event.sport_event_conditions ?? null;
  if (!conditions) return null;
  return {
    pitch: conditions.pitch_info ?? null,
    weather: conditions.weather_info ?? null,
    dayNight: conditions.day_night ?? null,
    venue: event.venue ?? payload?.venue ?? null,
  };
}

function sportEventStatus(payload) {
  const event = payload?.sport_event ?? payload ?? {};
  return payload?.sport_event_status ?? event.sport_event_status ?? {};
}

function weightedForm(results, teamId) {
  let weightSum = 0;
  let winWeight = 0;
  let n = 0;
  results.forEach((row, index) => {
    const winner = extractWinnerId(row.payload, [teamId]);
    if (!winner) return;
    const ageWeight = 0.5 ** index;
    weightSum += ageWeight;
    n += 1;
    if (winner === teamId) winWeight += ageWeight;
  });
  return {
    rate: weightSum > 0 ? winWeight / weightSum : 0.5,
    n,
  };
}

function h2hEdge(meetings, homeId, awayId) {
  const recent = meetings.slice(0, 10);
  let homeWins = 0;
  let awayWins = 0;
  let n = 0;
  for (const meeting of recent) {
    const winner = extractWinnerId(meeting, [homeId, awayId]);
    if (!winner) continue;
    n += 1;
    if (winner === homeId) homeWins += 1;
    else if (winner === awayId) awayWins += 1;
  }
  const denom = homeWins + awayWins;
  return {
    edge: denom > 0 ? (homeWins - awayWins) / denom : 0,
    meetings: n,
    homeWins,
    awayWins,
  };
}

function venueHints(team) {
  return [...new Set(
    [team?.name, team?.country, team?.abbr]
      .filter(Boolean)
      .flatMap((s) => [String(s), ...String(s).split(/\s+/)])
      .map((s) => s.toLowerCase())
      .filter((s) => s.length >= 4),
  )];
}

function venueEdge({ venue, home, away }) {
  if (!venue) return 0;
  const v = venue.toLowerCase();
  const homeHit = venueHints(home).some((h) => v.includes(h));
  const awayHit = venueHints(away).some((h) => v.includes(h));
  if (homeHit && !awayHit) return 1;
  if (awayHit && !homeHit) return -1;
  return 0;
}

async function loadMatch(query, matchId) {
  const r = await query(
    `SELECT match_id, status, teams, team_names, tournament, venue, scheduled,
            current_innings, last_event, display_score, match_status
     FROM matches WHERE match_id = $1`,
    [matchId],
  );
  return r.rows[0] ?? null;
}

async function loadEventPayload(query, matchId) {
  const r = await query(
    `SELECT payload FROM sport_event_records
     WHERE event_id = $1
     ORDER BY updated_at DESC
     LIMIT 1`,
    [matchId],
  );
  return r.rows[0]?.payload ?? null;
}

async function resolveTeams(query, match, eventPayload) {
  const names = asList(match.team_names);
  const labels = asList(match.teams);
  const comps = competitorsFromPayload(eventPayload);
  const homeComp = comps.find((c) => c.qualifier === 'home') ?? comps[0] ?? null;
  const awayComp = comps.find((c) => c.qualifier === 'away') ?? comps[1] ?? null;

  let homeId = homeComp?.id ?? (typeof labels[0] === 'string' && labels[0].startsWith('sr:') ? labels[0] : null);
  let awayId = awayComp?.id ?? (typeof labels[1] === 'string' && labels[1].startsWith('sr:') ? labels[1] : null);

  const lookup = [...new Set([homeId, awayId, ...labels, ...names].filter(Boolean))];
  let rows = { rows: [] };
  if (lookup.length > 0) {
    rows = await query(
      `SELECT id, name, abbr, country FROM teams
       WHERE id = ANY($1::text[]) OR abbr = ANY($1::text[]) OR name = ANY($1::text[])`,
      [lookup],
    );
  }

  const byId = new Map(rows.rows.map((t) => [t.id, t]));
  const byAbbr = new Map(rows.rows.map((t) => [t.abbr, t]));
  const byName = new Map(rows.rows.map((t) => [t.name, t]));

  function pick(id, label, name) {
    return byId.get(id) ?? byAbbr.get(label) ?? byName.get(name) ?? null;
  }

  const home = pick(homeId, labels[0], names[0] ?? homeComp?.name);
  const away = pick(awayId, labels[1], names[1] ?? awayComp?.name);
  return {
    homeTeamId: home?.id ?? homeId,
    awayTeamId: away?.id ?? awayId,
    homeName: home?.name ?? names[0] ?? homeComp?.name ?? labels[0] ?? null,
    awayName: away?.name ?? names[1] ?? awayComp?.name ?? labels[1] ?? null,
    home,
    away,
  };
}

async function loadTeamResults(query, teamId) {
  if (!teamId) return [];
  const r = await query(
    `SELECT event_id, status, scheduled, payload
     FROM sport_event_records
     WHERE kind = 'team_results' AND scope_key = $1
     ORDER BY scheduled DESC NULLS LAST
     LIMIT 8`,
    [teamId],
  );
  return r.rows;
}

async function loadHeadToHead(query, a, b) {
  if (!a || !b) return null;
  const [teamAId, teamBId] = [a, b].sort();
  const r = await query(
    `SELECT payload FROM head_to_head WHERE team_a_id = $1 AND team_b_id = $2`,
    [teamAId, teamBId],
  );
  return r.rows[0]?.payload ?? null;
}

async function loadStandings(query, homeId, awayId) {
  if (!homeId || !awayId) return { used: false };
  const preferred = PSL.DEFAULT_SEASON_ID;
  const r = await query(
    `SELECT season_id, team_id, points, net_run_rate
     FROM psl_standings
     WHERE team_id IN ($1, $2)
     ORDER BY CASE WHEN season_id = $3 THEN 0 ELSE 1 END, season_id DESC`,
    [homeId, awayId, preferred],
  );
  if (r.rows.length < 2) return { used: false };
  const seasons = new Map();
  for (const row of r.rows) {
    if (!seasons.has(row.season_id)) seasons.set(row.season_id, {});
    seasons.get(row.season_id)[row.team_id] = row;
  }
  for (const [seasonId, byTeam] of seasons) {
    if (byTeam[homeId] && byTeam[awayId]) {
      const home = byTeam[homeId];
      const away = byTeam[awayId];
      const pointsEdge = (home.points - away.points) / 14;
      const nrrEdge = (home.net_run_rate - away.net_run_rate) / 2;
      return {
        used: true,
        seasonId,
        homePoints: home.points,
        awayPoints: away.points,
        homeNrr: home.net_run_rate,
        awayNrr: away.net_run_rate,
        edge: 0.7 * pointsEdge + 0.3 * nrrEdge,
      };
    }
  }
  return { used: false };
}

async function loadSquadSize(query, teamId) {
  if (!teamId) return 0;
  const r = await query(`SELECT COUNT(*)::int AS n FROM players WHERE team_id = $1`, [teamId]);
  return r.rows[0]?.n ?? 0;
}

async function loadTeamProfile(query, teamId) {
  if (!teamId) return null;
  const r = await query(
    `SELECT manager, team_info FROM team_profiles WHERE team_id = $1`,
    [teamId],
  );
  return r.rows[0] ?? null;
}

async function loadLiveState(redis, matchId) {
  if (!redis) return null;
  const raw = await redis.get(redisKeys.matchState(matchId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function loadTimeline(query, matchId) {
  const r = await query(
    `SELECT payload FROM match_timelines WHERE match_id = $1`,
    [matchId],
  );
  return r.rows[0]?.payload ?? null;
}

export async function listUpcomingMatchIds(query, { horizonHours = 48 } = {}) {
  const r = await query(
    `SELECT match_id, scheduled FROM matches WHERE status = 'upcoming'`,
  );
  const now = Date.now();
  const horizon = now + horizonHours * 60 * 60 * 1000;
  return r.rows
    .filter((row) => {
      if (!row.scheduled) return true;
      const ts = Date.parse(row.scheduled);
      if (Number.isNaN(ts)) return true;
      return ts >= now && ts <= horizon;
    })
    .map((row) => row.match_id);
}

export async function extractPrematchFeatures(matchId, { query, redis }) {
  const match = await loadMatch(query, matchId);
  if (!match) return null;
  const eventPayload = await loadEventPayload(query, matchId);
  const teams = await resolveTeams(query, match, eventPayload);
  const [homeResults, awayResults, h2hPayload, table, homeSquad, awaySquad, homeProfile, awayProfile] =
    await Promise.all([
      loadTeamResults(query, teams.homeTeamId),
      loadTeamResults(query, teams.awayTeamId),
      loadHeadToHead(query, teams.homeTeamId, teams.awayTeamId),
      loadStandings(query, teams.homeTeamId, teams.awayTeamId),
      loadSquadSize(query, teams.homeTeamId),
      loadSquadSize(query, teams.awayTeamId),
      loadTeamProfile(query, teams.homeTeamId),
      loadTeamProfile(query, teams.awayTeamId),
    ]);

  const homeForm = weightedForm(homeResults, teams.homeTeamId);
  const awayForm = weightedForm(awayResults, teams.awayTeamId);
  const h2h = h2hEdge(meetingsFromHeadToHead(h2hPayload), teams.homeTeamId, teams.awayTeamId);
  const status = sportEventStatus(eventPayload);
  const tossWonBy = status.toss_won_by ?? null;
  let tossEdge = 0;
  if (tossWonBy && tossWonBy === teams.homeTeamId) tossEdge = 1;
  else if (tossWonBy && tossWonBy === teams.awayTeamId) tossEdge = -1;

  const homeForVenue = {
    name: teams.homeName,
    abbr: teams.home?.abbr,
    country: teams.home?.country ?? homeProfile?.team_info?.country ?? homeProfile?.team_info?.country_code,
  };
  const awayForVenue = {
    name: teams.awayName,
    abbr: teams.away?.abbr,
    country: teams.away?.country ?? awayProfile?.team_info?.country ?? awayProfile?.team_info?.country_code,
  };

  void redis;

  return {
    matchId,
    homeTeamId: teams.homeTeamId,
    awayTeamId: teams.awayTeamId,
    homeName: teams.homeName,
    awayName: teams.awayName,
    venue: match.venue ?? null,
    tournament: match.tournament ?? null,
    scheduled: match.scheduled ?? null,
    format: detectFormat(match.tournament, match.match_status),
    form: {
      home: homeForm.rate,
      away: awayForm.rate,
      homeN: homeForm.n,
      awayN: awayForm.n,
    },
    h2h,
    table,
    venueEdge: venueEdge({ venue: match.venue, home: homeForVenue, away: awayForVenue }),
    toss: {
      wonBy: tossWonBy,
      decision: status.toss_decision ?? null,
      edge: tossEdge,
    },
    squad: { homeSize: homeSquad, awaySize: awaySquad },
    conditions: conditionsFromPayload(eventPayload),
  };
}

export async function extractLiveFeatures(matchId, { query, redis }) {
  const match = await loadMatch(query, matchId);
  if (!match) return null;
  const [eventPayload, liveState, timeline] = await Promise.all([
    loadEventPayload(query, matchId),
    loadLiveState(redis, matchId),
    loadTimeline(query, matchId),
  ]);
  const teams = await resolveTeams(query, match, eventPayload);
  const canonical = liveState ?? {
    matchId: match.match_id,
    status: match.status,
    teams: asList(match.teams),
    teamNames: asList(match.team_names),
    tournament: match.tournament,
    venue: match.venue,
    scheduled: match.scheduled,
    currentInnings: match.current_innings,
    lastEvent: match.last_event,
    displayScore: match.display_score,
    matchStatus: match.match_status,
  };

  const status = {
    ...sportEventStatus(eventPayload),
    ...sportEventStatus(timeline),
  };
  const innings = canonical.currentInnings ?? null;
  const format = detectFormat(canonical.tournament ?? match.tournament, canonical.matchStatus ?? match.match_status);
  const allottedOvers = status.allotted_overs || (format === 'odi' ? 50 : format === 'test' ? 90 : 20);
  const currentInning = Number(status.current_inning ?? (String(canonical.matchStatus ?? '').includes('2') ? 2 : 1));
  const target = Number(status.target ?? 0) || null;

  return {
    matchId,
    homeTeamId: teams.homeTeamId,
    awayTeamId: teams.awayTeamId,
    homeName: teams.homeName,
    awayName: teams.awayName,
    venue: canonical.venue ?? match.venue,
    tournament: canonical.tournament ?? match.tournament,
    format,
    status: canonical.status,
    currentInnings: innings,
    lastEvent: canonical.lastEvent ?? match.last_event ?? { type: 'none', runs: 0, over: 0 },
    displayScore: canonical.displayScore ?? match.display_score,
    matchStatus: canonical.matchStatus ?? match.match_status,
    currentInning: Number.isFinite(currentInning) && currentInning > 0 ? currentInning : 1,
    allottedOvers,
    allottedBalls: allottedBallsForFormat(format),
    remainingOvers: status.remaining_overs ?? null,
    requiredRunRate: status.required_run_rate ?? status.run_rate_required ?? null,
    target,
    runRate: innings?.runRate ?? status.run_rate ?? null,
    conditions: conditionsFromPayload(timeline) ?? conditionsFromPayload(eventPayload),
  };
}
