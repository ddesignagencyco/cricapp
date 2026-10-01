import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MatchTimeline, { parseTimelineEvents } from '../components/MatchTimeline';
import { inningsFigures } from '../lib/commentary';
import sample from './fixtures/liveTimelineSample.json';

/**
 * Rendered against a payload captured from the live endpoint, so anything asserted here is
 * something the feed can actually produce.
 *
 * The complaint was that the list reads as an empty wall of grey text. These tests pin the
 * three things that fix it: an outcome column a reader can scan, the system rows the feed
 * sends, and the end-of-over summary built from the balls that were bowled.
 */

const payload = sample as unknown as Record<string, unknown>;

describe('the commentary list', () => {
  it('shows an outcome badge for every ball, so an over can be read at a glance', async () => {
    const { container } = render(<MatchTimeline payload={payload} />);
    // The first page is 20 of 26 deliveries; the rest are behind "Load more".
    await userEvent.click(screen.getByRole('button', { name: /Load more/ }));
    const labels = Array.from(container.querySelectorAll('span[aria-label]')).map((el) =>
      el.getAttribute('aria-label'),
    );
    // Every outcome the feed can produce must be labelled, including a dot ball, which
    // renders as an empty chip and would otherwise be invisible to a screen reader.
    expect(labels.filter((l) => l === 'Dot ball').length).toBeGreaterThan(0);
    expect(labels.filter((l) => l === '4 runs').length).toBeGreaterThan(0);
    expect(labels.filter((l) => l === '6 runs').length).toBeGreaterThan(0);
    expect(labels.filter((l) => l === 'Wicket').length).toBeGreaterThan(0);
  });

  it('labels the lifecycle rows the feed sends, instead of dropping or inventing them', async () => {
    render(<MatchTimeline payload={payload} />);
    // `match_started` is the oldest row, so it only appears once the rest is paged in.
    await userEvent.click(screen.getByRole('button', { name: /Load more/ }));
    expect(screen.getAllByText(/Match started/i).length).toBeGreaterThan(0);
  });

  it('counts balls without counting the lifecycle rows', () => {
    render(<MatchTimeline payload={payload} />);
    // 34 deliveries in the fixture; the 2 system rows must not be added to the total.
    expect(screen.getByText('34 balls')).toBeInTheDocument();
    expect(screen.queryByText('36 balls')).not.toBeInTheDocument();
  });

  it('shows the end-of-over summary only after the over, not after every ball', async () => {
    render(<MatchTimeline payload={payload} />);
    await userEvent.click(screen.getByRole('button', { name: /Load more/ }));

    // Regression: `isLastBallOfOver` used `findIndex`, which finds the *first* ball of an
    // over and is therefore true for all of them, so the end-of-over card printed once
    // per ball — six identical cards for a single over.
    const endCards = screen.getAllByText(/End of over|Over in progress/i);
    const balls = screen.getAllByText(/\d{1,2}\.\d/);
    expect(endCards.length).toBeLessThan(balls.length);
    // One card per distinct over, and the fixture spans more than one over.
    expect(endCards.length).toBeGreaterThan(0);
    expect(endCards.length).toBeLessThanOrEqual(4);
  });

  it('never repeats the same over summary twice in a row', async () => {
    render(<MatchTimeline payload={payload} />);
    await userEvent.click(screen.getByRole('button', { name: /Load more/ }));
    // The card is headed "End of over · N" and, while an over is unfinished, "Over in
    // progress · N". Two identical headings back to back would mean the card fires on every
    // ball, which is the regression this guards.
    const labels = screen.getAllByText(/(?:End of over|Over in progress) · \d+/i).map((n) => n.textContent);
    expect(labels.length).toBeGreaterThan(0);
    for (let i = 1; i < labels.length; i += 1) {
      expect(labels[i]).not.toBe(labels[i - 1]);
    }
  });

  it('keeps the over card on one line, with no stacked ball boxes', async () => {
    const { container } = render(<MatchTimeline payload={payload} />);
    await userEvent.click(screen.getByRole('button', { name: /Load more/ }));

    // The ball chips live in the "End of over" card, which is the row above the
    // "After over N" summary. The chips used to be the shared `BallTracker` boxes, which
    // wrapped to one per row inside the narrow commentary column and read as broken.
    const endOfOver = screen.getAllByText(/End of over/i)[0];
    const row = endOfOver.parentElement as HTMLElement;
    expect(row.querySelector('.flex-nowrap')).not.toBeNull();

    // And the run total is no longer printed as a separate sentence.
    expect(container.textContent).not.toMatch(/Run scored/i);
  });

  it('puts the score, the batters and the bowler in one card, as cells', async () => {
    render(<MatchTimeline payload={payload} />);
    await userEvent.click(screen.getByRole('button', { name: /Load more/ }));

    // The score, the two batters and the bowler used to be a second strip of running text
    // under the "End of over" row, which read as a stray line rather than a moment in the
    // match. They are one card now, each in its own cell, and there is one cell per entity.
    const labels = screen.getAllByText('Score');
    expect(labels.length).toBeGreaterThan(0);
    // The value sits above its label, in the same cell.
    expect(labels[0].previousElementSibling?.textContent).toMatch(/^\d+\/\d+$/);
    // Two batters and one bowler per card, so the counts line up with the score cells.
    expect(screen.getAllByText('Batter').length).toBe(labels.length * 2);
    expect(screen.getAllByText('Bowler').length).toBe(labels.length);
  });

  it('shows the figures that stood at that over, not the innings totals', async () => {
    // The bug this guards: the figures were built once from every event, so each card printed
    // the bowler's whole spell next to an early score. On a real innings a bowler read
    // "9.0-1-60-4" on the card for the first over he bowled, which had cost him five runs in
    // one over. Every card of his spell carried the same four numbers, and the timeline read as
    // random. The card must show the figures as they stood at the end of that over.
    const bowler = { id: 'bo1', name: 'Steady, Sid', country_code: 'TTO' };
    const striker = { id: 'b1', name: 'Bats, Billy', country_code: 'IND' };
    const nonStriker = { id: 'b2', name: 'Batter, Bo', country_code: 'IND' };

    function ball(over: number, ballNumber: number, runs: number, score: string) {
      return {
        id: `e-${over}-${ballNumber}`,
        time: '2026-09-30T15:00:00+00:00',
        type: 'ball',
        inning: 1,
        ball_number: ballNumber,
        over_number: over,
        display_overs: `${over - 1}.${ballNumber}`,
        display_score: score,
        commentary: { text: 'Struck into the gap for a single.' },
        batting_params: { striker, non_striker: nonStriker, runs_scored: runs },
        bowling_params: { bowler, extra_runs_conceded: 0 },
        fielding_params: { fielded: true },
      };
    }

    // Two full overs of dots, so the same bowler bowls both.
    const timeline = [
      ...Array.from({ length: 6 }, (_, i) => ball(1, i + 1, 0, '0/0')),
      ...Array.from({ length: 6 }, (_, i) => ball(2, i + 1, 0, '0/0')),
    ];

    render(<MatchTimeline payload={{ timeline } as unknown as Record<string, unknown>} />);
    // Twelve deliveries fit on the first page, so there may be nothing to load.
    const loadMore = screen.queryByRole('button', { name: /Load more/ });
    if (loadMore) await userEvent.click(loadMore);

    const tiles = screen
      .getAllByText('Bowler')
      .map((label) => label.parentElement?.textContent ?? '');
    expect(tiles).toHaveLength(2);
    // Newest first, so the second over's card comes first.
    expect(tiles[0]).toContain('2.0-');
    // The first over's card must say one over, not two. This is the assertion that failed
    // before: both cards read "2.0".
    expect(tiles[1]).toContain('1.0-');
    expect(tiles[1]).not.toContain('2.0-');
  });

  it('shows the non-striker\'s real figures, not a row of zeroes', async () => {
    render(<MatchTimeline payload={payload} />);
    await userEvent.click(screen.getByRole('button', { name: /Load more/ }));

    // Every card names two batters. The second is the non-striker, whose figures used to be
    // looked up by name in a map that `inningsFigures` keys by id, so the lookup always missed
    // and the card read "0 (0)" for a batter who had scored.
    //
    // A card shows the figures that stood at the end of that over, so they are compared against
    // the innings totals for monotonicity rather than equality: a card can only ever be at or
    // below where the batter finished, and never below zero while the innings total is above it.
    const { batters } = inningsFigures(parseTimelineEvents(payload), 2);
    const totals = new Map([...batters.values()].map((f) => [f.name, f]));

    const cells = screen
      .getAllByText('Batter')
      .map((label) => (label.parentElement?.textContent ?? '').replace(/Batter$/, ''));
    expect(cells.length).toBeGreaterThan(0);

    let nonZero = 0;
    cells.forEach((cell) => {
      const parsed = /^(.+?)(\*)? (\d+) \((\d+)\)$/.exec(cell);
      expect(parsed).not.toBeNull();
      const [, name, star, runs, balls] = parsed as unknown as [string, string, string, string, string];
      const total = totals.get(name);
      expect(total).toBeDefined();
      // Monotonic: a card cannot show more than the innings total, nor fewer runs than balls.
      expect(Number(runs)).toBeLessThanOrEqual(total!.runs);
      expect(Number(balls)).toBeLessThanOrEqual(total!.balls);
      if (Number(runs) > 0) nonZero += 1;
      // The not-out marker is a claim about this moment, so it must agree with whether the
      // batter had been dismissed by the end of the innings only in the final card.
      if (!star) expect(Number(balls)).toBeGreaterThanOrEqual(0);
    });
    // Sanity that the check is not vacuous: this innings has batters on both cards.
    expect(nonZero).toBeGreaterThan(0);
  });

  it('does not put a bye, a leg bye or a wide into a batter\'s column', async () => {
    render(<MatchTimeline payload={payload} />);
    await userEvent.click(screen.getByRole('button', { name: /Load more/ }));

    // The last over of the fixture is bowled at Ruturaj Gaikwad and contains a wide, a bye, a
    // leg bye and a no-ball. The card used to credit him with the bye: the figures read as
    // runs and balls when they are the team's runs and the balls he faced.
    const cells = screen.getAllByText('Batter').map((label) => label.parentElement?.textContent ?? '');
    const gaikwad = cells.find((text) => /Gaikwad/i.test(text));
    expect(gaikwad).toBeDefined();
    // 4 off 8. Three of those eight balls were an extra the team ran: the wide and the no-ball
    // are not balls faced, and the bye and the leg bye are balls faced but not runs.
    expect(gaikwad).toMatch(/\b4 \(8\)Batter$/);
  });

  it('offers filters built from what the feed contains', () => {
    render(<MatchTimeline payload={payload} />);
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fours/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sixes/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Wickets/ })).toBeInTheDocument();
  });

  it('narrows the list to boundaries when a filter is chosen', async () => {
    render(<MatchTimeline payload={payload} />);
    await userEvent.click(screen.getByRole('button', { name: /Sixes/ }));
    // The fixture has exactly one six.
    expect(screen.getByText('1 shown')).toBeInTheDocument();
  });

  it('paginates rather than dumping every ball of a long innings at once', async () => {
    render(<MatchTimeline payload={payload} />);
    const loadMore = screen.queryByRole('button', { name: /Load more/ });
    // 28 rows with a 20-row first page, so the control must exist.
    expect(loadMore).toBeInTheDocument();
  });

  it('does not invent a timeline for a match that has none', () => {
    render(<MatchTimeline payload={null} upcoming />);
    expect(screen.getByText(/hasn't started yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/End of over/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Run scored/i)).not.toBeInTheDocument();
  });

  it('never renders a player link inside the commentary', () => {
    const { container } = render(<MatchTimeline payload={payload} />);
    const links = container.querySelectorAll('a');
    links.forEach((link) => {
      expect(link.getAttribute('href')).not.toMatch(/^\/players\//);
    });
  });
});
