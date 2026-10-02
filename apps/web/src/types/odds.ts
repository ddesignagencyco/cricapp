export type OddsPriceFormat = 'decimal' | 'fractional' | 'american';

export interface OddsFormats {
  decimal: number;
  fractional: string;
  american: number;
  impliedProbability: number | null;
}

export interface OddsCompliance {
  publicEnabled: boolean;
  regionAllowed: boolean;
  ageGatingRequired: boolean;
  advertisingRestricted: boolean;
  responsibleUseMessage: string;
  disclaimer: string;
}

export interface OddsSelectionPrice {
  selectionKey: string;
  label: string;
  current: OddsFormats;
  opening: OddsFormats | null;
  movementPercent: number | null;
  sourceSlug: string;
  sourceName: string;
  capturedAt: string;
  receivedAt: string;
  isBestDisplayedPrice: boolean;
}

export interface OddsMarketComparison {
  marketKey: string;
  marketType: string;
  name: string;
  bookmakerMargin: number | null;
  selections: OddsSelectionPrice[];
}

/**
 * Which prediction run `homeWinProb` / `awayWinProb` came from.
 *
 * `'live'` is the in-play number and `'pre_match'` the forecast made before the first
 * ball. The API returns the live run in preference to the pre-match one when both exist,
 * so a live match next to live prices is not showing a stale forecast — but it does mean
 * the two must be labelled, or the reader cannot tell which number they are looking at.
 */
export type ModelPredictionStage = 'live' | 'pre_match';

export interface ModelVsMarket {
  /**
   * The stage behind `homeWinProb` / `awayWinProb`.
   *
   * Optional: an API build without it returns the number with no stage, and the panel
   * then stays unlabelled rather than claiming one.
   */
  stage?: ModelPredictionStage | null;
  homeWinProb: number | null;
  awayWinProb: number | null;
  /** Both stages, so a client can show the other one instead of only the preferred. */
  preMatchHomeWinProb?: number | null;
  preMatchAwayWinProb?: number | null;
  liveHomeWinProb?: number | null;
  liveAwayWinProb?: number | null;
  marketHomeImplied: number | null;
  marketAwayImplied: number | null;
  note: string;
}

export interface MatchOddsResponse {
  matchId: string;
  compliance: OddsCompliance;
  markets: OddsMarketComparison[];
  modelVsMarket: ModelVsMarket | null;
  unavailable: string | null;
}

export interface OddsHistoryPoint {
  capturedAt: string;
  decimalPrice: number;
  sourceSlug: string;
  selectionKey: string;
}

export interface OddsHistoryResponse {
  matchId: string;
  marketKey: string;
  points: OddsHistoryPoint[];
}

export type MatchOddsFetchResult =
  | { status: 'ok'; data: MatchOddsResponse }
  | { status: 'forbidden' }
  | { status: 'not_found' };

export interface OddsConvertResponse {
  decimal: number;
  formats: OddsFormats;
  bookmakerMargin: number | null;
}

export interface OddsMarginResponse {
  margin: number | null;
}

export interface OddsSourceHealth {
  id: string;
  slug: string;
  name: string;
  licenseStatus: string;
  isActive: boolean;
  lastCapturedAt: string | null;
  stale: boolean;
}

export interface OddsSourceHealthResponse {
  staleAfterMinutes: number;
  sources: OddsSourceHealth[];
}
