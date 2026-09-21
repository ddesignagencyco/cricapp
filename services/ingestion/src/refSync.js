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
  listActiveSeasonIds,
  listActiveTournamentIds,
  listEventIdsWithoutTimeline,
  listEventIdsWithoutMatchSummary,
  listHeadToHeadPairs,
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
import { shouldSync, markSynced, REF_CADENCE } from './refState.js';
import { getCallStats } from './sportradar.js';
import redis, { redisKeys } from './redis.js';

const log = createLogger('ref');
const warn = log.warn;

const REFERENCE_SYNC_INTERVAL_MS = Number(
  process.env.REFERENCE_SYNC_INTERVAL_MS || 3600000,
);
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

export async function syncTournamentSeasonsFor(tournamentId) {
  const raw = await fetchTournamentSeasons(tournamentId);
  const rows = normalizeTournamentSeasons(tournamentId, raw);
  const count = await saveTournamentSeasons(rows);
  log.info(`tournament ${tournamentId}: ${count} seasons`);
  return count;
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
async function syncDailyWindowStale(days = 3) {
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = isoDate(d);
    await runStale('daily', date, REF_CADENCE.daily, () => syncDaily({ date }), 500);
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
  } = options;

  await runStale('tours', null, REF_CADENCE.tours, syncTourList);
  await runStale('tournaments', null, REF_CADENCE.tournaments, syncTournamentList);
  await safeRun(backfillTours);
  await syncDailyWindowStale(3);

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
  const allPairs = [
    ...new Map(
      [...existingPairs, ...pairIds].map((p) => [p.join('::'), p]),
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

  const derivedMatchIds = await listEventIdsWithoutTimeline({ limit: timelineLimit });
  for (const id of [...new Set([...derivedMatchIds, ...matchIds])]) {
    await runStale('timeline', id, REF_CADENCE.timeline, () => syncMatchTimeline(id), delay);
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
  await refSyncAll(options);
  if (REFERENCE_SYNC_INTERVAL_MS > 0) {
    setInterval(() => {
      refSyncAll(options).catch((err) =>
        warn(`reference periodic sync failed: ${err.message}`),
      );
    }, REFERENCE_SYNC_INTERVAL_MS);
  }
}