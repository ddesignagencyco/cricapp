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

export interface ModelVsMarket {
  homeWinProb: number | null;
  awayWinProb: number | null;
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
