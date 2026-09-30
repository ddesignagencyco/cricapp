/**
 * Plain-English names for the odds markets and selections.
 *
 * The market keys and names come straight out of the odds feed, which is written for
 * trading systems rather than readers. A live page would show tabs like
 * "Match winner (incl. super over)" and a selection column headed "Draw" — neither of
 * which is something a cricket reader looks for, and the settlement wording around
 * them is worse. Every established odds page instead shows a short list of tabs the
 * reader recognises ("Match Winner", "Top Batsman"), with the team names as column
 * headings and the longest price highlighted.
 *
 * So the feed's own strings are never printed directly. They are matched against a
 * short list of markets a casual reader can act on, given a clean label, and anything
 * left over is tucked behind a disclosure rather than dropped — the price is still
 * there, it just stops competing for attention with the match winner market.
 */

/** Cricket has no draw. A tied match is settled under the tie/no-result rules. */
const DEAD_SELECTION_KEYS = new Set(['draw']);

/**
 * Markets worth a tab, in the order a reader is most likely to want them. The first
 * match wins, so `match_winner` is checked before the general "winner" pattern.
 */
const COMMON_MARKETS: readonly { readonly pattern: RegExp; readonly label: string }[] = [
  { pattern: /^match_winner$|match winner|moneyline|^winner$/i, label: 'Match Winner' },
  { pattern: /toss/i, label: 'Toss Winner' },
  // Both the singular provider spellings ("Top Batter") and the plurals have to match,
  // otherwise the most popular cricket market ends up hidden behind the disclosure.
  { pattern: /top batsman|top batter|highest batter|top run scorer|most runs|top scorer/i, label: 'Top Batsman' },
  { pattern: /top bowler|top wicket|highest wicket|most wickets/i, label: 'Top Bowler' },
  { pattern: /man of the match|player of the match/i, label: 'Player of the Match' },
  { pattern: /match total|total match runs|total for the match/i, label: 'Total Match Runs' },
  { pattern: /first innings total|1st innings (total|runs)/i, label: '1st Innings Total' },
  { pattern: /team total|innings total|total runs/i, label: 'Team Total' },
  { pattern: /top over|highest over|best over/i, label: 'Best Over' },
];

export type OddsMarketLike = { marketKey: string; name?: string | null };

/** Label for a market, or null when it is not one we can name in plain English. */
function commonMarketLabel(market: OddsMarketLike): string | null {
  const candidates = [market.marketKey, market.name ?? ''].filter(Boolean);
  for (const candidate of candidates) {
    for (const { pattern, label } of COMMON_MARKETS) {
      if (pattern.test(candidate)) return label;
    }
  }
  return null;
}

/**
 * Strips the provider's qualifiers: "India (incl. super over)" -> "India",
 * "Top Batsman (90 mins)" -> "Top Batsman".
 */
export function cleanProviderLabel(raw: string | null | undefined): string {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return '';
  return trimmed
    .replace(/[([][^)\]]*[)\]]/g, ' ')
    .replace(/\s*[—–-]\s*$/, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Title Case, leaving names that are already mixed case (team names) alone. */
function titleCase(value: string): string {
  return value
    .split(' ')
    .map((word) => (word.length > 1 && word === word.toLowerCase() ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

/**
 * The label to print for a market. Never returns the raw feed string when it can be
 * avoided, because the raw string is what made the page hard to read.
 */
export function marketLabel(market: OddsMarketLike): string {
  const common = commonMarketLabel(market);
  if (common) return common;
  const cleaned = cleanProviderLabel(market.name) || cleanProviderLabel(market.marketKey);
  return titleCase(cleaned.replace(/_/g, ' ')) || 'Other Market';
}

/**
 * Splits markets into the ones a reader can act on and the rest, keeping the common
 * ones in a fixed order so the tab row does not reshuffle as prices arrive.
 */
export function partitionMarkets<T extends OddsMarketLike>(markets: readonly T[]): { common: T[]; more: T[] } {
  const common: T[] = [];
  const more: T[] = [];
  for (const market of markets) {
    (commonMarketLabel(market) === null ? more : common).push(market);
  }
  common.sort(
    (a, b) => orderOf(a) - orderOf(b) || marketLabel(a).localeCompare(marketLabel(b)),
  );
  more.sort((a, b) => marketLabel(a).localeCompare(marketLabel(b)));
  return { common, more };
}

function orderOf(market: OddsMarketLike): number {
  const key = market.marketKey ?? '';
  const name = market.name ?? '';
  for (let i = 0; i < COMMON_MARKETS.length; i += 1) {
    if (COMMON_MARKETS[i].pattern.test(key) || COMMON_MARKETS[i].pattern.test(name)) return i;
  }
  return COMMON_MARKETS.length;
}

/**
 * True when a selection should not get a column. Cricket has no draw, and the feed
 * still carries one on some fixtures, so printing it would offer a bet that cannot
 * pay out the way a reader would expect.
 */
export function isHiddenSelection(key: string): boolean {
  return DEAD_SELECTION_KEYS.has(String(key ?? '').trim().toLowerCase());
}

/**
 * Column heading for a selection: the team name for the two sides, the clean provider
 * label for anything else.
 */
export function selectionLabel(
  key: string,
  homeLabel: string,
  awayLabel: string,
  fallback?: string,
): string {
  const k = String(key ?? '').trim().toLowerCase();
  if (k === 'home') return homeLabel;
  if (k === 'away') return awayLabel;
  if (k === 'tie' || k === 'tied') return 'Tie';
  if (k === 'no_result' || k === 'no result' || k === 'noresult') return 'No result';
  return titleCase(cleanProviderLabel(fallback) || cleanProviderLabel(key)) || key;
}
