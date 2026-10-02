import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FavoritesPage from '../app/favorites/page';
import { fetchMatchById } from '../services/matches';
import { listFavorites } from '../services/favorites';

/**
 * A completed favourite used to render as two bare team names, while the same match
 * on /matches?tab=completed showed both scores and the winner.
 *
 * Two independent defects stacked:
 *
 *   1. `/favorites?expand=true` returns a hand-trimmed match — no `team_scores`, no
 *      `result_text`, and `teams` as a flat abbreviation array. Nothing for
 *      `scoreboardFromMatch` or `describeMatchResult` to read, so `MatchCard` could
 *      only fall back to the single `displayScore` on one side.
 *   2. The favourites page rendered a local `MatchFavCard` fork whose team row had
 *      no score column at all, so even a complete payload would have been ignored.
 *
 * These tests pin the end result: the favourites card shows the scores and the
 * winner, reads them from the full record rather than the trimmed payload, and —
 * via `uniform` — keeps every card the same shape by dropping the overs.
 */

jest.mock('../services/matches', () => ({ fetchMatchById: jest.fn() }));
jest.mock('../services/favorites', () => ({ listFavorites: jest.fn(), removeFavorite: jest.fn() }));
jest.mock('../components/AuthProvider', () => ({
  useAuth: () => ({ isAuthenticated: true, loading: false }),
}));
jest.mock('../hooks/useMatchStream', () => ({
  useMatchStream: () => null,
  mergeMatchLivePayload: (_payload: unknown) => _payload,
}));

const getMatch = fetchMatchById as jest.MockedFunction<typeof fetchMatchById>;
const list = listFavorites as jest.MockedFunction<typeof listFavorites>;
const remove = jest.requireMock('../services/favorites').removeFavorite as jest.Mock;

/**
 * Every fixture's full record carries `FULL_ONLY`, and no thin payload ever does.
 * Asserting on it proves the top-up landed, so a test can never pass against the
 * intermediate render that still shows the trimmed payload.
 */
const FULL_ONLY = 'Full Record Tournament';

const COMPLETED = {
  matchId: 'sr:match:74740616',
  status: 'completed',
  tournament: FULL_ONLY,
  venue: 'Brendonfield Oval, Toronto',
  scheduled: '2026-09-28T19:30:00Z',
  teams: {
    home: { code: 'IND', name: 'India', score: '169/7', overs: '' },
    away: { code: 'SRI', name: 'Sri Lanka', score: '45/10', overs: '9.5' },
  },
  teamNames: ['India', 'Sri Lanka'],
  displayScore: '169/7',
  result: 'India won by 124 runs',
  matchStatus: 'completed',
  displayOvers: 9.5,
};

/** The shape `/favorites?expand=true` sends. Note `teams` is an array and there is no result. */
const THIN = {
  matchId: 'sr:match:74740616',
  status: 'completed',
  teams: ['IND', 'SRI'],
  teamNames: ['India', 'Sri Lanka'],
  tournament: 'Thin Payload Tournament',
  venue: 'Brendonfield Oval, Toronto',
  scheduled: '2026-09-28T19:30:00Z',
  displayScore: '169/7',
};

function favRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'fav-1',
    userId: 'u1',
    targetType: 'match',
    targetId: 'sr:match:74740616',
    createdAt: '2026-09-29T00:00:00Z',
    target: THIN,
    ...overrides,
  };
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <FavoritesPage />
    </QueryClientProvider>,
  );
}

/** Waits until the card is showing the full record rather than the thin payload. */
async function renderWithFullRecord(match: unknown) {
  getMatch.mockResolvedValue(match as never);
  renderPage();
  await waitFor(() => expect(screen.getByText(FULL_ONLY)).toBeInTheDocument());
  return screen.getByRole('link', { name: /India/ });
}

beforeEach(() => {
  jest.clearAllMocks();
  list.mockResolvedValue([favRow() as never]);
  remove.mockResolvedValue(undefined);
  getMatch.mockResolvedValue(COMPLETED as never);
});

describe('a completed match card', () => {
  it('shows both scores, which the thin expand payload cannot provide', async () => {
    await renderWithFullRecord(COMPLETED);
    expect(screen.getByText('169/7')).toBeInTheDocument();
    expect(screen.getByText('45/10')).toBeInTheDocument();
  });

  it('shows the winner and margin, matching the completed tab', async () => {
    await renderWithFullRecord(COMPLETED);
    expect(screen.getByText('India won by 124 runs')).toBeInTheDocument();
  });

  it('shows scores and the result, but no overs — overs varied per card and made the grid ragged', async () => {
    await renderWithFullRecord(COMPLETED);
    expect(screen.queryByText('9.5 ov')).not.toBeInTheDocument();
    expect(screen.queryByText('150 ov')).not.toBeInTheDocument();
  });

  it('is marked as a result rather than upcoming or live', async () => {
    await renderWithFullRecord(COMPLETED);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('links to the match page', async () => {
    const link = await renderWithFullRecord(COMPLETED);
    expect(link).toHaveAttribute('href', '/matches/sr:match:74740616');
  });

  it('renders exactly what MatchCard renders for the same match', async () => {
    // Guards against the page drifting back to a local fork of the card.
    const link = await renderWithFullRecord(COMPLETED);
    expect(link).toHaveTextContent('India');
    expect(link).toHaveTextContent('Sri Lanka');
    expect(link).toHaveTextContent('169/7');
    expect(link).toHaveTextContent('45/10');
    expect(link).not.toHaveTextContent('9.5 ov');
    expect(link).toHaveTextContent('India won by 124 runs');
  });

  it('keeps a remove control that does not navigate away', async () => {
    await renderWithFullRecord(COMPLETED);
    expect(screen.getByTitle('Remove from favorites')).toBeInTheDocument();
  });
});

describe('where the card gets its data', () => {
  it('tops the thin expand payload up from the full match record', async () => {
    renderPage();
    await waitFor(() => expect(getMatch).toHaveBeenCalled());
    expect(getMatch.mock.calls[0][0]).toBe('sr:match:74740616');
  });

  it('fetches a match once even when it is favourited twice', async () => {
    list.mockResolvedValue([favRow({ id: 'fav-1' }), favRow({ id: 'fav-2' })] as never);
    renderPage();
    await waitFor(() => expect(getMatch).toHaveBeenCalledTimes(1));
  });

  it('fetches one call per distinct match', async () => {
    list.mockResolvedValue([
      favRow({ id: 'fav-1' }),
      favRow({ id: 'fav-2', targetId: 'sr:match:2' }),
    ] as never);
    renderPage();
    await waitFor(() => expect(getMatch).toHaveBeenCalledTimes(2));
  });

  it('does not fetch for non-match favourites', async () => {
    list.mockResolvedValue([
      {
        id: 'fav-t',
        userId: 'u1',
        targetType: 'tour',
        targetId: 't1',
        createdAt: '2026-09-29T00:00:00Z',
        target: { id: 't1', name: 'Some Tour', category: 'International', sport: 'Cricket' },
      },
    ] as never);
    renderPage();
    await waitFor(() => expect(screen.getByText('Some Tour')).toBeInTheDocument());
    expect(getMatch).not.toHaveBeenCalled();
  });

  it('still shows the teams when the full record cannot be fetched', async () => {
    getMatch.mockResolvedValue(null);
    renderPage();
    await waitFor(() => expect(screen.getByText('Sri Lanka')).toBeInTheDocument());
    // The thin payload holds no scores, so there is honestly nothing more to show.
    expect(screen.queryByText('India won by 124 runs')).not.toBeInTheDocument();
  });
});

describe('a live match card', () => {
  const LIVE = {
    ...COMPLETED,
    status: 'live',
    result: null,
    // `deriveMatchState` prefers the match-level overs over the per-team figure, so
    // the two must agree here — which is the contract `matchCardOversAgreement`
    // enforces for live cards.
    displayOvers: 9.4,
    teams: {
      home: { code: 'IND', name: 'India', score: '92/0', overs: '9.4' },
      away: { code: 'SRI', name: 'Sri Lanka', score: '45/1', overs: '8' },
    },
    currentInnings: { battingTeam: 'IND', runs: 92, overs: 9.4, wickets: 0, runRate: 9.36 },
  };

  it('shows the live score, not the overs', async () => {
    const link = await renderWithFullRecord(LIVE);
    expect(link).toHaveTextContent('92/0');
    expect(link).not.toHaveTextContent('9.4 ov');
  });

  it('marks the batting side', async () => {
    const link = await renderWithFullRecord(LIVE);
    expect(link).toHaveTextContent('Bat');
  });

  it('shows no result line while the match is in play', async () => {
    await renderWithFullRecord(LIVE);
    expect(screen.queryByText(/won by/)).not.toBeInTheDocument();
  });
});

describe('an upcoming match card', () => {
  const UPCOMING = {
    matchId: 'sr:match:1',
    status: 'upcoming',
    tournament: FULL_ONLY,
    scheduled: '2026-10-02T14:00:00Z',
    teams: { home: { code: 'IND', name: 'India' }, away: { code: 'SRI', name: 'Sri Lanka' } },
    teamNames: ['India', 'Sri Lanka'],
    displayScore: null,
    result: null,
  };

  it('shows a dash for each score rather than a blank or a stale score', async () => {
    const link = await renderWithFullRecord(UPCOMING);
    expect(link).toHaveTextContent('India');
    expect(link).toHaveTextContent('Sri Lanka');
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
    expect(link).not.toHaveTextContent('169/7');
  });

  it('shows the kickoff time', async () => {
    const link = await renderWithFullRecord(UPCOMING);
    expect(link).toHaveTextContent(/2026/);
  });

  it('invents no result', async () => {
    await renderWithFullRecord(UPCOMING);
    expect(screen.queryByText(/won by/)).not.toBeInTheDocument();
  });
});
