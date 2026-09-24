/** Runtime constants mirrored in schema.js for TypeScript/Jest re-exports. */
export const ODDS_LICENSE_STATUS = {
  LICENSED: 'licensed',
  PENDING: 'pending',
  DISABLED: 'disabled',
} as const;

export const ODDS_MARKET_TYPE = {
  MATCH_WINNER: 'match_winner',
} as const;

export const ODDS_SELECTION = {
  HOME: 'home',
  AWAY: 'away',
  DRAW: 'draw',
} as const;
