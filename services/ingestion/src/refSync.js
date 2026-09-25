/**
 * Sync for the extended Sportradar reference/statistics endpoints that the
 * read API serves (daily schedule/results, timelines, profiles, head-to-head,
 * tours, tournaments, tournament results).
 */
import {
  fetchDailySchedule,
  fetchDailyResults,
  fetchMatchTimeline,
  fetchPlayerProfile,
  fetchTeamProfile,
  fetchTeamResults,
  fetchTeamSchedule,
  fetchTeamVersusTeam,
  fetchTours,
  fetchTournaments,
  fetchTournamentResults,
  fetchTournamentSeasons,
  fetchTournamentInfo,
  fetchMatchLineups,
  fetchMatchSummary,
} from './sportradar.js';
import { normalizeLineups } from './normalize.js';
import {
  normalizeDailySchedule,
  normalizeDailyResults,
  normalizeTeamSchedule,
  normalizeTeamResults,
  normalizeTournamentResults,
  normalizeMatchTimeline,
  normalizeHeadToHead,
  normalizeTeamProfile,
  normalizePlayerProfile,
  normalizeTours,
  normalizeTournaments,
  normalizeTournamentSeasons,
} from './reference.js';
import {
  saveTours,
  saveTournaments,
  backfillTours,
  saveSportEventRecords,
  saveMatchTimeline,
  saveMatchLineup,
  saveMatchSummary,
  saveHeadToHead,
  saveTeamProfile,
  savePlayerProfile,
  saveTeamsPlayers,
  saveTournamentSeasons,
  saveTournamentInfo,
  listActiveSeasonIds,
  listActiveTournamentIds,
  listEventIdsWithoutTimeline,
  listLiveMatchIds,
  listEventIdsWithoutMatchSummary,
  listHeadToHeadPairs,
  listUpcomingHeadToHeadPairs,
  listTeamsWithoutSync,
  materializeTeamEvents,
  listMatchesForRosterlessTeams,
  listPlayerIdsNeedingProfile,
  backfillTeamFieldsFromProfiles,
  backfillTeamFieldsFromLineups,
  backfillTeamManagersFromPlayers,
  backfillPlayerFieldsFromLineups,
  backfillPlayerFieldsFromProfiles,
} from './store.js';
import { createLogger } from './logger.js';
import { shouldSync, markSynced, clearSyncStamp, REF_CADENCE } from './refState.js';
import { PSL } from './schemas.js';
import { getCallStats } from './sportradar.js';
import redis, { redisKeys } from './redis.js';

const log = createLogger('ref');
const warn = log.warn;

function nonNegativeEnvNumber(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

const REFERENCE_SYNC_INTERVAL_MS = nonNegativeEnvNumber(
  'REFERENCE_SYNC_INTERVAL_MS',
  3600000,
);
const REFERENCE_SYNC_PAST_DAYS = nonNegativeEnvNumber('REFERENCE_SYNC_PAST_DAYS', 2);
const REFERENCE_SYNC_FUTURE_DAYS = nonNegativeEnvNumber('REFERENCE_SYNC_FUTURE_DAYS', 30);
const PAUSE_REF_WHEN_LIVE =
  String(process.env.PAUSE_REF_SYNC_WHEN_LIVE || 'true').toLowerCase() !== 'false';

async function liveMatchCount() {
  try {
    return await redis.scard(redisKeys.liveMatches());
  } catch {
    return 0;
  }
}

function isoDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function pad(n) {
  return String(n).padStart(2, '0');
}

export async function syncTourList() {
  const raw = await fetchTours();
  const rows = normalizeTours(raw);
  const count = await saveTours(rows);
  log.info(`tours synced (${count})`);
  return count;
}

export async function syncTournamentList() {
  const raw = await fetchTournaments();
  const rows = normalizeTournaments(raw);
  const count = await saveTournaments(rows);
  log.info(`tournaments synced (${count})`);
  return count;
}

/**
 * Tours + tournaments catalog for the API / UI. Sportradar returns no rows in
 * tours.json on our plan; `backfillTours()` synthesizes tours from tournament categories.
 */
export async function syncTourCatalog({ force = false } = {}) {
  if (force) {
    await clearSyncStamp('tours', null);
    await clearSyncStamp('tournaments', null);
  }
  await syncTourList();
  const tournamentCount = await syncTournamentList();
  const tourCount = await backfillTours();
  log.info('tour catalog complete', { tournaments: tournamentCount, toursFromCategories: tourCount });
  if (force) {
    await clearSyncStamp('tournamentSeasons', PSL.TOURNAMENT_ID);
    await clearSyncStamp('tournamentInfo', PSL.TOURNAMENT_ID);
  }
  await syncTournamentSeasonsFor(PSL.TOURNAMENT_ID);
  await syncTournamentInfoFor(PSL.TOURNAMENT_ID);
  return { tournaments: tournamentCount, toursFromCategories: tourCount };
}

export async function syncTournamentSeasonsFor(tournamentId) {
  const raw = await fetchTournamentSeasons(tournamentId);
  const rows = normalizeTournamentSeasons(tournamentId, raw);
  const count = await saveTournamentSeasons(rows);
  log.info(`tournament ${tournamentId}: ${count} seasons`);
  return count;
}

/**
 * tournaments/{id}/info.json → store tournament groups (team lists) on the
 * tournament row and flatten the teams into the teams table. This is what
 * supplies the app's full tournament + teams shape (e.g. all IPL franchises)
 * instead of the thin tournament-list metadata.
 */
export async function syncTournamentInfoFor(tournamentId) {
  const raw = await fetchTournamentInfo(tournamentId);
  const teamCount = await saveTournamentInfo(tournamentId, raw);
  log.info(`tournament ${tournamentId}: ${teamCount} teams + groups stored`);
  return teamCount;
}

/**
 * Backfill daily schedule + results for each day in [daysBack .. today].
 * Ignores Redis staleness — use for one-time / manual fills.
 */
export async function syncDailyRange({ daysBack = 30, delayMs = 500 } = {}) {
  let totalSchedule = 0;
  let totalResults = 0;
  for (let i = daysBack; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = isoDate(d);
    const { scheduleCount, resultCount } = await syncDaily({ date });
    totalSchedule += scheduleCount;
    totalResults += resultCount;
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  }
  log.info(`daily range (${daysBack}d): ${totalSchedule} scheduled, ${totalResults} results`);
  return { totalSchedule, totalResults };
}

/**
 * Fetch full Sportradar timelines until the queue is empty or maxCalls is hit.
 */
export async function backfillTimelines({ batchSize = 40, maxCalls = 500, delayMs = 1100 } = {}) {
  let synced = 0;
  while (synced < maxCalls) {
    const ids = await listEventIdsWithoutTimeline({
      limit: Math.min(batchSize, maxCalls - synced),
    });
    if (!ids.length) break;
    for (const id of ids) {
      if (synced >= maxCalls) break;
      try {
        await syncMatchTimeline(id);
        await markSynced('timeline', id, REF_CADENCE.timeline);
        synced += 1;
      } catch (err) {
        warn(`timeline backfill failed for ${id}: ${err.message}`);
      }
      if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  log.info(`timeline backfill: synced ${synced} match(es)`);
  return synced;
}

function teamPairs(teamIds) {
  const pairs = [];
  const uniq = [...new Set(teamIds.filter(Boolean))];
  for (let i = 0; i < uniq.length; i += 1) {
    for (let j = i + 1; j < uniq.length; j += 1) {
      pairs.push([uniq[i], uniq[j]]);
    }
  }
  return pairs;
}

/**
 * Head-to-head for all team pairs (e.g. PSL franchises). Ignores staleness.
 */
export async function backfillHeadToHead({ teamIds, delayMs = 1100 } = {}) {
  const pairs = teamPairs(teamIds);
  let synced = 0;
  for (const [a, b] of pairs) {
    try {
      await syncHeadToHead(a, b);
      await markSynced('headToHead', `${a}::${b}`, REF_CADENCE.headToHead);
      synced += 1;
    } catch (err) {
      warn(`head-to-head backfill failed for ${a} vs ${b}: ${err.message}`);
    }
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  }
  log.info(`head-to-head backfill: synced ${synced}/${pairs.length} pair(s)`);
  return synced;
}

/**
 * Full match summary JSON for events we know about but lack match_summary rows.
 */
export async function backfillMatchSummaries({
  batchSize = 40,
  maxCalls = 200,
  delayMs = 1100,
} = {}) {
  let synced = 0;
  while (synced < maxCalls) {
    const ids = await listEventIdsWithoutMatchSummary({
      limit: Math.min(batchSize, maxCalls - synced),
    });
    if (!ids.length) break;
    for (const id of ids) {
      if (synced >= maxCalls) break;
      try {
        await syncMatchSummary(id);
        await markSynced('matchSummary', id, REF_CADENCE.matchSummary);
        synced += 1;
      } catch (err) {
        warn(`match summary backfill failed for ${id}: ${err.message}`);
      }
      if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  log.info(`match summary backfill: synced ${synced} match(es)`);
  return synced;
}

/**
 * Lineups + squad rows for matches whose teams still have no players.
 */
export async function backfillLineups({ batchSize = 20, maxCalls = 100, delayMs = 1100 } = {}) {
  let synced = 0;
  while (synced < maxCalls) {
    const ids = await listMatchesForRosterlessTeams({
      limit: Math.min(batchSize, maxCalls - synced),
    });
    if (!ids.length) break;
    for (const id of ids) {
      if (synced >= maxCalls) break;
      try {
        await syncMatchLineups(id);
        await markSynced('lineups', id, REF_CADENCE.lineups);
        synced += 1;
      } catch (err) {
        warn(`lineup backfill failed for ${id}: ${err.message}`);
      }
      if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  log.info(`lineup backfill: synced ${synced} match(es)`);
  return synced;
}

/**
 * Player profiles for ids discovered from lineups / PSL leaders without a profile row.
 */
export async function backfillPlayerProfiles({
  batchSize = 25,
  maxCalls = 150,
  delayMs = 1100,
} = {}) {
  let synced = 0;
  while (synced < maxCalls) {
    const ids = await listPlayerIdsNeedingProfile({
      limit: Math.min(batchSize, maxCalls - synced),
    });
    if (!ids.length) break;
    for (const id of ids) {
      if (synced >= maxCalls) break;
      try {
        await syncPlayerProfile(id);
        await markSynced('playerProfile', id, REF_CADENCE.playerProfile);
        synced += 1;
      } catch (err) {
        warn(`player profile backfill failed for ${id}: ${err.message}`);
      }
      if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  log.info(`player profile backfill: synced ${synced} player(s)`);
  return synced;
}

/**
 * Team profile + schedule + results from Sportradar (ignores Redis staleness).
 */
export async function backfillTeamsFromSportradar({
  teamIds = [],
  delayMs = 1100,
  schedule = true,
  results = true,
} = {}) {
  const uniq = [...new Set(teamIds.filter(Boolean))];
  let synced = 0;
  for (const teamId of uniq) {
    try {
      await syncTeamProfile(teamId);
      if (schedule) {
        await syncTeamMatches(teamId, { schedule: true, results: false });
      }
      if (results) {
        await syncTeamMatches(teamId, { schedule: false, results: true });
      }
      synced += 1;
    } catch (err) {
      warn(`team backfill failed for ${teamId}: ${err.message}`);
    }
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  }
  log.info(`team backfill: synced ${synced}/${uniq.length} team(s)`);
  return synced;
}

export async function syncDaily({ date = isoDate(), schedule = true, results = true } = {}) {
  let scheduleCount = 0;
  let resultCount = 0;
  if (schedule) {
    const raw = await fetchDailySchedule(date);
    const rows = normalizeDailySchedule(date, raw);
    scheduleCount = await saveSportEventRecords(rows);
  }
  if (results) {
    const raw = await fetchDailyResults(date);
    const rows = normalizeDailyResults(date, raw);
    resultCount = await saveSportEventRecords(rows);
  }
  log.info(`daily ${date}: ${scheduleCount} scheduled, ${resultCount} results`);
  return { date, scheduleCount, resultCount };
}

/**
 * Daily schedule/results for a rolling window, gated per date so each day is
 * only re-fetched when its stamp is stale.
 */
async function syncDailyWindowStale({
  pastDays = REFERENCE_SYNC_PAST_DAYS,
  futureDays = REFERENCE_SYNC_FUTURE_DAYS,
} = {}) {
  for (let offset = -pastDays; offset <= futureDays; offset += 1) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + offset);
    const date = isoDate(d);
    await runStale(
      'daily',
      date,
      REF_CADENCE.daily,
      () => syncDaily({ date, results: offset <= 0 }),
      500,
    );
  }
}

export async function syncMatchTimeline(matchId) {
  const raw = await fetchMatchTimeline(matchId);
  const norm = normalizeMatchTimeline(matchId, raw);
  await saveMatchTimeline(norm.matchId, norm.payload);
  log.info(`timeline synced for ${matchId}`);
  return { matchId };
}

export async function syncMatchSummary(matchId) {
  const raw = await fetchMatchSummary(matchId);
  await saveMatchSummary(matchId, raw);
  log.info(`match summary synced for ${matchId}`);
  return { matchId };
}

export async function syncMatchLineups(matchId) {
  const raw = await fetchMatchLineups(matchId);
  await saveMatchLineup(matchId, raw);
  const { teams, players } = normalizeLineups(raw);
  if (teams.length || players.length) {
    const res = await saveTeamsPlayers({ teams, players });
    log.info(`lineups upserted for ${matchId}: ${res.teams} team(s), ${res.players} player(s)`);
  }
  return { matchId };
}

export async function syncTeamProfile(teamId) {
  const raw = await fetchTeamProfile(teamId);
  const norm = normalizeTeamProfile(teamId, raw);
  await saveTeamProfile(norm);
  return { teamId };
}

export async function syncTeamMatches(teamId, { schedule = true, results = true } = {}) {
  let scheduleCount = 0;
  let resultCount = 0;
  if (schedule) {
    const raw = await fetchTeamSchedule(teamId);
    const rows = normalizeTeamSchedule(teamId, raw);
    scheduleCount = await saveSportEventRecords(rows);
  }
  if (results) {
    const raw = await fetchTeamResults(teamId);
    const rows = normalizeTeamResults(teamId, raw);
    resultCount = await saveSportEventRecords(rows);
  }
  log.info(
    `team ${teamId}: ${scheduleCount} scheduled, ${resultCount} results`,
  );
  return { teamId, scheduleCount, resultCount };
}

export async function syncHeadToHead(teamAId, teamBId) {
  const raw = await fetchTeamVersusTeam(teamAId, teamBId);
  const norm = normalizeHeadToHead(teamAId, teamBId, raw);
  await saveHeadToHead(norm);
  log.info(`head-to-head synced for ${teamAId} vs ${teamBId}`);
  return { teamAId: norm.teamAId, teamBId: norm.teamBId };
}

export async function syncPlayerProfile(playerId) {
  const raw = await fetchPlayerProfile(playerId);
  const norm = normalizePlayerProfile(playerId, raw);
  await savePlayerProfile(norm);
  log.info(`player profile synced for ${playerId}`);
  return { playerId };
}

export async function syncTournamentResults(tournamentOrSeasonId, { persist = true } = {}) {
  const raw = await fetchTournamentResults(tournamentOrSeasonId);
  const { tournament, rows } = normalizeTournamentResults(tournamentOrSeasonId, raw);
  if (tournament && persist) {
    await saveTournaments([tournament]);
  }
  const count = await saveSportEventRecords(rows);
  log.info(
    `tournament results ${tournamentOrSeasonId}: ${count} matches`,
  );
  return { tournamentOrSeasonId, count };
}

/**
 * Sync all reference/statistics endpoints. Targets are auto-derived from what
 * has already been ingested and each fetch is gated by a per-target staleness
 * stamp (Redis), so a cycle only fetches what is actually due — static lists
 * are refreshed weekly, slow data every few hours, and timelines/lineups once.
 */
export async function refSyncAll(options = {}) {
  await syncDailyWindowStale();

  if (PAUSE_REF_WHEN_LIVE) {
    const liveCount = await liveMatchCount();
    if (liveCount > 0) {
      log.info('reference sync paused while live matches are active', { liveCount });
      return;
    }
  }
  const {
    matchIds = [],
    teamIds = [],
    playerIds = [],
    pairIds = [],
    tournamentIds = [],
    delay = 500,
    timelineLimit = 20,
    summaryLimit = 20,
    seasonLimit = 10,
    teamLimit = 10,
    lineupLimit = 20,
    playerProfileLimit = 15,
    headToHeadLimit = 50,
  } = options;

  await runStale('tours', null, REF_CADENCE.tours, syncTourList);
  await runStale('tournaments', null, REF_CADENCE.tournaments, syncTournamentList);
  await safeRun(backfillTours);

  // Tournament results/seasons: derive targets from the synced tournament
  // list's `current_season` (active years only) instead of hardcoded ids.
  const derivedSeasonIds = await listActiveSeasonIds({ limit: seasonLimit });
  for (const id of [...new Set([...derivedSeasonIds, ...tournamentIds])]) {
    await runStale('seasonResults', id, REF_CADENCE.seasonResults, () => syncTournamentResults(id), delay);
  }

  const derivedTournamentIds = await listActiveTournamentIds({ limit: seasonLimit });
  for (const id of [...new Set([...derivedTournamentIds, ...tournamentIds])]) {
    await runStale('tournamentSeasons', id, REF_CADENCE.tournamentSeasons, () => syncTournamentSeasonsFor(id), delay);
  }

  // Tournament info (groups + team lists): same derived targets, own cadence.
  // This keeps the /info team lists fresh for every active tournament even
  // when only the tournament list row exists in the DB.
  for (const id of [...new Set([...derivedTournamentIds, ...tournamentIds])]) {
    await runStale('tournamentInfo', id, REF_CADENCE.tournamentInfo, () => syncTournamentInfoFor(id), delay);
  }

  // Materialize per-team schedule/results from the match records we already
  // have, so every team has schedule + results regardless of profile sync.
  await safeRun(materializeTeamEvents);

  // Team profiles + schedules/results: env-configured teams are refreshed
  // when stale, and teams without a profile yet are auto-derived so every
  // team gets covered progressively.
  const allTeamIds = [
    ...new Set([...teamIds, ...(await listTeamsWithoutSync({ limit: teamLimit }))]),
  ];
  for (const id of allTeamIds) {
    await runStale('teamProfile', id, REF_CADENCE.teamProfile, () => syncTeamProfile(id), delay);
    await runStale('teamSchedule', id, REF_CADENCE.teamSchedule, () => syncTeamMatches(id, { schedule: true, results: false }), delay);
    await runStale('teamResults', id, REF_CADENCE.teamResults, () => syncTeamMatches(id, { schedule: false, results: true }), delay);
  }

  // Head-to-head: keep existing pairs fresh, plus any env-configured pairs.
  const existingPairs = await listHeadToHeadPairs();
  const upcomingPairs = await listUpcomingHeadToHeadPairs({ limit: headToHeadLimit });
  const allPairs = [
    ...new Map(
      [...existingPairs, ...upcomingPairs, ...pairIds].map((p) => [p.join('::'), p]),
    ).values(),
  ];
  for (const [a, b] of allPairs) {
    await runStale('headToHead', `${a}::${b}`, REF_CADENCE.headToHead, () => syncHeadToHead(a, b), delay);
  }

  // Timelines: auto-derive match ids that still lack a timeline (most recent
  // first), plus any env-configured ones. Each is fetched once ever.
  const derivedSummaryIds = await listEventIdsWithoutMatchSummary({ limit: summaryLimit });
  for (const id of [...new Set([...derivedSummaryIds, ...matchIds])]) {
    await runStale('matchSummary', id, REF_CADENCE.matchSummary, () => syncMatchSummary(id), delay);
  }

  // Timeline queue: finished match ids that still lack a timeline, most recent
  // first. Fetched once ever — live and upcoming matches are excluded (the
  // live poll loop owns live snapshots), and rows are never refetched after
  // a match is stored.
  const derivedMatchIds = await listEventIdsWithoutTimeline({ limit: timelineLimit });
  for (const id of [...new Set([...derivedMatchIds, ...matchIds])]) {
    await runStale('timeline', id, REF_CADENCE.timeline, () => syncMatchTimeline(id), delay);
  }

  const liveMatchIds = await listLiveMatchIds({ limit: Math.min(timelineLimit, 10) });
  for (const id of liveMatchIds) {
    await runStale(
      'liveTimeline',
      id,
      REF_CADENCE.liveTimeline,
      () => syncMatchTimeline(id),
      delay,
    );
  }

  // Rosters: fetch lineups once per match for matches whose teams still have
  // no players — the single source of lineup data (timeline loop no longer
  // double-fetches them).
  const rosterMatchIds = await listMatchesForRosterlessTeams({ limit: lineupLimit });
  for (const id of rosterMatchIds) {
    await runStale('lineups', id, REF_CADENCE.lineups, () => syncMatchLineups(id), delay);
  }

  const derivedPlayerIds = await listPlayerIdsNeedingProfile({ limit: playerProfileLimit });
  for (const id of [...new Set([...derivedPlayerIds, ...playerIds])]) {
    await runStale('playerProfile', id, REF_CADENCE.playerProfile, () => syncPlayerProfile(id), delay);
  }

  const profileTeams = await safeRun(backfillTeamFieldsFromProfiles);
  const lineupTeams = await safeRun(() => backfillTeamFieldsFromLineups({ limit: 100 }));
  const managerRows = await safeRun(backfillTeamManagersFromPlayers);
  if (profileTeams) log.info(`team fields backfilled from profiles (${profileTeams})`);
  if (lineupTeams) log.info(`team fields backfilled from lineups (${lineupTeams})`);
  if (managerRows) log.info(`team managers backfilled from players (${managerRows})`);

  const playerLineupRows = await safeRun(() => backfillPlayerFieldsFromLineups({ limit: 100 }));
  const playerProfileRows = await safeRun(backfillPlayerFieldsFromProfiles);
  if (playerLineupRows) log.info(`player fields backfilled from lineups (${playerLineupRows})`);
  if (playerProfileRows) log.info(`player fields backfilled from profiles (${playerProfileRows})`);

  const s = getCallStats();
  log.info('reference sync cycle complete', { calls: s.calls, retries: s.retries });
}

async function safeRun(fn, delay = 0) {
  if (delay > 0) await new Promise((r) => setTimeout(r, delay));
  try {
    return await fn();
  } catch (err) {
    warn(`reference sync step failed: ${err.message}`);
    return null;
  }
}

// A step that persisted nothing is stamped for this long instead of its full
// cadence, so an empty/throttled window cannot mark a target fresh for days.
const EMPTY_RESULT_RETRY_MS = 3600e3;

/**
 * Fetch a step only when its Redis staleness key has expired, stamping the key
 * on success so already-fresh targets are skipped on subsequent cycles.
 */
async function runStale(category, id, cadenceMs, fn, delay = 0) {
  if (!(await shouldSync(category, id))) return null;
  const result = await safeRun(fn, delay);
  if (result !== null) {
    const persistedNothing = typeof result === 'number' && result === 0;
    await markSynced(
      category,
      id,
      persistedNothing ? Math.min(cadenceMs, EMPTY_RESULT_RETRY_MS) : cadenceMs,
    );
  }
  return result;
}

/**
 * Periodic reference sync driver. Called at startup with optional per-cycle
 * targets, then according to REFERENCE_SYNC_INTERVAL_MS.
 */
export async function startReferenceSync(options) {
  let inFlight = false;
  const run = async (reason) => {
    if (inFlight) {
      log.info('reference sync already running — skip', { reason });
      return null;
    }
    inFlight = true;
    try {
      return await refSyncAll(options);
    } finally {
      inFlight = false;
    }
  };

  if (REFERENCE_SYNC_INTERVAL_MS > 0) {
    setInterval(() => {
      run('interval').catch((err) =>
        warn(`reference periodic sync failed: ${err.message}`),
      );
    }, REFERENCE_SYNC_INTERVAL_MS);
    log.info('reference sync scheduled', {
      intervalMs: REFERENCE_SYNC_INTERVAL_MS,
      pastDays: REFERENCE_SYNC_PAST_DAYS,
      futureDays: REFERENCE_SYNC_FUTURE_DAYS,
    });
  } else {
    log.warn('periodic reference sync disabled; startup sync only');
  }

  return run('startup');
}
