import { isOddsSeedSource } from '../lib/oddsDisplay';
import { render, screen } from '@testing-library/react';
import MatchOddsView from '../components/odds/MatchOddsView';
import type { MatchOddsResponse, OddsSelectionPrice } from '../types/odds';

jest.mock('../services/odds', () => ({ fetchMatchOdds: jest.fn(), fetchOddsHistory: jest.fn() }));
jest.mock('../components/odds/OddsHistoryChart', () => ({
  __esModule: true,
  default: () => <div data-testid="history-chart" />,
}));
jest.mock('../components/odds/OddsMarketRulesDisclosure', () => ({ __esModule: true, default: () => <div /> }));

import { fetchOddsHistory } from '../services/odds';

const fetchHistory = fetchOddsHistory as jest.MockedFunction<typeof fetchOddsHistory>;

const seed = (over: Partial<OddsSelectionPrice> = {}): OddsSelectionPrice => ({
  selectionKey: 'home',
  label: 'Nondescripts CC',
  current: { decimal: 1.87, fractional: '87/100', american: -115, impliedProbability: 0.53 },
  opening: { decimal: 1.82, fractional: '41/50', american: -122, impliedProbability: 0.55 },
  movementPercent: 2.7,
  sourceSlug: 'demo-book-a',
  sourceName: 'Demo Book A (dev)',
  capturedAt: new Date().toISOString(),
  receivedAt: new Date().toISOString(),
  isBestDisplayedPrice: true,
  ...over,
});

const real = (over: Partial<OddsSelectionPrice> = {}): OddsSelectionPrice => ({
  ...seed(),
  sourceSlug: 'betfair',
  sourceName: 'Betfair',
  isBestDisplayedPrice: false,
  ...over,
});

const wrap = (selections: OddsSelectionPrice[]): MatchOddsResponse =>
  ({
    matchId: 'm1',
    markets: [{ marketKey: 'match_winner', name: 'Match winner', bookmakerMargin: 0.6, selections }],
    compliance: { disclaimer: 'd', ageGatingRequired: false },
  }) as unknown as MatchOddsResponse;

beforeEach(() => {
  jest.resetAllMocks();
  // Every test here renders synchronously and asserts on the seed labels, never on
  // the history chart. A resolved history request would set chart state after the
  // assertions had already run, which React reports as an unwrapped update.
  fetchHistory.mockReturnValue(new Promise(() => undefined));
});

describe('seed source detection', () => {
  it('recognises the demo books by slug', () => {
    expect(isOddsSeedSource({ sourceSlug: 'demo-book-a', sourceName: 'Anything' })).toBe(true);
  });

  it('recognises a dev marker in the name', () => {
    expect(isOddsSeedSource({ sourceSlug: 'x', sourceName: 'Book (dev)' })).toBe(true);
  });

  it('does not flag a licensed book', () => {
    expect(isOddsSeedSource({ sourceSlug: 'betfair', sourceName: 'Betfair' })).toBe(false);
  });
});

describe('a market that is all demo data', () => {
  it('says Example prices rather than Live price comparison', () => {
    render(<MatchOddsView matchId="m1" homeLabel="Home" awayLabel="Away" initial={wrap([seed()])} />);
    expect(screen.getByText('Example prices')).toBeInTheDocument();
    expect(screen.queryByText('Live price comparison')).not.toBeInTheDocument();
  });

  it('shows the explainer banner', () => {
    render(<MatchOddsView matchId="m1" homeLabel="Home" awayLabel="Away" initial={wrap([seed()])} />);
    expect(screen.getByText(/how this page works/i)).toBeInTheDocument();
  });

  it('still lists the demo rows so the layout is visible', () => {
    render(<MatchOddsView matchId="m1" homeLabel="Home" awayLabel="Away" initial={wrap([seed()])} />);
    expect(screen.getAllByText(/Demo Book/).length).toBeGreaterThan(0);
  });

  it('never calls a demo price the highest price', () => {
    // The API marks the seed row as isBestDisplayedPrice, because it is the only
    // row. Repeating that to a reader would be a fabricated recommendation.
    render(<MatchOddsView matchId="m1" homeLabel="Home" awayLabel="Away" initial={wrap([seed({ isBestDisplayedPrice: true })])} />);
    expect(screen.queryByText('Highest price')).not.toBeInTheDocument();
  });
});

describe('a market with real prices alongside demo ones', () => {
  const mixed = wrap([seed(), real({ current: { decimal: 1.95, fractional: '19/20', american: -110, impliedProbability: 0.51 }, isBestDisplayedPrice: true })]);

  it('drops the demo rows so a real price is never ranked against a fake one', () => {
    render(<MatchOddsView matchId="m1" homeLabel="Home" awayLabel="Away" initial={mixed} />);
    expect(screen.queryByText('Demo Book A (dev)')).not.toBeInTheDocument();
    expect(screen.getByText('Betfair')).toBeInTheDocument();
  });

  it('calls itself Live price comparison, not Example prices', () => {
    render(<MatchOddsView matchId="m1" homeLabel="Home" awayLabel="Away" initial={mixed} />);
    expect(screen.getByText('Live price comparison')).toBeInTheDocument();
    expect(screen.queryByText('Example prices')).not.toBeInTheDocument();
  });

  it('keeps the highest-price badge for the real book', () => {
    const { container } = render(<MatchOddsView matchId="m1" homeLabel="Home" awayLabel="Away" initial={mixed} />);
    expect(container.textContent).toContain('Highest price');
  });

  it('shows no explainer banner when real prices are present', () => {
    render(<MatchOddsView matchId="m1" homeLabel="Home" awayLabel="Away" initial={mixed} />);
    expect(screen.queryByText(/how this page works/i)).not.toBeInTheDocument();
  });
});

describe('a market with only real prices', () => {
  it('is untouched', () => {
    render(<MatchOddsView matchId="m1" homeLabel="Home" awayLabel="Away" initial={wrap([real()])} />);
    expect(screen.getByText('Live price comparison')).toBeInTheDocument();
    expect(screen.getByText('Betfair')).toBeInTheDocument();
  });
});
