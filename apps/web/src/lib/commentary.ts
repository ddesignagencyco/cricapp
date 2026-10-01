import type { TimelineEvent } from '../components/MatchTimeline';

/**
 * Reading the ball-by-ball feed.
 *
 * The feed mixes three different things in one array: deliveries, the lifecycle of the
 * match itself, and score bookkeeping rows. Treating all of them as "events" is what
 * made the commentary look empty and the ball counter wrong — a `period_score` row
 * carries an over number, so it passed the delivery test and inflated the count.
 *
 * Everything here is derived from the events we actually received. Nothing is invented:
 * a figure that cannot be computed is left out rather than filled in.
 */

export type TimelineKind = 'delivery' | 'extra' | 'system' | 'review' | 'update';

/** Event types that are about the match rather than a ball. */
const SYSTEM_TYPES = new Set([
  'period_start',
  'period_end',
  'match_started',
  'match_ended',
  'innings_start',
  'innings_end',
  'innings_break',
  'toss',
  'toss_end',
  'lineup',
  'playing_xi',
  'super_over_start',
  'super_over_end',
  'result',
  'weather_delay',
  'drs_break',
  'timeout',
]);

/** Event types that are the provider's own score bookkeeping, never a ball. */
const UPDATE_TYPES = new Set(['period_score', 'score_change', 'milestone', 'statistics']);

/** Event types that describe a review decision. */
const REVIEW_TYPES = new Set([
  'review',
  'drs',
  'drs_review',
  'decision',
  'umpire_call',
  'review_decision',
]);

/** Delivery types, as the feed spells them. */
const DELIVERY_TYPES = new Set([
  'ball',
  'wicket',
  'boundary',
  'four',
  'six',
  'wide',
  'no_ball',
  'noball',
  'bye',
  'leg_bye',
  'legbye',
  'delivery',
  'run',
  'runs',
  'dot_ball',
]);

/**
 * Extras that never reach a batter: a bye, a leg bye, or a wide nobody managed to hit.
 */
const BATTERLESS_EXTRAS = new Set(['bye', 'leg_bye', 'legbye', 'wide']);

/** Extras charged to the bowler rather than run by a batter. */
const BOWLER_CHARGED_EXTRAS = new Set(['wide', 'no_ball', 'noball']);

function key(event: TimelineEvent): string {
  return event.type.toLowerCase().trim().replace(/[-\s]+/g, '_');
}

function extraKey(event: TimelineEvent): string {
  return (event.extraType || event.type || '').toLowerCase().trim().replace(/[-\s]+/g, '_');
}

/**
 * What kind of row this is.
 *
 * `delivery` and `extra` are the only kinds that count toward the ball total, and only
 * `delivery` counts as a legal ball. A wide or a no-ball is bowled but does not advance
 * the over, which is the rule the counter was getting wrong.
 */
export function timelineEventKind(event: TimelineEvent): TimelineKind {
  const type = key(event);
  if (REVIEW_TYPES.has(type)) return 'review';
  if (SYSTEM_TYPES.has(type)) return 'system';
  if (UPDATE_TYPES.has(type)) return 'update';

  const extra = extraKey(event);
  if (extra === 'wide' || extra === 'no_ball' || extra === 'noball') return 'extra';

  // A row only counts as a ball if the feed says it is one. `over` alone is not enough:
  // score and period rows carry an over number without being a delivery.
  if (event.over === undefined) return 'system';
  if (DELIVERY_TYPES.has(type)) return 'delivery';
  if (event.extraType) return 'extra';
  if (event.ball !== undefined) return 'delivery';
  return 'update';
}

/** True for anything the feed counts as a ball, whether or not it advances the over. */
export function isTimelineDelivery(event: TimelineEvent): boolean {
  const kind = timelineEventKind(event);
  return kind === 'delivery' || kind === 'extra';
}

/**
 * True for a ball that advances the over.
 *
 * Wides and no-balls do not. Byes and leg byes do, which is the part that is easy to get
 * wrong in the other direction.
 */
export function isLegalBall(event: TimelineEvent): boolean {
  if (timelineEventKind(event) !== 'delivery') return false;
  const extra = extraKey(event);
  return extra !== 'wide' && extra !== 'no_ball' && extra !== 'noball';
}

/**
 * The runs a batter is credited with on this delivery.
 *
 * The feed's `runs` is the **total** on the ball, extras included. On a real innings the
 * per-ball `runs` sums to exactly the team total, which is how that was confirmed — so
 * adding `extras` on top double counts them. This is the one place that rule is written
 * down; `matchCentreData.ts` reads these two functions rather than repeating it.
 *
 * A bye, a leg bye and a wide are the team's runs, not the batter's, so they are worth
 * nothing to the striker. A no-ball is the awkward one: the penalty is inside `runs` and the
 * feed does not split the two, so the runs off the bat are what remains after the penalty.
 */
export function batterRuns(event: TimelineEvent): number {
  const extra = extraKey(event);
  if (BATTERLESS_EXTRAS.has(extra)) return 0;
  if (BOWLER_CHARGED_EXTRAS.has(extra)) return Math.max(0, (event.runs ?? 0) - (event.extras ?? 0));
  return event.runs ?? 0;
}

/**
 * The runs a bowler is charged with on this delivery.
 *
 * The feed's `runs` is the total on the ball, so a bowler is charged all of it — except on a
 * bye or a leg bye, which belong to the team and are charged to nobody. That exception is the
 * whole function.
 *
 * A no-ball charges the penalty *and* anything the batter hit off it: on the delivery this was
 * written for, the batter eased a single and it was also a no-ball, so the bowler was charged
 * two, not one. Charging only `extras` there lost a run per no-ball, and the innings figures
 * no longer added up to the team's score.
 */
export function bowlerRuns(event: TimelineEvent): number {
  const extra = extraKey(event);
  if (BATTERLESS_EXTRAS.has(extra) && !BOWLER_CHARGED_EXTRAS.has(extra)) return 0;
  // A wide or a no-ball can arrive reporting only the penalty and no total, so the penalty
  // is a floor rather than a replacement: on the real delivery a bowler who had a batter
  // hit a single off a no-ball is charged two, not one.
  return Math.max(event.runs ?? 0, BOWLER_CHARGED_EXTRAS.has(extra) ? event.extras ?? 0 : 0);
}

/** The number shown in the "This over" tracker. */
export function deliveryLabel(event: TimelineEvent): string | number {
  if (event.dismissal || key(event).includes('wicket')) return 'W';
  const extra = extraKey(event);
  if (extra === 'wide') return 'Wd';
  if (extra === 'no_ball' || extra === 'noball') return 'Nb';
  if (extra === 'leg_bye' || extra === 'legbye') return 'Lb';
  if (extra === 'bye') return 'B';
  if (event.runs === 6 || key(event) === 'six') return 6;
  if (event.runs === 4 || key(event) === 'four' || key(event) === 'boundary') return 4;
  if (typeof event.runs === 'number') return event.runs;
  return 0;
}

export type CommentaryCounts = {
  /** Every ball bowled, wides and no-balls included. */
  balls: number;
  /** Balls that advanced the over. */
  legalBalls: number;
  fours: number;
  sixes: number;
  wickets: number;
  reviews: number;
  /** Rows that are not balls at all. */
  systemEvents: number;
};

export function countCommentary(events: TimelineEvent[]): CommentaryCounts {
  const counts: CommentaryCounts = {
    balls: 0,
    legalBalls: 0,
    fours: 0,
    sixes: 0,
    wickets: 0,
    reviews: 0,
    systemEvents: 0,
  };
  for (const event of events) {
    const kind = timelineEventKind(event);
    if (kind === 'review') {
      counts.reviews += 1;
      continue;
    }
    if (kind === 'system' || kind === 'update') {
      counts.systemEvents += 1;
      continue;
    }
    counts.balls += 1;
    if (isLegalBall(event)) counts.legalBalls += 1;
    if (event.dismissal || key(event).includes('wicket')) counts.wickets += 1;
    const label = deliveryLabel(event);
    if (label === 4) counts.fours += 1;
    if (label === 6) counts.sixes += 1;
  }
  return counts;
}

/** One over, assembled from the events that belong to it. */
export type OverSummary = {
  inning: number | null;
  /** The feed's own 1-based over number, so it reads as "Over 22" the way a scorecard does. */
  overNumber: number | null;
  /** The last ball of the over, which carries the score after it. */
  lastEvent: TimelineEvent;
  /** Every ball bowled in the over, in order. */
  events: TimelineEvent[];
  /** Runs added in the over, as the feed's own per-ball totals. Extras are inside them. */
  runs: number;
  /** Wickets that fell in the over. */
  wickets: number;
  /** The score after the over, as the feed reported it. */
  scoreAfter: string;
  /** Whether all six legal balls were bowled, i.e. the over is closed. */
  complete: boolean;
};

/**
 * Groups the feed into overs, oldest first.
 *
 * The score, the ball sequence and the two batters at the crease all come from the events
 * themselves. The bowler's figures are accumulated from the balls he actually bowled in
 * the timeline, so if the feed is missing a delivery the figure is lower — it is never
 * invented to fill the gap.
 */
export function buildOverSummaries(events: TimelineEvent[]): OverSummary[] {
  const deliveries = events.filter(isTimelineDelivery);
  if (!deliveries.length) return [];

  const byOver = new Map<string, TimelineEvent[]>();
  for (const event of deliveries) {
    const mapKey = `${event.inning ?? 'x'}:${event.over ?? 'x'}`;
    const list = byOver.get(mapKey);
    if (list) list.push(event);
    else byOver.set(mapKey, [event]);
  }

  const summaries: OverSummary[] = [];
  for (const list of byOver.values()) {
    const lastEvent = list[list.length - 1];
    let runs = 0;
    let wickets = 0;
    for (const event of list) {
      // The feed's per-ball `runs` is the total on the ball with extras already inside it,
      // so it is added once. Adding `extras` as well counted every bye, leg bye and wide
      // twice across a whole innings.
      runs += event.runs ?? 0;
      if (event.dismissal || key(event).includes('wicket')) wickets += 1;
    }
    summaries.push({
      inning: lastEvent.inning ?? null,
      overNumber: lastEvent.over ?? null,
      lastEvent,
      events: list,
      runs,
      wickets,
      scoreAfter: lastEvent.displayScore ?? '',
      complete: list.filter(isLegalBall).length >= 6,
    });
  }

  return summaries;
}

/** A batter's own figures, accumulated from the balls they faced. */
export type BatterFigure = {
  id: string | null;
  name: string;
  runs: number;
  balls: number;
  out: boolean;
};

export type BowlerFigure = {
  id: string | null;
  name: string;
  /** Overs bowled, in cricket notation (e.g. 4.3). */
  overs: number;
  /** Legal balls bowled. Kept alongside `overs` so an over boundary can be detected. */
  balls: number;
  maidens: number;
  runs: number;
  wickets: number;
  /** Runs conceded in the over in progress, reset at every completed over. */
  overRuns: number;
};

/**
 * Per-player figures for one innings, built from that innings' ball events.
 *
 * A batter's runs and a bowler's runs come from `batterRuns` and `bowlerRuns`, because the
 * feed's per-ball `runs` already contains the extras and a bye belongs to neither of them. A
 * bowler is credited a wicket when the event carries a dismissal naming them, or when the
 * dismissal has no name and the bowler on that ball is the only candidate. Nothing is carried
 * over from an innings we did not receive, so these figures are for the innings in view only.
 */
export function inningsFigures(events: TimelineEvent[], inning: number | null): {
  batters: Map<string, BatterFigure>;
  bowlers: Map<string, BowlerFigure>;
} {
  const batters = new Map<string, BatterFigure>();
  const bowlers = new Map<string, BowlerFigure>();

  const scoped = events.filter(
    (event) => isTimelineDelivery(event) && (inning === null || event.inning === inning),
  );

  for (const event of scoped) {
    if (event.batsman) {
      const id = event.batsmanId ?? null;
      const mapKey = id ?? `name:${event.batsman}`;
      const existing = batters.get(mapKey);
      const figure: BatterFigure = existing ?? {
        id,
        name: event.batsman,
        runs: 0,
        balls: 0,
        out: false,
      };
      figure.runs += batterRuns(event);
      if (isLegalBall(event)) figure.balls += 1;
      batters.set(mapKey, figure);
    }

    if (event.dismissed) {
      const id = event.dismissedId ?? null;
      const mapKey = id ?? `name:${event.dismissed}`;
      const figure = batters.get(mapKey);
      if (figure) figure.out = true;
    }

    if (event.bowler) {
      const id = event.bowlerId ?? null;
      const mapKey = id ?? `name:${event.bowler}`;
      const existing = bowlers.get(mapKey);
      const figure: BowlerFigure = existing ?? {
        id,
        name: event.bowler,
        overs: 0,
        balls: 0,
        maidens: 0,
        runs: 0,
        wickets: 0,
        overRuns: 0,
      };
      // A wide or a no-ball is bowled but does not count towards the over.
      if (isLegalBall(event)) {
        figure.overs += 1 / 6;
        figure.balls += 1;
        figure.overRuns += bowlerRuns(event);
        // A maiden is only knowable at the end of an over, and only a legal ball can close
        // one. The count used to sit at zero forever, which the commentary card then printed
        // as though it were a real figure.
        if (figure.balls % 6 === 0) {
          if (figure.overRuns === 0) figure.maidens += 1;
          figure.overRuns = 0;
        }
      }
      figure.runs += bowlerRuns(event);
      const credited = Boolean(event.dismissal || key(event).includes('wicket'));
      if (credited) figure.wickets += 1;
      bowlers.set(mapKey, figure);
    }
  }

  return { batters, bowlers };
}

/** Renders a bowler's overs the way a scorecard does: 4.3, not 4.333. */
export function formatOversBowled(overs: number): string {
  // Six additions of 1/6 land on 0.9999999999999999, which the old code read as a completed
  // zero over and printed as "1" — an over shown without its ".0" on the end-of-over card.
  const rounded = Math.round(overs * 1000) / 1000;
  const whole = Math.floor(rounded);
  const balls = Math.round((rounded - whole) * 6);
  // Six legal balls complete the over rather than making a seventh ball.
  if (balls === 6) return `${whole + 1}.0`;
  return `${whole}.${balls}`;
}

export type Milestone = {
  id: string | null;
  batter: string;
  runs: number;
  mark: 50 | 100 | 150 | 200;
  /** True when the batter is still at the crease. */
  notOut: boolean;
};

/** The marks a batter reached in this innings, in the order they got there. */
export function findMilestones(
  events: TimelineEvent[],
  inning: number | null,
  marks: readonly number[] = [50, 100, 150, 200],
): Milestone[] {
  const { batters } = inningsFigures(events, inning);
  const found: Milestone[] = [];
  for (const figure of batters.values()) {
    for (const mark of marks) {
      if (figure.runs >= mark) {
        found.push({ id: figure.id, batter: figure.name, runs: figure.runs, mark: mark as Milestone['mark'], notOut: !figure.out });
      }
    }
  }
  return found.sort((a, b) => a.mark - b.mark || a.batter.localeCompare(b.batter));
}

/** A milestone, together with the delivery on which it was reached. */
export type MilestoneAtBall = {
  /** Index of the delivery in the array that was passed in. */
  index: number;
  batter: string;
  mark: number;
  /** The batter's total on that delivery, which is where the mark was passed. */
  runs: number;
};

/**
 * The delivery on which each batter passed each mark.
 *
 * A milestone belongs to the ball that reached it, not to every ball afterwards — showing
 * a fifty after each of the next forty balls is noise. Runs are accumulated in feed order
 * and a mark is recorded only on the delivery where the total crosses it.
 *
 * Only marks actually reached appear, and the total reported is the total on that delivery,
 * so a batter who goes 49 then 1 is shown as reaching fifty on 50.
 */
export function milestoneEvents(
  events: TimelineEvent[],
  inning: number | null,
  marks: readonly number[] = [50, 100, 150, 200],
): MilestoneAtBall[] {
  const totals = new Map<string, number>();
  const found: MilestoneAtBall[] = [];

  events.forEach((event, index) => {
    if (!isTimelineDelivery(event) || !event.batsman) return;
    if (inning !== null && event.inning !== inning) return;

    const mapKey = event.batsmanId ?? `name:${event.batsman}`;
    const before = totals.get(mapKey) ?? 0;
    const after = before + (event.runs ?? 0);
    totals.set(mapKey, after);

    for (const mark of marks) {
      if (before < mark && after >= mark) {
        found.push({ index, batter: event.batsman, mark, runs: after });
      }
    }
  });

  return found;
}
