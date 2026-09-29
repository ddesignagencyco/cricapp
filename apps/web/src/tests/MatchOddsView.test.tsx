import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MatchOddsView from '../components/odds/MatchOddsView';

jest.mock('../services/odds', () => ({ fetchMatchOdds: jest.fn(), fetchOddsHistory: jest.fn() }));
jest.mock('../components/odds/OddsHistoryChart', () => ({
  __esModule: true,
  default: ({ selectionLabel, points }: { selectionLabel: string; points: unknown[] }) => (
    <div data-testid="history-chart" data-label={selectionLabel} data-points={points.length} />
  ),
}));
jest.mock('../components/odds/OddsMarketRulesDisclosure', () => ({
  __esModule: true,
  default: ({ marketKey }: { marketKey: string }) => <div data-testid="rules" data-market={marketKey} />,
}));
jest.mock('../components/skeletons/Skeletons', () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

import { fetchMatchOdds, fetchOddsHistory } from '../services/odds';
import type { MatchOddsResponse } from '../types/odds';

const fetchOdds = fetchMatchOdds as jest.MockedFunction<typeof fetchMatchOdds>;
const fetchHistory = fetchOddsHistory as jest.MockedFunction<typeof fetchOddsHistory>;

const NOW = new Date().toISOString();

/** A price carries all three formats at once; formatOddsPrice picks one. */
function formats(decimal = 2.5) {
  return { decimal, fractional: '5/2', american: 150, impliedProbability: null };
}

function price(overrides: Record<string, unknown> = {}) {
  return {
    selectionKey: 'home',
    label: 'Lahore',
    sourceSlug: 'book-a',
    sourceName: 'Book A',
    current: formats(),
    opening: formats(2.2),
    movementPercent: 12.5,
    isBestDisplayedPrice: false,
    capturedAt: NOW,
    receivedAt: NOW,
    ...overrides,
  };
}

function response(overrides: Partial<MatchOddsResponse> = {}): MatchOddsResponse {
  return {
    matchId: 'm1',
    markets: [
      {
        marketKey: 'match_winner',
        marketType: 'moneyline',
        name: 'Match Winner',
        bookmakerMargin: 4.2,
        selections: [price({ sourceSlug: 'book-a', sourceName: 'Book A' })],
      },
    ],
    compliance: { disclaimer: 'Prices are not advice to bet.', ageGatingRequired: false },
    ...overrides,
  } as unknown as MatchOddsResponse;
}

function winnerMarket(selections: Record<string, unknown>[]) {
  return {
    marketKey: 'match_winner',
    marketType: 'moneyline',
    name: 'Match Winner',
    bookmakerMargin: null,
    selections: [
      price({ sourceSlug: 'book-a', sourceName: 'Book A', selectionKey: 'home', label: 'Lahore' }),
      price({ sourceSlug: 'book-b', sourceName: 'Book B', selectionKey: 'away', label: 'Islamabad' }),
    ],
    ...(selections ? {} : {}),
  };
}

beforeEach(() => {
  jest.resetAllMocks();
  window.localStorage.clear();
  fetchHistory.mockResolvedValue({ points: [] } as never);
});

async function renderView(props: Partial<React.ComponentProps<typeof MatchOddsView>> = {}) {
  const result = render(
    <MatchOddsView matchId="m1" homeLabel="Lahore" awayLabel="Islamabad" {...props} />,
  );
  await waitFor(() => expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument());
  return result;
}

describe('MatchOddsView data states', () => {
  it('shows a busy skeleton while the first load is in flight', async () => {
    fetchOdds.mockReturnValue(new Promise(() => undefined));
    render(<MatchOddsView matchId="m1" homeLabel="Lahore" awayLabel="Islamabad" />);
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('renders immediately from initial data without calling the api', async () => {
    await renderView({ initial: response() });
    expect(fetchOdds).not.toHaveBeenCalled();
    // The market title appears both as a tab and as the table heading.
    expect(screen.getAllByText('Match Winner').length).toBeGreaterThan(0);
  });

  it('shows the area message on a 403 and never renders the table', async () => {
    fetchOdds.mockResolvedValue({ status: 'forbidden' } as never);
    await renderView();
    expect(screen.getByText(/not available in your area/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('honours an initialForbidden flag from the server render', async () => {
    await renderView({ initialForbidden: true });
    expect(screen.getByText(/not available in your area/i)).toBeInTheDocument();
    expect(fetchOdds).not.toHaveBeenCalled();
  });

  it('shows a not-found empty state when the match has no prices', async () => {
    fetchOdds.mockResolvedValue({ status: 'not_found' } as never);
    await renderView();
    expect(screen.getByText('No prices for this match yet')).toBeInTheDocument();
  });

  it('shows a generic error state when the request throws', async () => {
    fetchOdds.mockRejectedValue(new Error('network'));
    await renderView();
    expect(screen.getByText('Prices could not be loaded')).toBeInTheDocument();
  });
});

describe('MatchOddsView market rendering', () => {
  it('renders the market table with the selection columns', async () => {
    await renderView({ initial: response({ markets: [winnerMarket([])] }) as never });
    const table = screen.getByRole('table');
    const headers = within(table).getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual(['Lahore', 'Islamabad']);
  });

  it('labels the draw column explicitly', async () => {
    const market = {
      marketKey: 'match_winner',
      marketType: 'moneyline',
      name: 'Match Winner',
      bookmakerMargin: null,
      selections: [
        price({ selectionKey: 'home', sourceSlug: 'a', sourceName: 'A' }),
        price({ selectionKey: 'draw', sourceSlug: 'a', sourceName: 'A' }),
        price({ selectionKey: 'away', sourceSlug: 'a', sourceName: 'A' }),
      ],
    };
    await renderView({ initial: response({ markets: [market] }) as never });
    const headers = within(screen.getByRole('table')).getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual(['Lahore', 'Draw', 'Islamabad']);
  });

  it('puts match winner first regardless of the api order', async () => {
    const other = { marketKey: 'top_batter', marketType: 'batter', name: 'Top Batter', bookmakerMargin: null, selections: [price()] };
    const winner = winnerMarket([]);
    await renderView({ initial: response({ markets: [other, winner] }) as never });
    const tabs = within(screen.getByRole('tablist')).getAllByRole('tab');
    expect(tabs[0]).toHaveTextContent('Match Winner');
  });

  it('hides the market tabs when there is only one market', async () => {
    await renderView({ initial: response() });
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('switches markets when another tab is clicked', async () => {
    const other = { marketKey: 'top_batter', marketType: 'batter', name: 'Top Batter', bookmakerMargin: null, selections: [price()] };
    await renderView({ initial: response({ markets: [winnerMarket([]), other] }) as never });

    const tabs = within(screen.getByRole('tablist')).getAllByRole('tab');
    await userEvent.click(tabs[1]);

    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('rules')).toHaveAttribute('data-market', 'top_batter');
  });

  it('shows the bookmaker margin only when the api provides one', async () => {
    await renderView({ initial: response() });
    expect(screen.getByText(/added by bookmakers/i)).toBeInTheDocument();
  });

  it('omits the margin chip when it is null', async () => {
    await renderView({ initial: response({ markets: [winnerMarket([])] }) as never });
    expect(screen.queryByText(/added by bookmakers/i)).not.toBeInTheDocument();
  });

  it('renders one table row per bookmaker column', async () => {
    const market = {
      marketKey: 'match_winner',
      marketType: 'moneyline',
      name: 'Match Winner',
      bookmakerMargin: null,
      selections: [
        price({ sourceSlug: 'a', sourceName: 'A', selectionKey: 'home' }),
        price({ sourceSlug: 'b', sourceName: 'B', selectionKey: 'home' }),
        price({ sourceSlug: 'a', sourceName: 'A', selectionKey: 'away' }),
      ],
    };
    await renderView({ initial: response({ markets: [market] }) as never });
    // Away has one row, home has two, so the grid is two rows deep.
    expect(screen.getAllByRole('row')).toHaveLength(3);
  });
});

describe('MatchOddsView price display', () => {
  it('marks the best displayed price', async () => {
    const market = {
      marketKey: 'match_winner',
      marketType: 'moneyline',
      name: 'Match Winner',
      bookmakerMargin: null,
      selections: [price({ selectionKey: 'home', isBestDisplayedPrice: true })],
    };
    await renderView({ initial: response({ markets: [market] }) as never });
    expect(screen.getByText('Highest price')).toBeInTheDocument();
  });

  it('shows the opening price and the movement when there is one', async () => {
    await renderView({ initial: response() });
    expect(screen.getByText(/started at/i)).toBeInTheDocument();
  });

  it('switches to fractional when that format is chosen', async () => {
    await renderView({ initial: response() });
    await userEvent.click(screen.getByRole('button', { name: /fractional/i }));
    expect(screen.getByText('5/2')).toBeInTheDocument();
  });

  it('switches to american when that format is chosen', async () => {
    await renderView({ initial: response() });
    await userEvent.click(screen.getByRole('button', { name: /american/i }));
    expect(screen.getByText('+150')).toBeInTheDocument();
  });

  it('keeps the format buttons in a labelled group', async () => {
    await renderView({ initial: response() });
    const group = screen.getByRole('group', { name: /show prices as/i });
    expect(within(group).getAllByRole('button')).toHaveLength(3);
  });
});

describe('MatchOddsView compliance and seeding', () => {
  it('shows the age gate and hides the prices until it is confirmed', async () => {
    await renderView({
      initial: response({
        compliance: { disclaimer: 'd', ageGatingRequired: true },
      } as never),
    });
    expect(screen.getByText('Age confirmation')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('reveals the prices once the age gate is confirmed', async () => {
    await renderView({
      initial: response({
        compliance: { disclaimer: 'd', ageGatingRequired: true },
      } as never),
    });
    await userEvent.click(screen.getByRole('button', { name: /i am old enough/i }));
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('remembers the age consent for the next visit', async () => {
    const { storeOddsAgeConsent, readOddsAgeConsent } = jest.requireActual('../lib/oddsDisplay');
    storeOddsAgeConsent();
    expect(readOddsAgeConsent()).toBe(true);
  });

  it('skips the age gate when consent was already given', async () => {
    const { storeOddsAgeConsent } = jest.requireActual('../lib/oddsDisplay');
    storeOddsAgeConsent();
    await renderView({
      initial: response({
        compliance: { disclaimer: 'd', ageGatingRequired: true },
      } as never),
    });
    expect(screen.queryByText('Age confirmation')).not.toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('always renders the disclaimer footer', async () => {
    await renderView({ initial: response() });
    expect(screen.getByText('Prices are not advice to bet.')).toBeInTheDocument();
  });

  it('labels seeded prices as examples instead of live prices', async () => {
    const market = {
      marketKey: 'match_winner',
      marketType: 'moneyline',
      name: 'Match Winner',
      bookmakerMargin: null,
      selections: [price({ sourceSlug: 'demo-book-a', sourceName: 'Demo Book A' })],
    };
    await renderView({ initial: response({ markets: [market] }) as never });
    expect(screen.getByText('Example prices')).toBeInTheDocument();
    expect(screen.getByText(/here to show you how this page works/i)).toBeInTheDocument();
  });

  it('says live price comparison for real prices', async () => {
    await renderView({ initial: response() });
    expect(screen.getByText('Live price comparison')).toBeInTheDocument();
  });

  it('warns about stale prices only when live polling is on', async () => {
    const stale = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const market = {
      marketKey: 'match_winner',
      marketType: 'moneyline',
      name: 'Match Winner',
      bookmakerMargin: null,
      selections: [price({ capturedAt: stale })],
    };
    await renderView({ initial: response({ markets: [market] }) as never });
    expect(screen.queryByText(/more than 15 minutes old/i)).not.toBeInTheDocument();
  });

  it('warns about stale prices when polling and the capture is old', async () => {
    const stale = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const market = {
      marketKey: 'match_winner',
      marketType: 'moneyline',
      name: 'Match Winner',
      bookmakerMargin: null,
      selections: [price({ capturedAt: stale })],
    };
    await renderView({ initial: response({ markets: [market] }) as never, pollLive: true });
    expect(screen.getByText(/more than 15 minutes old/i)).toBeInTheDocument();
  });

  it('shows an empty state with a link when there are no markets at all', async () => {
    await renderView({
      initial: response({ markets: [], unavailable: 'No bookmaker prices for this match yet.' }),
    });
    expect(screen.getByText('No prices yet')).toBeInTheDocument();
    expect(screen.getByText('No bookmaker prices for this match yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /see other matches/i })).toBeInTheDocument();
  });
});

describe('MatchOddsView history panel', () => {
  it('requests history for the active market and first column', async () => {
    await renderView({ initial: response({ markets: [winnerMarket([])] }) as never });
    await waitFor(() =>
      expect(fetchHistory).toHaveBeenCalledWith('m1', {
        marketKey: 'match_winner',
        selectionKey: 'home',
        limit: 500,
      }),
    );
  });

  it('passes the readable team name to the chart', async () => {
    await renderView({ initial: response({ markets: [winnerMarket([])] }) as never });
    await waitFor(() => expect(screen.getByTestId('history-chart')).toHaveAttribute('data-label', 'Lahore'));
  });

  it('switches the history column when another selection is chosen', async () => {
    await renderView({ initial: response({ markets: [winnerMarket([])] }) as never });
    const picker = screen.getByLabelText('History selection');
    await userEvent.click(within(picker).getByRole('button', { name: 'Islamabad' }));

    await waitFor(() =>
      expect(fetchHistory).toHaveBeenLastCalledWith('m1', {
        marketKey: 'match_winner',
        selectionKey: 'away',
        limit: 500,
      }),
    );
  });

  it('renders an empty chart when the history request fails', async () => {
    fetchHistory.mockRejectedValue(new Error('nope'));
    await renderView({ initial: response({ markets: [winnerMarket([])] }) as never });
    await waitFor(() => expect(screen.getByTestId('history-chart')).toHaveAttribute('data-points', '0'));
  });

  it('does not fetch history when the prices are forbidden', async () => {
    fetchOdds.mockResolvedValue({ status: 'forbidden' } as never);
    await renderView();
    expect(fetchHistory).not.toHaveBeenCalled();
  });
});

describe('MatchOddsView model comparison panel', () => {
  const model = {
    homeWinProb: 0.62,
    awayWinProb: 0.38,
    marketHomeImplied: 0.55,
    marketAwayImplied: 0.45,
    note: 'A rough guess for interest only.',
  };

  it('renders the panel when the api supplies a model comparison', async () => {
    await renderView({ initial: response({ modelVsMarket: model }) as never });
    expect(screen.getByText('Our estimate vs the prices')).toBeInTheDocument();
    expect(screen.getByText('A rough guess for interest only.')).toBeInTheDocument();
  });

  it('omits the panel when the api has no model comparison', async () => {
    await renderView({ initial: response() });
    expect(screen.queryByText('Our estimate vs the prices')).not.toBeInTheDocument();
  });

  it('shows both our estimate and the market implied for each side', async () => {
    await renderView({ initial: response({ modelVsMarket: model }) as never });
    expect(screen.getByText('We think — Lahore')).toBeInTheDocument();
    expect(screen.getByText('Prices suggest — Lahore')).toBeInTheDocument();
    expect(screen.getByText('We think — Islamabad')).toBeInTheDocument();
    expect(screen.getByText('Prices suggest — Islamabad')).toBeInTheDocument();
  });
});

describe('MatchOddsView live polling', () => {
  beforeEach(() => {
    // Fake timers only for the interval tests: userEvent awaits real timers, so
    // global fake timers would hang every click in the file.
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not poll when the prop is off', async () => {
    fetchOdds.mockResolvedValue({ status: 'ok', data: response() } as never);
    await renderView();
    jest.advanceTimersByTime(120_000);
    expect(fetchOdds).toHaveBeenCalledTimes(1);
  });

  it('refetches on the interval when polling is on', async () => {
    fetchOdds.mockResolvedValue({ status: 'ok', data: response() } as never);
    // No `initial`, so the first fetch is the mount load; the interval adds one.
    await renderView({ pollLive: true });
    const afterMount = fetchOdds.mock.calls.length;
    expect(afterMount).toBe(1);

    jest.advanceTimersByTime(45_000);
    expect(fetchOdds).toHaveBeenCalledTimes(afterMount + 1);
    // The interval response is already resolved, so it applies on the next
    // microtask. Let it land before the test ends instead of after it.
    await act(async () => {
      await Promise.resolve();
    });
  });

  it('does not start an interval when there are no markets to poll', async () => {
    fetchOdds.mockResolvedValue({ status: 'ok', data: response({ markets: [] }) } as never);
    await renderView({ pollLive: true });
    const afterMount = fetchOdds.mock.calls.length;
    jest.advanceTimersByTime(120_000);
    expect(fetchOdds).toHaveBeenCalledTimes(afterMount);
  });

  it('stops the interval on unmount', async () => {
    fetchOdds.mockResolvedValue({ status: 'ok', data: response() } as never);
    const { unmount } = await renderView({ pollLive: true });
    const callsBefore = fetchOdds.mock.calls.length;
    unmount();
    jest.advanceTimersByTime(120_000);
    expect(fetchOdds).toHaveBeenCalledTimes(callsBefore);
  });
});
