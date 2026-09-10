/** @typedef {'upcoming' | 'live' | 'completed' | 'cancelled'} MatchStatus */
/** @typedef {'runs' | 'wicket' | 'none'} LastEventType */

/**
 * @typedef {Object} CurrentInnings
 * @property {string} battingTeam
 * @property {number} runs
 * @property {number} wickets
 * @property {number} overs
 * @property {number} runRate
 */

/**
 * @typedef {Object} LastEvent
 * @property {LastEventType} type
 * @property {number} runs
 * @property {number} over
 */

/**
 * @typedef {Object} CanonicalMatch
 * @property {string} matchId
 * @property {MatchStatus} status
 * @property {string[]} teams
 * @property {string[]} teamNames
 * @property {string | null} tournament
 * @property {string | null} venue
 * @property {string | null} scheduled
 * @property {CurrentInnings | null} currentInnings
 * @property {LastEvent} lastEvent
 * @property {string | null} displayScore
 * @property {string | null} matchStatus
 */

/**
 * @typedef {Object} MatchEvent
 * @property {string} type
 * @property {string} matchId
 */

export const PROVIDERS = Object.freeze({
  MOCK: 'mock',
  SPORTRADAR: 'sportradar',
});

export const MATCH_STATUS = Object.freeze({
  UPCOMING: 'upcoming',
  LIVE: 'live',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});

export const EVENT_TYPES = Object.freeze({
  MATCH_STARTED: 'match_started',
  STATUS_CHANGE: 'status_change',
  RUNS: 'runs',
  WICKET: 'wicket',
  MILESTONE: 'milestone',
});

export const PSL = Object.freeze({
  TOURNAMENT_ID: 'sr:tournament:14931',
  DEFAULT_SEASON_ID: 'sr:season:140552',
});

export const PSL_SEASONS = Object.freeze([
  { id: 'sr:season:114833', name: 'Pakistan Super League 2024', year: '2024' },
  { id: 'sr:season:129023', name: 'Pakistan Super League 2025', year: '2025' },
  { id: 'sr:season:140552', name: 'Pakistan Super League 2026', year: '2026' },
]);

export const PSL_LEADER_CATEGORIES = Object.freeze({
  BATTING: 'batting',
  BOWLING: 'bowling',
  FIELDING: 'fielding',
});
