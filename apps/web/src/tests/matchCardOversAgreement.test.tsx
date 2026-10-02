import { render, screen } from '@testing-library/react';
import MatchCard from '../components/MatchCard';
import MatchTickerBar from '../components/MatchTickerBar';
import { deriveMatchState } from '../hooks/useMatchState';
import { formatCricketOvers } from '../lib/cricketMath';

/**
 * The reported bug, at component level.
 *
 * A live ODI showed `9 ov` on the homepage card and `9.4 ov` on the match page. The
 * card was reading `teams.home.overs`, which the API rounds to whole overs, while the
 * page read the match-level `displayOvers`. Both numbers were "correct" for the field
 * they came from, which is exactly why no error was ever raised — they were simply
 * different fields.
 *
 * These tests pin the contract: for one live match, the card, the ticker and the match
 * page must render the same overs, and that value must come from the shared state.
 */

jest.mock('../hooks/useMatchStream', () => ({
  useMatchStream: () => null,
  mergeMatchLivePayload: (match: unknown) => match,
}));

// The ticker watches its own width to fade the edges; jsdom has no ResizeObserver.
beforeAll(() => {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

function liveMatch(overrides: Record<string, unknown> = {}) {
  return {
    matchId: 'sr:match:1',
    status: 'live',
    displayScore: '92/0',
    displayOvers: 9.4,
    shortName: 'India vs West Indies',
    tournamentName: 'ODI Series',
    inningsStatus: 'second_innings_home_team',
    teams: {
      home: { name: 'India', code: 'IN', score: '92/0', overs: '9' },
      away: { name: 'West Indies', code: 'WI', score: '405/7', overs: '50' },
    },
    teamScores: {
      home: { name: 'India', code: 'IN', score: '92/0', overs: '9' },
      away: { name: 'West Indies', code: 'WI', score: '405/7', overs: '50' },
    },
    teamNames: ['India', 'West Indies'],
    currentInnings: { runs: 92, overs: 9.4, wickets: 0, runRate: 9.36, battingTeam: 'IND' },
    ...overrides,
  } as never;
}

/**
 * Every `<n> ov` / `<n>.<n> ov` string the component actually rendered.
 *
 * The card prints overs inline with the score as `(9.4 ov)`, so the wrapping
 * parentheses are stripped here: the assertions are about the overs value, not
 * about the punctuation around it.
 */
function renderedOvers(): string[] {
  return screen
    .getAllByText(/\b\d{1,3}(?:\.\d)?\s*ov\b/)
    .map(
      (el) =>
        el.textContent?.replace(/\s+/g, ' ').replace(/^\((.*)\)$/, '$1').trim() ?? '',
    );
}

describe('the card and the match page cannot disagree', () => {
  it('shows the ball-accurate overs on the card, not the rounded team field', () => {
    render(<MatchCard match={liveMatch()} />);
    const shown = renderedOvers();

    // The rounded value would print "9 ov" — that is the bug.
    expect(shown).not.toContain('9 ov');
    expect(shown).toContain('9.4 ov');
  });

  it('normalises a completed over on the card', () => {
    render(
      <MatchCard
        match={liveMatch({
          displayOvers: 9.6,
          currentInnings: { runs: 100, overs: 9.6, wickets: 1, runRate: 10, battingTeam: 'IND' },
        })}
      />,
    );
    const shown = renderedOvers();
    expect(shown).not.toContain('9.6 ov');
    expect(shown).toContain('10 ov');
  });

  it('shows the same overs on the ticker as the card', () => {
    const { unmount } = render(<MatchTickerBar matches={[liveMatch()]} />);
    const ticker = renderedOvers();
    unmount();

    expect(ticker.length).toBeGreaterThan(0);
    // The live innings must be the value the card printed, not the rounded team field.
    expect(ticker.some((t) => t.includes('9.4 ov'))).toBe(true);
    expect(ticker.some((t) => /(^|[^\d.])9 ov\b/.test(t))).toBe(false);
  });

  it('matches what the match page will render for the same match', () => {
    const match = liveMatch();
    render(<MatchCard match={match} />);
    const card = renderedOvers();
    const pageValue = deriveMatchState(match).oversLabel;

    // The match page renders `formatCricketOvers(...)`; the card must be that string.
    expect(pageValue).toBe(formatCricketOvers(9.4));
    expect(card).toContain(`${pageValue} ov`);
  });

  it('leaves a finished match on its own, un-normalised, published totals', () => {
    render(
      <MatchCard
        match={liveMatch({
          status: 'completed',
          displayScore: '405/8',
          displayOvers: 50,
          currentInnings: null,
        })}
      />,
    );
    const shown = renderedOvers();
    expect(shown).toContain('50 ov');
    expect(shown).not.toContain('9.4 ov');
  });

  it('shows the live innings and the completed innings, and nothing else', () => {
    // A card legitimately shows two overs: the innings in progress and the finished
    // one. The invariant is that the live value is the normalised one and that the
    // batting strip does not re-derive a different number from `currentInnings`.
    render(<MatchCard match={liveMatch()} />);
    const shown = renderedOvers();

    const live = shown.filter((s) => s.includes('9.4 ov'));
    const completed = shown.filter((s) => s.includes('50 ov'));

    // The team row and the batting strip must both carry the same live value.
    expect(live.length).toBeGreaterThanOrEqual(2);
    expect(completed.length).toBe(1);
    expect(shown.some((s) => s.includes('batting') && s.includes('9.4 ov'))).toBe(true);
  });
});
