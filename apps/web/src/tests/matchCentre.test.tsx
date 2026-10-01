/**
 * The match centre's tabs, query scoping and empty states.
 *
 * These are the behaviours a reader notices immediately: which tab opens, that
 * switching tabs does not refetch, that a key cannot leak one match's data onto
 * another, and that a panel with no data says so instead of rendering nothing.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/harness';
import { matchKeys } from '../queries/keys';
import MatchTabNavigation, {
  ALL_MATCH_TAB_KEYS,
  MATCH_TABS,
  MatchTabPanel,
  defaultMatchTab,
  type MatchTab,
} from '../components/boards/match/MatchTabNavigation';
import { MatchScoreboard } from '../components/boards/match/MatchPageHeader';
import OtherMatches from '../components/boards/match/OtherMatches';
import MatchInfo from '../components/boards/match/MatchInfo';
import RelatedMatchNews from '../components/boards/match/RelatedMatchNews';
import { MatchSquadsTab, MatchScorecardTab } from '../components/boards/match/MatchScorecardTab';
import { dismissalOvers, readSquads } from '../lib/matchScorecardData';
import { buildMatchViewModel } from '../lib/matchViewModel';
import { formatVenueDate, formatVenueTime, ordinalInnings, splitScore, timeZoneLabel } from '../components/boards/match/matchFormat';
import type { Match, NewsArticle } from '../types';

jest.mock('../../src/hooks/useMatchStream', () => ({
  useMatchStream: () => null,
  mergeMatchLivePayload: <T,>(prev: T) => prev,
}));

/* ─── Query-key scoping ──────────────────────────────────────────── */

describe('match-detail query keys', () => {
  it('carries the match id on every match-detail key', () => {
    const id = 'sr:match:1';
    for (const key of [
      matchKeys.detail(id),
      matchKeys.timeline(id),
      matchKeys.odds(id),
      matchKeys.news(id),
      matchKeys.headToHead(id, 'a', 'b'),
    ]) {
      expect(key).toContain(id);
    }
  });

  it('cannot serve one match another match\'s cached data', () => {
    const a = matchKeys.timeline('sr:match:1');
    const b = matchKeys.timeline('sr:match:2');
    expect(a).not.toEqual(b);
    expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
  });

  it('separates head-to-head by both teams, not just the match', () => {
    expect(matchKeys.headToHead('m', 'a', 'b')).not.toEqual(matchKeys.headToHead('m', 'b', 'a'));
  });

  it('keeps search and filter parameters in the list key', () => {
    const first = matchKeys.list({ tournament: 'Border-Gavaskar Trophy', limit: 24 });
    const second = matchKeys.list({ tournament: 'ICC Champions Trophy', limit: 24 });
    expect(first).not.toEqual(second);
    // Parameter order must not produce a second cache entry for the same request.
    expect(matchKeys.list({ limit: 24, tournament: 'X' })).toEqual(
      matchKeys.list({ tournament: 'X', limit: 24 }),
    );
  });

  it('never collides a list key with a detail key', () => {
    expect(matchKeys.list({ matchId: 'sr:match:1' })).not.toEqual(matchKeys.detail('sr:match:1'));
  });
});

/* ─── Default tab ────────────────────────────────────────────────── */

describe('the default tab follows the match state', () => {
  const all = ALL_MATCH_TAB_KEYS;

  it('opens a live match on the commentary', () => {
    expect(defaultMatchTab('live', all)).toBe(MATCH_TABS.commentary.key);
  });

  it('opens an upcoming match on the overview', () => {
    expect(defaultMatchTab('upcoming', all)).toBe(MATCH_TABS.overview.key);
  });

  it('opens a completed match on the overview', () => {
    expect(defaultMatchTab('completed', all)).toBe(MATCH_TABS.overview.key);
  });

  it('falls back to the first available tab when there is no overview', () => {
    expect(defaultMatchTab('live', [MATCH_TABS.scorecard.key])).toBe(MATCH_TABS.scorecard.key);
  });

  it('does not default to a commentary tab that does not exist', () => {
    expect(defaultMatchTab('live', [MATCH_TABS.overview.key])).toBe(MATCH_TABS.overview.key);
  });

  it('never defaults to an empty string', () => {
    expect(defaultMatchTab('live', [])).toBe('overview');
  });
});

/* ─── Tab bar interaction ────────────────────────────────────────── */

const ALL: MatchTab[] = ALL_MATCH_TAB_KEYS.map(
  (key) => MATCH_TABS[key as keyof typeof MATCH_TABS],
);

describe('the tab bar', () => {
  it('marks exactly one tab as selected and wires the panel relationship', () => {
    render(<MatchTabNavigation tabs={ALL} active="overview" onChange={() => {}} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBe(ALL.length);
    const selected = tabs.filter((t) => t.getAttribute('aria-selected') === 'true');
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveTextContent('Overview');
    expect(selected[0].getAttribute('aria-controls')).toBe('mc-panel-overview');
  });

  it('calls onChange with the tab key when clicked', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<MatchTabNavigation tabs={ALL} active="overview" onChange={onChange} />);
    await user.click(screen.getByRole('tab', { name: /Scorecard/ }));
    expect(onChange).toHaveBeenCalledWith('scorecard');
  });

  it('moves focus with the arrow keys, following the ARIA tabs pattern', async () => {
    const user = userEvent.setup();
    render(<MatchTabNavigation tabs={ALL} active="overview" onChange={() => {}} />);
    const tabs = screen.getAllByRole('tab');
    tabs[0].focus();
    expect(tabs[0]).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(tabs[1]).toHaveFocus();

    await user.keyboard('{ArrowLeft}');
    expect(tabs[0]).toHaveFocus();
  });

  it('wraps around at both ends and supports Home and End', async () => {
    const user = userEvent.setup();
    render(<MatchTabNavigation tabs={ALL} active="overview" onChange={() => {}} />);
    const tabs = screen.getAllByRole('tab');
    tabs[0].focus();

    await user.keyboard('{ArrowLeft}');
    expect(tabs[tabs.length - 1]).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(tabs[0]).toHaveFocus();

    await user.keyboard('{End}');
    expect(tabs[tabs.length - 1]).toHaveFocus();

    await user.keyboard('{Home}');
    expect(tabs[0]).toHaveFocus();
  });

  it('does not activate a tab on arrow alone, so the panel does not swap under a keyboard reader', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<MatchTabNavigation tabs={ALL} active="overview" onChange={onChange} />);
    screen.getAllByRole('tab')[0].focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps only the active tab in the tab order', () => {
    render(<MatchTabNavigation tabs={ALL} active="scorecard" onChange={() => {}} />);
    const tabs = screen.getAllByRole('tab');
    tabs.forEach((tab, index) => {
      expect(tab.getAttribute('tabindex')).toBe(index === 1 ? '0' : '-1');
    });
  });

  it('renders nothing when there are no tabs, rather than an empty bar', () => {
    const { container } = render(<MatchTabNavigation tabs={[]} active="overview" onChange={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('keeps the tab set identical for every match, so the tabs never move', () => {
    // Every tab is always rendered. The set used to shrink to whatever had data, so
    // the same page showed five tabs on one fixture and eight on another and the tabs
    // physically shifted between matches.
    const expected = [
      'Overview',
      'Scorecard',
      'Commentary',
      'Squads',
      'Head to Head',
      'Odds',
      'Match Info',
    ];
    expect(ALL.map((tab) => tab.label)).toEqual(expected);
    // No news tab: the related stories live in the sidebar instead.
    expect(ALL.map((tab) => tab.label)).not.toContain('News');
    // Stats is spelled out as Head to Head.
    expect(ALL.some((tab) => tab.key === 'stats' && tab.label === 'Head to Head')).toBe(true);
  });

  it('never widens the page: the list is a contained scroller', () => {
    const { container } = render(<MatchTabNavigation tabs={ALL} active="overview" onChange={() => {}} />);
    const list = container.querySelector('[role="tablist"]') as HTMLElement;
    // The overflow and `min-width: 0` rules live in the stylesheet on these classes, so
    // the element only has to carry them.
    expect(list.className).toContain('mc-tabs__list');
    expect(container.querySelector('.mc-tabs')).not.toBeNull();
  });
});

describe('a tab panel', () => {
  it('renders its children only when it is the active tab', () => {
    const { rerender } = render(
      <MatchTabPanel tabKey="overview" active="overview">
        <p>Overview body</p>
      </MatchTabPanel>,
    );
    expect(screen.getByText('Overview body')).toBeInTheDocument();
    const panel = screen.getByRole('tabpanel');
    expect(panel.getAttribute('aria-labelledby')).toBe('mc-tab-overview');

    rerender(
      <MatchTabPanel tabKey="overview" active="scorecard">
        <p>Overview body</p>
      </MatchTabPanel>,
    );
    expect(screen.queryByText('Overview body')).not.toBeInTheDocument();
  });
});

/* ─── Scoreboard rendering ────────────────────────────────────────── */

function completedTest() {
  return buildMatchViewModel({
    match: {
      matchId: 'sr:match:1',
      status: 'completed',
      matchStatus: 'ended',
      tournament: 'Border-Gavaskar Trophy',
      venue: 'Optus Stadium',
      scheduled: '2024-11-22T02:20:00+00:00',
      result: 'India won by 295 runs',
      winnerId: 'sr:competitor:107203',
      tossWonBy: 'sr:competitor:107203',
      tossDecision: 'bat',
      teams: {
        home: { code: 'AUS', name: 'Australia', score: '342/10', overs: '58.4' },
        away: { code: 'IND', name: 'India', score: '637/6', overs: '134.3' },
      },
      teamNames: ['Australia', 'India'],
      periodScores: [
        { number: 1, away_score: 150, away_wickets: 10, home_score: 0, display_overs: 49.4 },
        { number: 2, home_score: 104, home_wickets: 10, away_score: 0, display_overs: 51.2 },
        { number: 3, away_score: 487, away_wickets: 6, home_score: 0, display_overs: 134.3 },
        { number: 4, home_score: 238, home_wickets: 10, away_score: 0, display_overs: 58.4 },
      ],
      displayOvers: 58.4,
      currentInnings: { battingTeam: 'IND', runs: 0, overs: 58.4, wickets: 0, runRate: 0 },
      lastEvent: { over: 58.4, runs: 0, type: 'none' },
    } as unknown as Record<string, unknown>,
    timeline: {
      sport_event: {
        competitors: [
          { id: 'sr:competitor:142690', name: 'Australia', abbreviation: 'AUS', qualifier: 'home' },
          { id: 'sr:competitor:107203', name: 'India', abbreviation: 'IND', qualifier: 'away' },
        ],
      },
      sport_event_status: {
        status: 'closed',
        allotted_overs: 20,
        period_scores: [
          { number: 1, away_score: 150, away_wickets: 10, home_score: 0, display_overs: 49.4 },
          { number: 2, home_score: 104, home_wickets: 10, away_score: 0, display_overs: 51.2 },
          { number: 3, away_score: 487, away_wickets: 6, home_score: 0, display_overs: 134.3 },
          { number: 4, home_score: 238, home_wickets: 10, away_score: 0, display_overs: 58.4 },
        ],
      },
      timeline: [],
    } as unknown as Record<string, unknown>,
  });
}

describe('the scoreboard', () => {
  const view = completedTest();

  it('shows the same score the innings list holds, not the API side aggregate', () => {
    render(<MatchScoreboard view={view} matchId="sr:match:1" />);
    // Each appears twice: once as the side's headline and once in the innings strip.
    expect(screen.getAllByText('238/10').length).toBeGreaterThan(0);
    expect(screen.getAllByText('487/6').length).toBeGreaterThan(0);
    // The aggregates must not appear anywhere on the board.
    expect(screen.queryByText('342/10')).not.toBeInTheDocument();
    expect(screen.queryByText('637/6')).not.toBeInTheDocument();
  });

  it('prints all four innings for a multi-innings match', () => {
    const { container } = render(<MatchScoreboard view={view} matchId="sr:match:1" />);
    expect(screen.getByText('150/10')).toBeInTheDocument();
    expect(screen.getByText('104/10')).toBeInTheDocument();
    const strip = container.querySelector('.mc-innings-strip') as HTMLElement;
    // One row per innings, each labelled with its innings number and its own score and
    // overs — so a four-innings Test does not collapse into one aggregate per side.
    expect(strip.querySelectorAll('li')).toHaveLength(4);
    const text = strip.textContent ?? '';
    expect(text).toContain('1st');
    expect(text).toContain('2nd');
    expect(text).toContain('3rd');
    expect(text).toContain('4th');
    expect(text).toContain('49.4 ov');
    expect(text).toContain('134.3 ov');
  });

  it('marks the winner and shows the official result', () => {
    render(<MatchScoreboard view={view} matchId="sr:match:1" />);
    expect(screen.getByText('Winner')).toBeInTheDocument();
    expect(screen.getByText('India won by 295 runs')).toBeInTheDocument();
  });

  it('does not state the result twice', () => {
    render(<MatchScoreboard view={view} matchId="sr:match:1" />);
    const banner = screen.getByRole('status');
    expect(within(banner).getAllByText(/India won by 295 runs/)).toHaveLength(1);
  });

  it('never labels a side as batting on a completed match', () => {
    render(<MatchScoreboard view={view} matchId="sr:match:1" />);
    expect(screen.queryByText('Batting')).not.toBeInTheDocument();
  });

  it('keeps delivery-aware overs rather than rounding them to a completed over', () => {
    render(<MatchScoreboard view={view} matchId="sr:match:1" />);
    expect(screen.getByText('(134.3 ov)')).toBeInTheDocument();
    expect(screen.getByText('(58.4 ov)')).toBeInTheDocument();
  });
});

describe('the scoreboard for a match with no innings', () => {
  const upcoming = buildMatchViewModel({
    match: {
      matchId: 'sr:match:2',
      status: 'upcoming',
      matchStatus: 'not_started',
      teams: ['MIS', 'SUR'],
      teamNames: ['Mississauga Bangla Tigers', 'Surrey Jaguars'],
      teamScores: null,
      periodScores: null,
      scheduled: '2026-07-31T15:00:00+00:00',
      lastEvent: { over: 0, runs: 0, type: 'none' },
    } as unknown as Record<string, unknown>,
    timeline: null,
  });

  it('says yet to start rather than printing a dash or a zero', () => {
    render(<MatchScoreboard view={upcoming} matchId="sr:match:2" />);
    expect(screen.getAllByText('Yet to start')).toHaveLength(2);
    expect(screen.queryByText('0/0')).not.toBeInTheDocument();
  });

  it('shows no winner marker', () => {
    render(<MatchScoreboard view={upcoming} matchId="sr:match:2" />);
    expect(screen.queryByText('Winner')).not.toBeInTheDocument();
  });
});

/* ─── Match info ──────────────────────────────────────────────────── */

describe('match info', () => {
  it('lists the real facts and omits the ones the API never stated', () => {
    const view = completedTest();
    const { container } = render(<MatchInfo view={view} />);
    const text = container.textContent ?? '';
    // The toss and winner are resolved from the provider's stable competitor ids.
    expect(text).toContain('India won the toss and chose to bat');
    expect(text).toContain('India won by 295 runs');
    expect(text).toContain('Border-Gavaskar Trophy');
    expect(text).toContain('Optus Stadium');
    // Every label has a real value behind it.
    expect(screen.getByText('Tournament')).toBeInTheDocument();
    expect(screen.getByText('Result')).toBeInTheDocument();
    expect(screen.getByText('Winner')).toBeInTheDocument();
    expect(screen.getByText('Toss')).toBeInTheDocument();
  });

  it('does not print a dash or a placeholder for anything', () => {
    const view = buildMatchViewModel({
      match: {
        matchId: 'sr:match:3',
        status: 'upcoming',
        teams: ['A', 'B'],
        teamNames: ['Alpha', 'Beta'],
        teamScores: null,
        periodScores: null,
        lastEvent: { over: 0, runs: 0, type: 'none' },
      } as unknown as Record<string, unknown>,
      timeline: null,
    });
    render(<MatchInfo view={view} />);
    const text = document.body.textContent ?? '';
    expect(text).not.toContain('undefined');
    expect(text).not.toContain('null');
    expect(text).not.toMatch(/TBA/);
    expect(screen.queryByText('Tournament')).not.toBeInTheDocument();
  });
});

/* ─── Sidebar ─────────────────────────────────────────────────────── */

describe('the other-matches rail', () => {
  const rows: Match[] = [
    { matchId: 'm1', status: 'completed', teams: { home: { code: 'AAA', name: 'Alpha', score: '140/4', overs: '20' }, away: { code: 'BBB', name: 'Beta', score: '120/6', overs: '20' } }, teamNames: ['Alpha', 'Beta'], tournament: 'Series X', scheduled: '2026-01-01T10:00:00Z' } as unknown as Match,
    { matchId: 'm2', status: 'live', teams: { home: { code: 'CCC', name: 'Gamma', score: '80/1', overs: '10.2' }, away: { code: 'DDD', name: 'Delta', score: '60/0', overs: '9' } }, teamNames: ['Gamma', 'Delta'], tournament: 'Series X', scheduled: '2026-01-02T10:00:00Z' } as unknown as Match,
    { matchId: 'm3', status: 'upcoming', teams: ['EEE', 'FFF'], teamNames: ['Epsilon', 'Zeta'], tournament: 'Series X', scheduled: '2026-01-03T10:00:00Z' } as unknown as Match,
  ];

  it('lists live first, then upcoming, then results', () => {
    render(<OtherMatches matches={rows} currentMatchId="other" viewAllHref="/matches" />);
    // Only the fixture cards, not the rail's own "View all" link.
    const hrefs = screen
      .getAllByRole('link')
      .map((l) => l.getAttribute('href'))
      .filter((href) => href?.startsWith('/matches/'));
    expect(hrefs[0]).toBe('/matches/m2');
    expect(hrefs[1]).toBe('/matches/m3');
    expect(hrefs[2]).toBe('/matches/m1');
  });

  it('excludes the match being viewed', () => {
    render(<OtherMatches matches={rows} currentMatchId="m1" viewAllHref="/matches" />);
    expect(screen.queryByRole('link', { name: /Alpha/ })).not.toBeInTheDocument();
  });

  it('never lists the same fixture twice, whatever the key', () => {
    const duplicated = [rows[0], rows[0], rows[1]];
    const { container } = render(
      <OtherMatches matches={duplicated} currentMatchId="other" viewAllHref="/matches" />,
    );
    const hrefs = [...container.querySelectorAll('a')]
      .map((a) => a.getAttribute('href'))
      .filter((href) => href?.startsWith('/matches/'));
    expect(hrefs).toHaveLength(2);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('says so when the competition has no other fixtures', () => {
    render(<OtherMatches matches={[]} currentMatchId="m1" viewAllHref="/matches" />);
    expect(screen.getByText(/No other fixtures/)).toBeInTheDocument();
  });
});

/* ─── Empty states ────────────────────────────────────────────────── */

describe('empty states', () => {
  it('omits the related-news rail entirely when nothing is linked to the match', () => {
    const { container } = render(
      <RelatedMatchNews articles={[]} loading={false} viewAllHref="/news/by/match/m1" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows a loading rail rather than nothing while the query is in flight', () => {
    render(<RelatedMatchNews articles={[]} loading viewAllHref={null} />);
    expect(screen.getByText('Related News')).toBeInTheDocument();
  });

  it('renders a story with a real headline and date when one exists', () => {
    const articles = [
      { id: 'n1', title: 'Headline here', date: '2026-09-30', category: 'Analysis', author: 'A', readTime: '3 min', excerpt: '', content: '', slug: 'headline-here' } as unknown as NewsArticle,
    ];
    render(<RelatedMatchNews articles={articles} loading={false} viewAllHref="/x" />);
    expect(screen.getByText('Headline here')).toBeInTheDocument();
  });

  it('explains an absent scorecard instead of rendering an empty table', () => {
    const view = buildMatchViewModel({
      match: {
        matchId: 'sr:match:9',
        status: 'upcoming',
        teams: ['A', 'B'],
        teamNames: ['Alpha', 'Beta'],
        teamScores: null,
        periodScores: null,
        lastEvent: { over: 0, runs: 0, type: 'none' },
      } as unknown as Record<string, unknown>,
      timeline: null,
    });
    render(<MatchScorecardTab cards={[]} view={view} />);
    expect(screen.getByText('Scorecard not published yet')).toBeInTheDocument();
  });

  it('explains absent playing XIs', () => {
    render(
      <MatchSquadsTab
        home={[]}
        away={[]}
        homeName="Alpha"
        awayName="Beta"
        isUpcoming
      />,
    );
    expect(screen.getByText('Playing XIs not published yet')).toBeInTheDocument();
  });

  it('says the squads are derived from the scorecard, rather than implying an official sheet', () => {
    render(
      <MatchSquadsTab
        home={[{ id: 'p1', name: 'A Player', order: 1, runs: 40, wickets: null, batting: true }]}
        away={[]}
        homeName="Alpha"
        awayName="Beta"
      />,
    );
    expect(screen.getByText(/derived from the published scorecard/)).toBeInTheDocument();
  });

  it('returns empty squads rather than guessing one from an empty payload', () => {
    expect(readSquads(null)).toEqual({ home: [], away: [] });
    expect(readSquads({ sport_event: {} })).toEqual({ home: [], away: [] });
  });
});

/* ─── Formatting helpers ──────────────────────────────────────────── */

describe('match-centre formatting', () => {
  it('formats a dismissal over from the provider one-based pair', () => {
    expect(dismissalOvers(1, 1)).toBe('0.1');
    expect(dismissalOvers(50, 4)).toBe('49.4');
  });

  it('labels innings ordinally', () => {
    expect(ordinalInnings(1)).toBe('1st');
    expect(ordinalInnings(4)).toBe('4th');
  });

  it('splits a score into runs and wickets, and copes with a bare total', () => {
    expect(splitScore('150/10')).toEqual({ runs: '150', wickets: '10' });
    expect(splitScore('287')).toEqual({ runs: '287', wickets: null });
  });

  it('renders a date and time in the venue zone, deterministically', () => {
    const iso = '2025-02-19T09:00:00+00:00';
    const utc = formatVenueDate(iso, 'UTC');
    const perth = formatVenueDate(iso, 'Australia/Perth');
    expect(utc).toBe('Wed, 19 Feb 2025');
    // Perth is UTC+8, so the calendar day moves.
    expect(perth).toContain('19 Feb 2025');
    expect(formatVenueTime(iso, 'UTC')).toBe('09:00');
    expect(formatVenueTime(iso, 'Australia/Perth')).toBe('17:00');
  });

  it('returns an empty string rather than "Invalid Date" for junk', () => {
    expect(formatVenueDate('not-a-date', 'UTC')).toBe('');
    expect(formatVenueTime(undefined, 'UTC')).toBe('');
  });

  it('falls back to the zone id when it has no short name', () => {
    expect(timeZoneLabel('')).toBe('');
    expect(timeZoneLabel('Not/AZone')).toBe('Not/AZone');
  });
});

/* ─── The news link contract the existing suite enforces ─────────── */

describe('the match page still passes a limit and a view-all link', () => {
  const source = readFileSync(
    join(__dirname, '..', 'components', 'boards', 'MatchDetailBody.tsx'),
    'utf8',
  );

  it('passes a limit to the sidebar news panel', () => {
    expect(source).toMatch(/limit=\{\d+\}/);
  });

  it('builds the match news archive link from the match id', () => {
    expect(source).toContain("entityNewsHref('match'");
  });
});

/* ─── The page never fetches the match twice ──────────────────────── */

describe('no duplicate match request', () => {
  const source = readFileSync(
    join(__dirname, '..', 'app', 'matches', '[id]', 'page.tsx'),
    'utf8',
  );

  it('fetches the match once per server entry point', () => {
    const calls = source.match(/fetchMatchById\(/g) ?? [];
    expect(calls).toHaveLength(2); // generateMetadata + the page itself
  });

  it('hands the server payload to the client instead of refetching it', () => {
    expect(source).toContain('match={match}');
    // The client is given the trimmed context, never the whole event list.
    expect(source).toContain('matchContext={slimTimelinePayload(payload)}');
  });

  it('never puts the ball events in the document', () => {
    // The events are 96% of a Test's timeline payload and are only needed by the
    // commentary tab, so they are fetched there rather than shipped on page load.
    expect(source).toContain('timelineHasEvents(payload)');
    expect(source).not.toContain('initialTimeline=');
  });
});

/* ─── A component render smoke test through the harness ───────────── */

describe('a full rail render', () => {
  it('does not throw and stays inside its container', async () => {
    const view = completedTest();
    const { container } = renderWithProviders(
      <div>
        <OtherMatches
          matches={[
            { matchId: 'x1', status: 'live', teams: { home: { code: 'A', name: 'Alpha', score: '10/0', overs: '1' }, away: { code: 'B', name: 'Beta', score: '0/0', overs: '0' } }, teamNames: ['Alpha', 'Beta'], tournament: 'S', scheduled: '2026-01-01T00:00:00Z' } as unknown as Match,
          ]}
          currentMatchId="sr:match:1"
          viewAllHref="/matches"
        />
        <MatchScoreboard view={view} matchId="sr:match:1" />
      </div>,
    );
    await waitFor(() => expect(screen.getByText('Other Matches')).toBeInTheDocument());
    expect(container.querySelector('.mc-other-match')).not.toBeNull();
  });
});
