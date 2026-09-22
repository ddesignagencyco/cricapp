/** Sportradar OC market #1 — fallback when API `name` is missing. */
export const MATCH_WINNER_MARKET_FALLBACK_NAME = 'Match winner (incl. super over)';

export function marketDisplayName(name: string | undefined | null): string {
  const trimmed = String(name ?? '').trim();
  return trimmed || MATCH_WINNER_MARKET_FALLBACK_NAME;
}

/** Settlement copy for `match_winner` — product/legal may refine wording. */
export const MATCH_WINNER_SETTLEMENT =
  'All match betting will be settled in accordance with official competition rules. In matches affected by adverse weather, bets will be settled according to the official result.';

export const MATCH_WINNER_IMPORTANT_NOTES: readonly string[] = [
  'This market includes a super over if one is played to decide the match winner. Most other cricket markets exclude super overs unless the market name says otherwise.',
  'At least 90% of the overs allocated for an innings must have been bowled at the time the bet was struck for markets to be settled, unless the innings reached its natural conclusion (for example declaration or all out).',
  'If a match is cancelled before any play, markets are void unless the match is replayed within 48 hours of the original scheduled start.',
  'If the match is tied and official rules do not determine a winner (including winner decided by coin toss or drawing of lots), undecided markets are void.',
  'If an over is incomplete, undecided markets on that over are void unless the innings ended naturally.',
  'Bookmakers may void bets if markets stayed open on an incorrect score that materially affected prices. This is informational only.',
];
