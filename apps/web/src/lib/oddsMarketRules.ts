/** Sportradar OC market #1 — fallback when API `name` is missing. */
export const MATCH_WINNER_MARKET_FALLBACK_NAME = 'Match winner (incl. super over)';

export function marketDisplayName(name: string | undefined | null): string {
  const trimmed = String(name ?? '').trim();
  return trimmed || MATCH_WINNER_MARKET_FALLBACK_NAME;
}

/**
 * Settlement copy for `match_winner`, written for readers who do not know the
 * betting terms. Legal must still sign off on the wording before launch.
 */
export const MATCH_WINNER_SETTLEMENT =
  'Bets on who wins the match are settled using the official competition rules. If the weather interrupts a match, bets are settled on the official result.';

export const MATCH_WINNER_IMPORTANT_NOTES: readonly string[] = [
  'A super over is counted here if one is played to decide the winner. Most other cricket bets do not count the super over unless the bet name says so.',
  'At least 90% of the overs must have been bowled when the bet was placed, unless the innings finished early — for example, the team declared or was bowled out.',
  'If the match is called off before any play, bets are void unless the match is replayed within 48 hours of the original start time.',
  'If the match is tied and the official rules do not decide a winner — including a winner decided by a coin toss or drawing of lots — bets that were still open are void.',
  'If an over was not finished, bets on that over are void unless the innings finished early.',
  'Bookmakers may void bets if the prices stayed open on a wrong score that made a real difference to the price. This page is for information only.',
];
