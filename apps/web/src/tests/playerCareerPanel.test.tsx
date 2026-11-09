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
