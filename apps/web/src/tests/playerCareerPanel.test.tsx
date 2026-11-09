import { render, screen } from '@testing-library/react';
import PlayerCareerPanel, { currentRankings, readExtras } from '../components/boards/PlayerCareerPanel';

const extras = {
  bio: 'A right-handed batter.',
  birthPlace: 'Bournemouth, Dorset',
  rankings: { bat: {}, bowl: { t20BestRank: '71' }, all: { t20Rank: '64', t20BestRank: '31' } },
  career: { t20: { debut: 'vs South Africa, 2023-08-30', lastPlayed: 'vs Bangladesh, 2026-06-21', lastMatchId: 'cb:match:153772' } },
  batting: { formats: ['Test', 'ODI'], rows: [{ label: 'Runs', values: ['4288', '3570'] }] },
  recentBatting: { headers: [], rows: [{ matchId: 'cb:match:1', values: ['10(16)', 'RSA', 'ODI', '22 Aug 25'] }] },
};

describe('PlayerCareerPanel', () => {
  it('reads the stored provider payload defensively', () => {
    expect(readExtras(null)).toBeNull();
    expect(readExtras({ player: {} })).toBeNull();
    expect(readExtras({ cricbuzz: { bio: 'x' } })?.bio).toBe('x');
  });

  it('shows only current ranks', () => {
    expect(currentRankings(extras.rankings)).toEqual([{ kind: 'All-rounder', format: 'T20I', rank: '64' }]);
  });

  it('renders bio, career table, recent form and debut links', () => {
    render(<PlayerCareerPanel extras={extras} />);
    expect(screen.getByText('A right-handed batter.')).toBeTruthy();
    expect(screen.getByText('4288')).toBeTruthy();
    expect(screen.getByText('#64')).toBeTruthy();
    expect(screen.getByText('10(16)')).toBeTruthy();
    expect(screen.getByText('vs Bangladesh, 2026-06-21').closest('a')?.getAttribute('href')).toBe('/matches/cb:match:153772');
  });

  it('renders nothing when the profile has no extras', () => {
    const { container } = render(<PlayerCareerPanel extras={{}} />);
    expect(container.firstChild).toBeNull();
  });
});

jest.mock('../components/AuthProvider', () => ({ useAuth: () => ({ isAuthenticated: false, user: null }) }));
jest.mock('../services/favorites', () => ({ addFavorite: jest.fn(), removeFavorite: jest.fn(), listFavorites: jest.fn().mockResolvedValue([]) }));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/players/cb:player:1',
  useSearchParams: () => new URLSearchParams(),
}));

import PlayerDetailBody from '../components/boards/PlayerDetailBody';

describe('PlayerDetailBody full profile', () => {
  const base = { id: 'cb:player:1', fullName: 'Test Player', role: 'batsman', team: null, recentMatches: [] };

  it('tells the visitor the full profile is loading while it is requested', () => {
    render(<PlayerDetailBody player={{ ...base, profilePending: true, providerProfile: null }} />);
    expect(screen.getByRole('status').textContent).toMatch(/Loading the full profile/);
  });

  it('shows the biography once the profile is stored', () => {
    render(
      <PlayerDetailBody
        player={{ ...base, profilePending: false, providerProfile: { cricbuzz: { bio: 'Left-handed opener.' } } }}
      />,
    );
    expect(screen.getByText('Left-handed opener.')).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('PlayerDetailBody tracked stats', () => {
  it('shows tracked-match totals, labelled as not career totals', () => {
    render(
      <PlayerDetailBody
        player={{
          id: 'cb:player:1739', fullName: 'David Warner', role: 'batsman', team: null, recentMatches: [], profilePending: false,
          trackedStats: {
            matches: 3,
            batting: { innings: 3, runs: 111, balls: 80, notOuts: 1, highest: 66, highestNotOut: true, average: 55.5, strikeRate: 138.75, fifties: 1, hundreds: 0, fours: 11, sixes: 4, ducks: 0 },
            bowling: null,
          },
        }}
      />,
    );
    expect(screen.getByText('111')).toBeTruthy();
    expect(screen.getByText('66*')).toBeTruthy();
    expect(screen.getByText('55.50')).toBeTruthy();
    expect(screen.getByText(/not career totals/i)).toBeTruthy();
    expect(screen.queryByText('Overs')).toBeNull();
  });
});
