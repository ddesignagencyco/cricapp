export const redisKeys = {
  matchState: (matchId) => `match:${matchId}:state`,
  matchChannel: (matchId) => `match:${matchId}`,
  liveMatches: () => 'matches:live',
  tournamentSchedule: (tournamentId) => `tournament:${tournamentId}:schedule`,
};

export const REDIS_TTL = {
  MATCH_STATE: 3600,
  SCHEDULE: 300,
};
