/** @typedef {'upcoming' | 'live' | 'completed'} MatchStatus */
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
});

export const EVENT_TYPES = Object.freeze({
  MATCH_STARTED: 'match_started',
  STATUS_CHANGE: 'status_change',
  RUNS: 'runs',
  WICKET: 'wicket',
  MILESTONE: 'milestone',
});
