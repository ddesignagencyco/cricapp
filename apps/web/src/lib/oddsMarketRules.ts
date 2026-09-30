/** Sportradar OC market #1 — fallback when API `name` is missing. */
export const MATCH_WINNER_MARKET_FALLBACK_NAME = 'Match Winner';

export function marketDisplayName(name: string | undefined | null): string {
  const trimmed = String(name ?? '').trim();
  return trimmed || MATCH_WINNER_MARKET_FALLBACK_NAME;
}

/**
 * Settlement copy for `match_winner`, written for readers who do not know the
 * betting terms. Legal must still sign off on the wording before launch.
 */
export const MATCH_WINNER_SETTLEMENT =
  'Winner bets are settled on the official result. If weather stops play, the official result stands.';

/**
 * The two things a reader actually needs, rather than every edge case in the rules.
 *
 * This list was six paragraphs and sat above the prices, where it was the first thing
 * on the page — the hardest possible place for the longest text. A reader opening a
 * match to see a price should see the price first and be able to open the rest on
 * demand, so the disclosure now moves below the table and this list keeps only the
 * points that change what a bet pays out.
 */
export const MATCH_WINNER_IMPORTANT_NOTES: readonly string[] = [
  'A super over counts if one is played to decide the winner. Other bets usually ignore it.',
  'You normally need at least 90% of the overs bowled, unless the innings finished early.',
  'A match called off before any play is void, and a tied match is void unless the rules give a winner.',
];
