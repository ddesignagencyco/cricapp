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

import userEvent from '@testing-library/user-event';
import { truncateText } from '../components/boards/PlayerCareerPanel';

describe('long biography and club list', () => {
  const longBio = 'Word '.repeat(120).trim();

  it('cuts at a word boundary and says whether it cut', () => {
    expect(truncateText('short bio').truncated).toBe(false);
    const t = truncateText(longBio, 100);
    expect(t.truncated).toBe(true);
    expect(t.short.endsWith('…')).toBe(true);
    expect(t.short.length).toBeLessThanOrEqual(101);
    expect(t.short.replace('…', '').endsWith('Word')).toBe(true);
  });

  it('shows Read more, then the whole biography, then Show less', async () => {
    render(<PlayerCareerPanel extras={{ bio: longBio }} />);
    expect(screen.queryByText(longBio)).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Read more' }));
    expect(screen.getByText(longBio)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Show less' }));
    expect(screen.queryByText(longBio)).toBeNull();
  });

  it('collapses a long club list behind Show all', async () => {
    const clubs = Array.from({ length: 14 }, (_, i) => ({ id: `cb:team:${i}`, name: `Club ${i}` }));
    render(<PlayerCareerPanel extras={{ clubs }} />);
    expect(screen.queryByText('Club 13')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Show all 14' }));
    expect(screen.getByText('Club 13')).toBeTruthy();
  });

  it('has no toggle for a short biography', () => {
    render(<PlayerCareerPanel extras={{ bio: 'A short bio.' }} />);
    expect(screen.queryByRole('button', { name: 'Read more' })).toBeNull();
  });
});
