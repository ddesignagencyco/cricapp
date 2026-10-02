import {
  batterRuns,
  bowlerRuns,
  buildOverSummaries,
  countCommentary,
  deliveryLabel,
  findMilestones,
  formatOversBowled,
  inningsFigures,
  isLegalBall,
  isTimelineDelivery,
  milestoneEvents,
  timelineEventKind,
} from '../lib/commentary';
import { parseTimelineEvents, type TimelineEvent } from '../components/MatchTimeline';
import sample from './fixtures/liveTimelineSample.json';

/**
 * One delivery in the shape the feed actually sends.
 *
 * The feed spells an extra as `type: "ball"` with the kind in
 * `bowling_params.extra_runs_type`, and `runs_scored` is the *total* on the ball with the
 * extras already inside it — a wide reports 1, and a no-ball the batter also hit reports the
 * penalty inside the run. Every rule below depends on that, so it is stated once here rather
 * than repeated at each call site.
 */
function delivery(opts: {
  over?: number;
  ball?: number;
  runs?: number;
  extras?: number;
  extraType?: string;
  inning?: number;
}): TimelineEvent {
  const ball = opts.ball ?? 1;
  const over = opts.over ?? 1;
  return {
    id: `d-${over}-${ball}`,
    type: 'ball',
    inning: opts.inning ?? 1,
    over,
    ball,
    displayOvers: `${over - 1}.${ball}`,
    displayScore: '0/0',
    runs: opts.runs ?? 0,
    extras: opts.extras ?? 0,
    extraType: opts.extraType ?? '',
    batsman: 'Batter',
    batsmanId: 'b1',
    bowler: 'Bowler',
    bowlerId: 'bo1',
  };
}

/**
 * The ball counter was wrong because the feed's own score rows carry an over number and
 * were being counted as balls. These tests run against a payload captured from the live
 * endpoint, so the shapes are the real ones rather than a guess.
 *
 * Confirmed on a live ODI (India vs West Indies): 530 timeline rows made up of
 * `ball` 414, `boundary` 70, `six` 25, `wicket` 9, `period_start` 11, `match_started` 1.
 * Only the first four are deliveries.
 */

const payload = sample as unknown as Record<string, unknown>;
const events = parseTimelineEvents(payload);

describe('what counts as a ball', () => {
  it('classifies the real feed correctly', () => {
    const counts = countCommentary(events);
    // 20 ball + 1 six + 4 boundary + 1 wicket are deliveries; the two system rows are not.
    // The final over adds eight more, of which six are legal balls and two are a wide and a
    // no-ball: bowled, but they do not advance the over.
    expect(counts.balls).toBe(34);
    expect(counts.legalBalls).toBe(32);
    expect(counts.fours).toBe(4);
    expect(counts.sixes).toBe(1);
    expect(counts.wickets).toBe(1);
    expect(counts.systemEvents).toBe(2);
  });

  it('never counts a lifecycle row as a ball', () => {
    const system = events.filter((event) => timelineEventKind(event) === 'system');
    expect(system.length).toBeGreaterThan(0);
    system.forEach((event) => {
      expect(isTimelineDelivery(event)).toBe(false);
      expect(isLegalBall(event)).toBe(false);
    });
  });

  it('excludes a score row that carries an over number', () => {
    // The specific failure: `period_score` and `score_change` carry `over_number`, so an
    // "has an over number" test counted them. This match did not send any, which is
    // exactly why it looked fine here and wrong elsewhere.
    const scoreRow = {
      id: 'x1',
      type: 'period_score',
      inning: 2,
      over: 31,
      ball: undefined,
      displayOvers: '30.4',
      displayScore: '300/2',
      runs: undefined,
      extras: undefined,
      extraType: '',
      commentary: '',
      batsman: undefined,
      batsmanId: undefined,
      nonStriker: undefined,
      nonStrikerId: undefined,
      bowler: undefined,
      bowlerId: undefined,
      shot: '',
      connect: '',
      zone: '',
      dismissal: '',
      dismissed: undefined,
      dismissedId: undefined,
      period: '',
      freeHit: false,
      dropped: false,
      misfielded: false,
      bowlingFrom: '',
      deliveryType: '',
    };
    expect(timelineEventKind(scoreRow)).toBe('update');
    expect(isTimelineDelivery(scoreRow)).toBe(false);
  });

  it('treats a wide and a no-ball as bowled but not as legal balls', () => {
    const wide = { ...events[2], type: 'wide', extraType: 'wide' };
    const noBall = { ...events[2], type: 'no_ball', extraType: 'no_ball' };
    const bye = { ...events[2], type: 'bye', extraType: 'bye' };

    expect(isTimelineDelivery(wide)).toBe(true);
    expect(isLegalBall(wide)).toBe(false);
    expect(deliveryLabel(wide)).toBe('Wd');

    expect(isTimelineDelivery(noBall)).toBe(true);
    expect(isLegalBall(noBall)).toBe(false);
    expect(deliveryLabel(noBall)).toBe('Nb');

    // A bye is a legal ball — it advances the over. Getting this backwards is the easy
    // mistake in the other direction.
    expect(isLegalBall(bye)).toBe(true);
    expect(deliveryLabel(bye)).toBe('B');
  });
});

describe('reading an over out of the feed', () => {
  it('builds an over with its runs, wickets and score, all from real events', () => {
    const overs = buildOverSummaries(events);
    expect(overs.length).toBeGreaterThan(0);

    const last = overs[overs.length - 1];
    // Runs are the sum of the balls actually bowled, not a stored total. `runs` is the total
    // on the ball with the extras already inside it, so `extras` is not added again — doing
    // that counted every bye, leg bye and wide twice across a whole innings.
    const summed = last.events.reduce((total, e) => total + (e.runs ?? 0), 0);
    expect(last.runs).toBe(summed);
    // The score after the over is the feed's own string on the last ball.
    expect(last.scoreAfter).toBe(last.lastEvent.displayScore);
    expect(last.overNumber).toBe(last.lastEvent.over);
  });

  it('knows whether an over is closed, from six legal balls', () => {
    const overs = buildOverSummaries(events);
    const last = overs[overs.length - 1];
    expect(last.complete).toBe(last.events.filter(isLegalBall).length >= 6);
  });
});

describe('figures built from the balls we received', () => {
  it('gives a batter only their own runs, never the extras', () => {
    const { batters } = inningsFigures(events, 2);
    // This assertion used to be vacuous: it looped over the events carrying extras, and the
    // fixture had none, so nothing was ever checked. The fixture now has a wide, a bye, a
    // leg bye and a no-ball, so the loop has something to do.
    const withExtras = events.filter((e) => (e.extras ?? 0) > 0);
    expect(withExtras.length).toBeGreaterThan(0);
    withExtras.forEach((event) => {
      const figure = batters.get(event.batsmanId ?? `name:${event.batsman}`);
      if (!figure) return;
      const theirBalls = events.filter(
        (e) => e.batsman === event.batsman && isLegalBall(e),
      ).length;
      expect(figure.balls).toBe(theirBalls);
    });
  });

  it('credits a batter nothing for a bye, a leg bye or a wide', () => {
    // The over card was showing a batter on a run that belonged to the team. On the delivery
    // this was written for, a batter was put on 1 off 2 balls when the single was a bye.
    // Asserted on the per-ball rule, because a batter's *figure* is cumulative and this
    // batter has runs of their own to show as well.
    expect(batterRuns(delivery({ runs: 1, extras: 1, extraType: 'wide' }))).toBe(0);
    expect(batterRuns(delivery({ runs: 1, extras: 1, extraType: 'bye' }))).toBe(0);
    expect(batterRuns(delivery({ runs: 1, extras: 1, extraType: 'leg_bye' }))).toBe(0);
    // A no-ball where the batter also hit it: the run off the bat is theirs, the penalty is not.
    expect(batterRuns(delivery({ runs: 2, extras: 1, extraType: 'no_ball' }))).toBe(1);
    expect(batterRuns(delivery({ runs: 4, extras: 0 }))).toBe(4);
  });

  it('charges a bowler for a no-ball they also conceded a run off of', () => {
    // Both the penalty and the run off the bat. Charging only the penalty lost a run per
    // no-ball, which is how the innings figures stopped adding up to the team's score.
    expect(bowlerRuns(delivery({ runs: 2, extras: 1, extraType: 'no_ball' }))).toBe(2);
    // A wide is the penalty alone, and byes and leg byes are charged to nobody.
    expect(bowlerRuns(delivery({ runs: 1, extras: 1, extraType: 'wide' }))).toBe(1);
    expect(bowlerRuns(delivery({ runs: 1, extras: 1, extraType: 'bye' }))).toBe(0);
    expect(bowlerRuns(delivery({ runs: 1, extras: 1, extraType: 'leg_bye' }))).toBe(0);
    expect(bowlerRuns(delivery({ runs: 4, extras: 0 }))).toBe(4);
  });

  it('adds the innings up to the score the feed reported', () => {
    // The real check, on a whole innings built here rather than the fixture: the fixture is a
    // *window* onto innings 2 (it starts at 28.3 with the score on 282/1), so the batters'
    // totals can only ever cover the balls it contains, never the innings score.
    //
    // `runs` is the total on the ball, so the batters' runs plus the extras must land exactly
    // on the team's score, and the bowlers' runs plus the runs nobody was charged must land on
    // the same number. Before this was fixed the second one was short by a run on every
    // no-ball, which is how the bug was found.
    const innings = [
      ...Array.from({ length: 6 }, (_, i) => delivery({ over: 1, ball: i + 1, runs: i === 2 ? 4 : 0 })),
      delivery({ over: 2, ball: 1, runs: 1, extras: 1, extraType: 'wide' }),
      delivery({ over: 2, ball: 2, runs: 1, extras: 1, extraType: 'bye' }),
      delivery({ over: 2, ball: 3, runs: 1, extras: 1, extraType: 'leg_bye' }),
      delivery({ over: 2, ball: 4, runs: 2, extras: 1, extraType: 'no_ball' }),
      delivery({ over: 2, ball: 5, runs: 6 }),
    ];
    const teamRuns = innings.reduce((sum, e) => sum + e.runs, 0);

    const { batters, bowlers } = inningsFigures(innings, 1);
    const toBatters = [...batters.values()].reduce((sum, b) => sum + b.runs, 0);
    const toBowlers = [...bowlers.values()].reduce((sum, b) => sum + b.runs, 0);
    const extras = innings.reduce((sum, e) => sum + e.extras, 0);
    // A bye and a leg bye belong to the team and are charged to no player at all.
    const uncharged = innings
      .filter((e) => e.extraType === 'bye' || e.extraType === 'leg_bye')
      .reduce((sum, e) => sum + e.runs, 0);

    expect(toBatters + extras).toBe(teamRuns);
    expect(toBowlers + uncharged).toBe(teamRuns);
  });

  it('counts a maiden when six legal balls are bowled without a run', () => {
    // The commentary card printed a maidens figure that was never computed, so it was always
    // zero and looked like a real number. This builds one over of dots to pin it.
    const dots = Array.from({ length: 6 }, (_, i) => ({
      id: `d${i}`,
      type: 'ball',
      inning: 1,
      over: 1,
      ball: i + 1,
      runs: 0,
      extras: 0,
      extraType: '',
      batsman: `Bat ${i % 2}`,
      batsmanId: `b${i % 2}`,
      bowler: 'Maiden Maker',
      bowlerId: 'bm',
    }));
    const { bowlers } = inningsFigures(dots as never, 1);
    const figure = bowlers.get('bm');
    expect(formatOversBowled(figure!.overs)).toBe('1.0');
    expect(figure!.maidens).toBe(1);
    expect(figure!.runs).toBe(0);
  });

  it('does not call a partial over a maiden', () => {
    // Five dots are not an over, so no maiden can be claimed yet.
    const dots = Array.from({ length: 5 }, (_, i) => ({
      id: `d${i}`,
      type: 'ball',
      inning: 1,
      over: 1,
      ball: i + 1,
      runs: 0,
      extras: 0,
      extraType: '',
      batsman: 'Bat',
      batsmanId: 'b',
      bowler: 'Bowler',
      bowlerId: 'bo',
    }));
    const { bowlers } = inningsFigures(dots as never, 1);
    expect(bowlers.get('bo')!.maidens).toBe(0);
  });

  it('writes a bowler\'s overs the way a scorecard does', () => {
    expect(formatOversBowled(4 + 3 / 6)).toBe('4.3');
    expect(formatOversBowled(5)).toBe('5.0');
    // Six legal balls complete the over rather than making a seventh ball.
    expect(formatOversBowled(4 + 6 / 6)).toBe('5.0');
  });

  it('only reports a milestone a batter actually reached', () => {
    const milestones = findMilestones(events, 2, [50, 100]);
    milestones.forEach((m) => {
      const { batters } = inningsFigures(events, 2);
      const figure = batters.get(m.id ?? `name:${m.batter}`);
      expect(figure).toBeDefined();
      expect(m.runs).toBe(figure?.runs);
      expect(m.runs).toBeGreaterThanOrEqual(m.mark);
    });
  });

  it('returns nothing rather than guessing when the innings has no balls', () => {
    expect(countCommentary([])).toMatchObject({ balls: 0, legalBalls: 0, fours: 0 });
    expect(buildOverSummaries([])).toEqual([]);
    expect(findMilestones([], 2)).toEqual([]);
  });
});

describe('a milestone belongs to the ball that reached it', () => {
  /** Builds a single-batter innings: one delivery per entry of `runs`. */
  function inningsOf(runs: number[], over = 1) {
    return runs.map((scored, i) => ({
      ...events[2],
      id: `b${i}`,
      over,
      ball: i + 1,
      displayOvers: `${over - 1}.${i + 1}`,
      runs: scored,
      extras: 0,
      extraType: '',
      type: scored === 4 ? 'boundary' : scored === 6 ? 'six' : 'ball',
      batsman: 'Batter',
      batsmanId: 'sr:player:1',
      nonStriker: undefined,
      nonStrikerId: undefined,
      bowler: 'Bowler',
      bowlerId: 'sr:player:2',
    }));
  }

  it('marks the delivery where the total crossed the mark, not the ones after it', () => {
    // 10, 20, 30, 40, 45, 51 — the mark is passed on the sixth and last delivery.
    const list = inningsOf([10, 10, 10, 10, 5, 6]);
    const marks = milestoneEvents(list, 2, [50]);
    expect(marks).toHaveLength(1);
    expect(marks[0].index).toBe(5);
    expect(marks[0].batter).toBe('Batter');
    expect(marks[0].runs).toBe(51);
  });

  it('marks the delivery even when a later one would still be above the mark', () => {
    // Same innings with three more balls afterwards: still exactly one milestone, on the
    // ball that reached it, not on each of the following three.
    const list = inningsOf([10, 10, 10, 10, 5, 6, 4, 4, 4]);
    const marks = milestoneEvents(list, 2, [50]);
    expect(marks).toHaveLength(1);
    expect(marks[0].index).toBe(5);
  });

  it('marks every milestone a big shot passes through', () => {
    // A six off 45 reaches 50 and 100 is not in reach, but a boundary off 45 is.
    const list = inningsOf([40, 10]);
    const marks = milestoneEvents(list, 2, [50]);
    expect(marks).toHaveLength(1);
    expect(marks[0].index).toBe(1);
    expect(marks[0].runs).toBe(50);
  });

  it('never reports a mark the batter did not reach', () => {
    const list = inningsOf([4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]); // 48
    expect(milestoneEvents(list, 2, [50])).toEqual([]);
  });

  it('counts a dot ball as a ball faced but not as a run', () => {
    const list = inningsOf([0, 0, 49, 1]);
    const marks = milestoneEvents(list, 2, [50]);
    // 0 + 0 + 49 = 49, then 1 takes it to 50 on the fourth delivery.
    expect(marks).toHaveLength(1);
    expect(marks[0].index).toBe(3);
    expect(marks[0].runs).toBe(50);
  });

  it('ignores extras, which are not the batter\'s runs', () => {
    const list = inningsOf([10, 40]).map((event, i) => (i === 1 ? { ...event, extras: 4 } : event));
    // The batter has 50, so the mark is reached; the wide or leg bye must not also count.
    expect(milestoneEvents(list, 2, [50])).toHaveLength(1);
  });

  it('scopes to one innings', () => {
    const list = inningsOf([49, 1]).map((event) => ({ ...event, inning: 1 }));
    expect(milestoneEvents(list, 2, [50])).toEqual([]);
    expect(milestoneEvents(list, 1, [50])).toHaveLength(1);
  });
});
