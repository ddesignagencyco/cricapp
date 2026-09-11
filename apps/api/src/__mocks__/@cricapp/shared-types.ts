export const PROVIDERS = {
  MOCK: 'mock',
  SPORTRADAR: 'sportradar',
};

export const MATCH_STATUS = {
  UPCOMING: 'upcoming',
  LIVE: 'live',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const EVENT_TYPES = {
  MATCH_STARTED: 'match_started',
  STATUS_CHANGE: 'status_change',
  RUNS: 'runs',
  WICKET: 'wicket',
  MILESTONE: 'milestone',
};

export const PSL = {
  TOURNAMENT_ID: 'sr:tournament:1877',
};

export const PSL_SEASONS = [
  { year: '2024', id: 'sr:season:114833', name: 'Pakistan Super League 2024' },
  { year: '2025', id: 'sr:season:129023', name: 'Pakistan Super League 2025' },
  { year: '2026', id: 'sr:season:140552', name: 'Pakistan Super League 2026' },
];

export const PSL_LEADER_CATEGORIES = ['batting', 'bowling'];

export const PREDICTION_STAGE = {
  PRE_MATCH: 'pre_match',
  LIVE: 'live',
};

export const PREDICTION_MODELS = {
  PREMATCH: 'prematch-logit-v1',
  LIVE: 'live-resource-v1',
};

export const redisKeys = {
  matchState: (matchId: string) => `match:${matchId}:state`,
  matchChannel: (matchId: string) => `match:${matchId}`,
  liveMatches: () => 'matches:live',
  tournamentSchedule: (tournamentId: string) => `tournament:${tournamentId}:schedule`,
  pslStandings: (seasonId: string) => `psl:${seasonId}:standings`,
  pslFixtures: (seasonId: string) => `psl:${seasonId}:fixtures`,
  pslLeaders: (seasonId: string) => `psl:${seasonId}:leaders`,
  pslSquads: (seasonId: string) => `psl:${seasonId}:squads`,
  newsList: () => 'news:list',
  newsArticle: (id: string) => `news:article:${id}`,
};

export const REDIS_TTL = {
  MATCH_STATE: 3600,
  SCHEDULE: 300,
  PSL: 3600,
  NEWS: 300,
};
