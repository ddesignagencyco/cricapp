export const redisKeys = {
  matchState: (matchId) => `match:${matchId}:state`,
  matchChannel: (matchId) => `match:${matchId}`,
  liveMatches: () => 'matches:live',
  tournamentSchedule: (tournamentId) => `tournament:${tournamentId}:schedule`,
  pslStandings: (seasonId) => `psl:${seasonId}:standings`,
  pslFixtures: (seasonId) => `psl:${seasonId}:fixtures`,
  pslLeaders: (seasonId) => `psl:${seasonId}:leaders`,
  pslSquads: (seasonId) => `psl:${seasonId}:squads`,
};

export const REDIS_TTL = {
  MATCH_STATE: 3600,
  SCHEDULE: 300,
  PSL: 3600,
};
