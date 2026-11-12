import * as sportradar from '../sportradar.js';
import * as cricbuzzMatches from './cricbuzz.js';
import * as cricbuzzRef from './cricbuzzRef.js';
import * as cricbuzzTimeline from './cricbuzzTimeline.js';
import { fetchPlayerProfile as cricbuzzPlayerProfile } from './cricbuzzPlayer.js';
import { getRapidStats } from './rapidHttp.js';
import { ProviderUnsupportedError } from './errors.js';

/**
 * Provider facade. Same function names as sportradar.js, so callers only change their
 * import. DATA_PROVIDER picks the chain; the default (sportradar) preserves old behaviour.
 *
 *   sportradar | cricbuzz | auto (= cricbuzz)
 *
 * `cricbuzz` is the official Cricbuzz Cricket listing on RapidAPI only: matches and
 * scorecards (cricbuzz.js), PSL / catalogue / squads / rosters (cricbuzzRef.js), the
 * ball-by-ball timeline (cricbuzzTimeline.js) and player profiles (cricbuzzPlayer.js), all on
 * one host, one response cache and one request budget. With more than one provider in a
 * chain, a call that is unsupported, over budget or failing moves on to the next provider.
 */

const cricbuzz = {
  ...cricbuzzRef,
  ...cricbuzzMatches,
  fetchMatchTimeline: cricbuzzTimeline.fetchMatchTimeline,
  fetchMatchTimelineDelta: cricbuzzTimeline.fetchMatchTimelineDelta,
  fetchPlayerProfile: cricbuzzPlayerProfile,
};

const MODULES = { sportradar, cricbuzz };
const CHAINS = {
  sportradar: ['sportradar'],
  cricbuzz: ['cricbuzz'],
  // kept so existing deployments with DATA_PROVIDER=auto keep working
  auto: ['cricbuzz'],
};

export function providerChain() {
  const name = (process.env.DATA_PROVIDER || 'sportradar').toLowerCase();
  const chain = CHAINS[name];
  if (!chain) {
    throw new Error(`Unknown DATA_PROVIDER "${name}" (expected ${Object.keys(CHAINS).join(' | ')})`);
  }
  return chain;
}

/** Test seam: replace the provider modules. */
export function setModules(overrides) {
  Object.assign(MODULES, overrides);
}

async function call(fnName, args) {
  const chain = providerChain();
  let lastError = null;
  for (const name of chain) {
    const fn = MODULES[name]?.[fnName];
    if (typeof fn !== 'function') {
      lastError ??= new ProviderUnsupportedError(`${name} does not support ${fnName}`);
      continue;
    }
    try {
      return await fn(...args);
    } catch (err) {
      lastError = err;
      if (chain.length > 1) {
        console.warn(`[provider] ${name}.${fnName} failed (${err.name}: ${err.message}); trying next provider`);
      }
    }
  }
  throw lastError;
}

const wrap = (name) => (...args) => call(name, args);

export const fetchLiveSchedule = wrap('fetchLiveSchedule');
export const fetchMatchSummary = wrap('fetchMatchSummary');
export const fetchMatchLineups = wrap('fetchMatchLineups');
/** Batting/bowling cards for one match; Cricbuzz only (Sportradar reports it unsupported). */
export const fetchMatchScorecard = wrap('fetchMatchScorecard');
export const fetchTournamentSeasons = wrap('fetchTournamentSeasons');
export const fetchSeasonSchedule = wrap('fetchSeasonSchedule');
export const fetchSeasonStandings = wrap('fetchSeasonStandings');
export const fetchSeasonStandingsRaw = wrap('fetchSeasonStandingsRaw');
export const fetchSeasonLeaders = wrap('fetchSeasonLeaders');
export const fetchTournamentInfo = wrap('fetchTournamentInfo');
export const fetchSeasonSquad = wrap('fetchSeasonSquad');
export const fetchDailySchedule = wrap('fetchDailySchedule');
export const fetchDailyResults = wrap('fetchDailyResults');
export const fetchMatchTimeline = wrap('fetchMatchTimeline');
export const fetchMatchTimelineDelta = wrap('fetchMatchTimelineDelta');
export const fetchPlayerProfile = wrap('fetchPlayerProfile');
export const fetchTeamProfile = wrap('fetchTeamProfile');
/** A team's squad list; Cricbuzz only. */
export const fetchTeamRoster = wrap('fetchTeamRoster');
/** Announced squads of a series for some teams; Cricbuzz only. */
export const fetchSeriesSquads = wrap('fetchSeriesSquads');
export const fetchTeamResults = wrap('fetchTeamResults');
export const fetchTeamSchedule = wrap('fetchTeamSchedule');
export const fetchTeamVersusTeam = wrap('fetchTeamVersusTeam');
export const fetchTours = wrap('fetchTours');
export const fetchTournaments = wrap('fetchTournaments');
export const fetchTournamentResults = wrap('fetchTournamentResults');

/** Combined call counters: `calls`/`retries` keep their SportsRadar meaning for existing logs. */
export function getCallStats() {
  const sr = sportradar.getCallStats();
  const rapid = getRapidStats();
  return { ...sr, calls: sr.calls + rapid.calls, rapid };
}
