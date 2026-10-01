'use client';

import { Radio } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import EmptyState from './EmptyState';
import BallTracker from './BallTracker';
import {
  buildOverSummaries,
  countCommentary,
  deliveryLabel as ballOutcomeLabel,
  milestoneEvents,
  formatOversBowled,
  inningsFigures,
  isLegalBall,
  isTimelineDelivery,
  timelineEventKind,
  type MilestoneAtBall,
  type OverSummary,
} from '../lib/commentary';

/** Renders a meta list with the middot separators the plain-text version used. */
function ChipList({ items }: { items: ReactNode[] }) {
  const shown = items.filter(Boolean);
  if (!shown.length) return null;
  return (
    <>
      {shown.map((item, index) => (
        <span key={index}>
          {index > 0 ? <span aria-hidden> · </span> : null}
          {item}
        </span>
      ))}
    </>
  );
}

export interface TimelineEvent {
  id?: string | number;
  type: string;
  inning?: number;
  over?: number;
  ball?: number;
  displayOvers?: string;
  displayScore?: string;
  runs?: number;
  extras?: number;
  extraType?: string;
  commentary?: string;
  batsman?: string;
  /** Sportradar player id, when the payload carries one, so the name can link out. */
  batsmanId?: string;
  nonStriker?: string;
  nonStrikerId?: string;
  bowler?: string;
  bowlerId?: string;
  shot?: string;
  connect?: string;
  zone?: string;
  dismissal?: string;
  dismissed?: string;
  dismissedId?: string;
  period?: string;
  freeHit?: boolean;
  dropped?: boolean;
  misfielded?: boolean;
  bowlingFrom?: string;
  deliveryType?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function formatPlayerName(name: string): string {
  if (name.includes(',')) {
    const [last, first] = name.split(',').map((part) => part.trim());
    if (first && last) return `${first} ${last}`;
  }
  return name;
}

function pickName(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return formatPlayerName(value);
  const rec = asRecord(value);
  if (!rec) return undefined;
  const name = rec.name || rec.full_name || rec.short_name;
  return typeof name === 'string' ? formatPlayerName(name) : undefined;
}

/**
 * The player's own id, used to link a name to their profile page.
 *
 * Only a real provider id is worth linking. A name-only reference has nowhere to go,
 * and guessing a slug would produce a dead link, which is worse than plain text.
 */
function pickId(value: unknown): string | undefined {
  const rec = asRecord(value);
  if (!rec) return undefined;
  const id = str(rec.id);
  return id && !/^\s*$/.test(id) ? id : undefined;
}

function num(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  return undefined;
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function commentaryText(value: unknown): string | undefined {
  const direct = str(value);
  if (direct) return direct;
  const rec = asRecord(value);
  return str(rec?.text ?? rec?.description ?? rec?.comment);
}

function humanize(value?: string): string | undefined {
  if (!value) return undefined;
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function unwrapPayload(payload: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!payload) return null;
  const nested = asRecord(payload.payload);
  if (nested && (Array.isArray(nested.timeline) || nested.sport_event_timeline || nested.sport_event)) {
    return nested;
  }
  return payload;
}

export function parseTimelineEvents(rawPayload: Record<string, unknown> | null | undefined): TimelineEvent[] {
  const payload = unwrapPayload(rawPayload);
  if (!payload) return [];

  const nested = asRecord(payload.sport_event_timeline);
  const lists = [
    payload.timeline,
    payload.events,
    nested?.timeline,
    asRecord(payload.sport_event)?.timeline,
  ];

  const raw = lists.find((item) => Array.isArray(item) && item.length) as unknown[] | undefined;
  if (!raw) return [];

  return raw
    .map((item): TimelineEvent | null => {
      const rec = asRecord(item);
      if (!rec) return null;
      const batting = asRecord(rec.batting_params);
      const bowling = asRecord(rec.bowling_params);
      const fielding = asRecord(rec.fielding_params);
      const dismissal = asRecord(rec.dismissal_params);
      const details = asRecord(dismissal?.dismissal_details);
      const type = str(rec.type) || str(rec.event_type) || 'event';
      const extraType = str(bowling?.extra_runs_type ?? rec.extra_runs_type ?? rec.extra_type);
      return {
        id: (rec.id as string | number | undefined) ?? undefined,
        type,
        inning: num(rec.inning ?? rec.innings),
        over: num(rec.over_number ?? rec.over),
        ball: num(rec.ball_number ?? rec.ball),
        displayOvers: str(rec.display_overs),
        displayScore: str(rec.display_score),
        runs: num(batting?.runs_scored ?? rec.runs ?? batting?.runs ?? rec.score),
        extras: num(bowling?.extra_runs_conceded ?? rec.extra_runs ?? rec.extras),
        extraType,
        commentary: commentaryText(rec.commentary ?? rec.text ?? rec.description ?? rec.match_note),
        batsman: pickName(batting?.striker ?? rec.batsman ?? rec.striker),
        batsmanId: pickId(batting?.striker ?? rec.batsman ?? rec.striker),
        nonStriker: pickName(batting?.non_striker ?? rec.non_striker),
        nonStrikerId: pickId(batting?.non_striker ?? rec.non_striker),
        bowler: pickName(bowling?.bowler ?? rec.bowler),
        bowlerId: pickId(bowling?.bowler ?? rec.bowler),
        shot: humanize(str(batting?.shot_type)),
        connect: humanize(str(batting?.connect)),
        zone: humanize(str(batting?.zone_played_in)),
        dismissal: humanize(str(details?.type)),
        dismissed: pickName(dismissal?.player),
        dismissedId: pickId(dismissal?.player),
        period: str(rec.period_name ?? rec.period),
        freeHit: rec.free_hit === true,
        dropped: fielding?.catch_dropped === true,
        misfielded: fielding?.misfielded === true,
        bowlingFrom: humanize(str(bowling?.bowling_from)),
        deliveryType: humanize(str(bowling?.delivery_type)),
      };
    })
    .filter((event): event is TimelineEvent => event !== null);
}

export function extractBalls(
  payload: Record<string, unknown> | null | undefined,
  opts?: { inning?: number }
): (string | number | null)[] {
  if (!payload) return [];
  const keys = ['balls', 'recentBalls', 'thisOver'];
  for (const key of keys) {
    const value = unwrapPayload(payload)?.[key] ?? payload[key];
    if (Array.isArray(value) && value.length) {
      return padOverSlots(value as (string | number)[]);
    }
  }
  const nested = asRecord(payload.currentOver) || asRecord(payload.over);
  if (nested && Array.isArray(nested.balls) && nested.balls.length) {
    return padOverSlots(nested.balls as (string | number)[]);
  }

  const events = parseTimelineEvents(payload).filter(isTimelineDelivery);
  if (!events.length) return [];
  const wantedInning = opts?.inning;
  const scoped = wantedInning
    ? events.filter((event) => event.inning === wantedInning)
    : events;
  if (!scoped.length) return [];
  const last = scoped[scoped.length - 1];
  const overEvents = scoped.filter(
    (event) => event.inning === last.inning && event.over === last.over,
  );
  const bowled = overEvents.map(ballOutcomeLabel);
  const legalCount = overEvents.filter((event) => isLegalBall(event)).length;
  const remaining = Math.max(0, 6 - legalCount);
  return [...bowled, ...Array.from({ length: remaining }, () => null)];
}

function padOverSlots(bowled: (string | number)[]): (string | number | null)[] {
  const legal = bowled.filter((ball) => {
    const value = String(ball).toLowerCase();
    return value !== 'wd' && value !== 'nb';
  }).length;
  const remaining = Math.max(0, 6 - legal);
  return [...bowled, ...Array.from({ length: remaining }, () => null)];
}

function humanizeType(event: TimelineEvent): string {
  if (event.period) return event.period;
  if (event.dismissal) return event.dismissal;
  if (event.extraType) return humanize(event.extraType) || event.extraType;
  if (event.freeHit) return 'Free hit';
  const key = event.type.toLowerCase().replace(/_/g, ' ').trim();
  const labels: Record<string, string> = {
    ball: 'Ball',
    wicket: 'Wicket',
    boundary: 'FOUR',
    four: 'FOUR',
    six: 'SIX',
    wide: 'Wide',
    'no ball': 'No ball',
    bye: 'Bye',
    'leg bye': 'Leg bye',
    'match started': 'Match started',
    'match ended': 'Match ended',
    'period start': 'Break',
    'period score': 'Innings score',
    'period end': 'Innings ended',
    'score change': 'Score update',
  };
  return labels[key] || key.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function eventTitle(event: TimelineEvent): string {
  const type = humanizeType(event);
  const overBall = event.displayOvers || (
    event.over !== undefined && event.ball !== undefined
      ? `${Math.max(0, event.over - 1)}.${event.ball}`
      : event.over !== undefined
        ? `Over ${event.over}`
        : null
  );
  if (!overBall) return type;
  if (type.toLowerCase() === 'ball') return overBall;
  return `${overBall} · ${type}`;
}

function eventMeta(event: TimelineEvent): ReactNode[] {
  const chips: ReactNode[] = [];
  if (event.bowler && event.batsman) chips.push(`${event.bowler} to ${event.batsman}`);
  else if (event.batsman) chips.push(event.batsman);
  else if (event.bowler) chips.push(event.bowler);
  if (event.nonStriker) chips.push(`Non-striker ${event.nonStriker}`);
  if (event.dismissed && event.dismissal) chips.push(`${event.dismissed} ${event.dismissal.toLowerCase()}`);
  if (event.shot) chips.push(event.shot);
  if (event.connect) chips.push(event.connect);
  if (event.zone) chips.push(event.zone);
  if (event.deliveryType && event.deliveryType.toLowerCase() !== 'stock') chips.push(event.deliveryType);
  if (event.bowlingFrom) chips.push(event.bowlingFrom);
  if (event.dropped) chips.push('Dropped');
  if (event.misfielded) chips.push('Misfield');
  if (event.freeHit) chips.push('Free hit');
  if (event.extras && event.extraType) chips.push(`${humanize(event.extraType)} +${event.extras}`);
  else if (typeof event.runs === 'number' && isTimelineDelivery(event) && !event.dismissal) {
    chips.push(event.runs === 0 ? 'Dot' : `${event.runs} run${event.runs === 1 ? '' : 's'}`);
  }
  return chips;
}

function periodSideTotal(
  periods: unknown[],
  side: 'home' | 'away',
): string {
  let runs = 0;
  let wickets: number | null = null;
  let recorded = false;
  for (const item of periods) {
    const rec = asRecord(item);
    if (!rec) continue;
    const value = Number(rec[`${side}_score`]);
    if (!Number.isFinite(value) || value <= 0) continue;
    runs += value;
    recorded = true;
    const w = Number(rec[`${side}_wickets`]);
    if (Number.isFinite(w) && w > 0) wickets = w;
  }
  if (!recorded) return '';
  return wickets !== null ? `${runs}/${wickets}` : String(runs);
}

export function matchSummary(payload: Record<string, unknown> | null | undefined): {
  result?: string;
  displayScore?: string;
  homeScore: string;
  awayScore: string;
  scores: string[];
  format?: string;
} {
  const data = unwrapPayload(payload);
  const status = asRecord(data?.sport_event_status);
  const event = asRecord(data?.sport_event);
  const periods = Array.isArray(status?.period_scores) ? status.period_scores : [];
  // The tournament type is the only reliable signal for first-class vs
  // limited-overs; the match record itself does not carry it.
  const tournamentType = asRecord(event?.tournament)?.type ?? asRecord(status?.tournament)?.type;
  const scores = periods
    .map((item) => {
      const rec = asRecord(item);
      if (!rec) return '';
      const innings = num(rec.number);
      const score = str(rec.display_score);
      const overs = str(rec.display_overs);
      if (!score) return '';
      return `Inn ${innings ?? ''} ${score}${overs ? ` (${overs} ov)` : ''}`.replace('Inn  ', 'Inn ');
    })
    .filter(Boolean);
  return {
    result: str(status?.match_result_text) || str(status?.result),
    displayScore: str(status?.display_score),
    homeScore: periodSideTotal(periods, 'home'),
    awayScore: periodSideTotal(periods, 'away'),
    scores,
    format: str(tournamentType) || undefined,
  };
}

/**
 * One row of the feed.
 *
 * A ball gets the outcome badge, the lead line, the prose and the metadata. A lifecycle
 * row gets the same badge shape so the list keeps its rhythm, but prints the feed's own
 * wording instead of pretending to be a delivery.
 */
const renderEvent = (event: TimelineEvent) => {
  const meta = eventMeta(event);
  const kind = timelineEventKind(event);
  const isBall = kind === 'delivery' || kind === 'extra';

  if (!isBall) {
    return (
      <div className="flex items-start gap-3 bg-secondary/30 px-3.5 py-2.5">
        <OutcomeBadge event={event} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-stext">
            {humanizeType(event)}
          </p>
          {event.commentary ? (
            <p className="mt-0.5 text-sm leading-relaxed text-mtext">{event.commentary}</p>
          ) : null}
          {meta.length > 0 && (
            <p className="mt-1 text-[11px] leading-relaxed text-stext"><ChipList items={meta} /></p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-3 px-3.5 py-3 ${rowTone(event)}`}>
      <OutcomeBadge event={event} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-semibold text-accent">{eventTitle(event)}</p>
            <LeadLine event={event} />
          </div>
          {event.displayScore && (
            <p className="shrink-0 font-mono text-[11px] tabular-nums text-stext">{event.displayScore}</p>
          )}
        </div>
        {event.commentary && <p className="mt-1 text-sm leading-relaxed text-mtext">{event.commentary}</p>}
        {meta.length > 0 && (
          <p className="mt-1.5 text-[11px] leading-relaxed text-stext"><ChipList items={meta} /></p>
        )}
      </div>
    </div>
  );
};

function rowTone(event: TimelineEvent): string {
  if (!isTimelineDelivery(event)) return '';
  const type = event.type.toLowerCase();
  if (type.includes('wicket') || event.dismissal) return 'border-l-2 border-l-danger bg-[var(--color-danger-soft)]';
  if (type === 'six') return 'border-l-2 border-l-gold bg-[var(--color-warning-soft)]';
  if (type === 'boundary' || event.runs === 4) return 'border-l-2 border-l-accent bg-[var(--color-brand-soft)]';
  if (event.dropped) return 'border-l-2 border-l-warning bg-[var(--color-warning-soft)]';
  return '';
}

type OverContext = OverSummary & {
  /** The two batters at the crease when the over ended, with the figures we can prove. */
  batters: { name: string; runs: number; balls: number; notOut: boolean }[];
  /** The bowler who bowled that over, or null if the feed did not name one. */
  bowler: { name: string; overs: string; maidens: number; runs: number; wickets: number } | null;
};

/**
 * Attaches the at-the-crease context to each over.
 *
 * The figures on a card have to be the ones that stood **at the end of that over**, not the
 * innings totals. Building them once from every event made each card print the bowler's whole
 * spell beside an early score: on a real innings Bosch read `9.0-1-60-4` on the card for 57/0,
 * the over he bowled first and had conceded five runs in. Every card of a bowler's spell showed
 * the same four numbers, which is what made the timeline look random.
 *
 * A batter's figures are shown when the feed named them on a ball they faced, which is what
 * makes the number real rather than inferred. When it did not, the name is still listed with
 * zero runs rather than a guess.
 */
function buildOverContext(events: TimelineEvent[], overs: OverSummary[]): Map<string, OverContext> {
  const map = new Map<string, OverContext>();
  if (!overs.length) return map;

  const currentInnings = overs[overs.length - 1].inning;

  // Where each over's last delivery sits, so the figures can be read off the events up to it
  // and no further. Cards are ordered oldest first for this walk, but the map is keyed so the
  // render order does not matter.
  const lastIndexOfOver = new Map<string, number>();
  events.forEach((event, index) => {
    if (!isTimelineDelivery(event)) return;
    lastIndexOfOver.set(`${event.inning ?? 'x'}:${event.over ?? 'x'}`, index);
  });

  for (const over of overs) {
    const last = over.lastEvent;
    const mapKey = `${last.inning ?? 'x'}:${last.over ?? 'x'}`;
    const cut = lastIndexOfOver.get(mapKey);
    const { batters, bowlers } = inningsFigures(
      cut === undefined ? events : events.slice(0, cut + 1),
      currentInnings,
    );

    const battersAtCrease: OverContext['batters'] = [];
    // Keyed by id, because that is how `inningsFigures` stores them. The non-striker used to
    // be looked up by name, which can never match an id-keyed entry, so the second batter on
    // every over card read "0 (0)" whatever they had actually scored.
    for (const [name, id] of [
      [last.batsman, last.batsmanId],
      [last.nonStriker, last.nonStrikerId],
    ] as const) {
      if (!name || battersAtCrease.some((entry) => entry.name === name)) continue;
      const figure = (id ? batters.get(id) : undefined) ?? batters.get(`name:${name}`);
      battersAtCrease.push({
        name,
        runs: figure?.runs ?? 0,
        balls: figure?.balls ?? 0,
        notOut: figure ? !figure.out : false,
      });
    }

    const bowlerId = last.bowlerId ?? (last.bowler ? `name:${last.bowler}` : '');
    const bowlerFigure = last.bowler ? bowlers.get(bowlerId) : undefined;
    map.set(mapKey, {
      ...over,
      batters: battersAtCrease,
      bowler: bowlerFigure
        ? {
            name: bowlerFigure.name,
            overs: formatOversBowled(bowlerFigure.overs),
            maidens: bowlerFigure.maidens,
            runs: bowlerFigure.runs,
            wickets: bowlerFigure.wickets,
          }
        : null,
    });
  }
  return map;
}


/**
 * True when this delivery is the last one of its over, so the end-of-over card belongs
 * here rather than after every ball of the over.
 *
 * This looks for the **last** delivery of the same over, not the first. An earlier version
 * used `findIndex`, which finds the first ball of the over and is therefore true for all of
 * them — that printed the end-of-over summary six times per over.
 *
 * The comparison is by event identity rather than by position so that filtering the list
 * cannot make a mid-over ball look like the last one.
 */
function isLastBallOfOver(event: TimelineEvent, events: TimelineEvent[]): boolean {
  if (!isTimelineDelivery(event)) return false;
  const sameOver = events.filter(
    (candidate) =>
      candidate.inning === event.inning &&
      candidate.over === event.over &&
      isTimelineDelivery(candidate),
  );
  if (!sameOver.length) return false;
  const last = sameOver[sameOver.length - 1];
  if (last === event) return true;
  // Fall back to the id when the list holds copies rather than the same objects.
  if (event.id !== undefined && last.id !== undefined) return last.id === event.id;
  return last.displayOvers === event.displayOvers && last.displayScore === event.displayScore;
}

/** Client-side filtering. Nothing is fetched; the events are already in memory. */
function filterEvents(events: TimelineEvent[], filter: FilterKey): TimelineEvent[] {
  if (filter === 'all') return events;
  if (filter.startsWith('inning-')) {
    const inning = Number(filter.slice('inning-'.length));
    return events.filter((event) => event.inning === inning);
  }
  return events.filter((event) => {
    if (!isTimelineDelivery(event)) return false;
    const label = ballOutcomeLabel(event);
    if (filter === 'fours') return label === 4;
    if (filter === 'sixes') return label === 6;
    if (filter === 'wickets') return event.dismissal !== '' || event.type.toLowerCase().includes('wicket');
    return true;
  });
}

/**
 * The outcome of a ball, sized up and set to the left of the row.
 *
 * This is the single change that stops the list reading as a wall of grey text: a reader
 * scanning for the boundaries of an over gets a column of numbers instead of prose. The
 * value is the label the feed already implies — a wicket, a wide, a no-ball, the runs, or
 * nothing at all for a dot ball, which is genuinely nothing.
 */
function OutcomeBadge({ event }: { event: TimelineEvent }) {
  const kind = timelineEventKind(event);
  if (kind === 'review') {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-[10px] font-bold uppercase tracking-wide text-stext ring-1 ring-lborder">
        DRs
      </span>
    );
  }
  if (kind !== 'delivery' && kind !== 'extra') {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/60 text-stext ring-1 ring-lborder">
        <Radio className="h-4 w-4" />
      </span>
    );
  }
  const label = ballOutcomeLabel(event);
  if (label === 0 || label === '0') {
    return (
      <span
        className="h-9 w-9 shrink-0 rounded-lg bg-elevated ring-1 ring-lborder/70"
        aria-label="Dot ball"
        title="Dot ball"
      />
    );
  }
  const text = String(label);
  const tone =
    text === 'W'
      ? 'bg-danger/15 text-danger ring-danger/30'
      : text === '6'
        ? 'bg-gold/20 text-gold ring-gold/40'
        : text === '4'
          ? 'bg-accent/15 text-accent ring-accent/30'
          : 'bg-accent/10 text-accent ring-accent/25';
  const spoken =
    text === 'W' ? 'Wicket' : text === 'Wd' ? 'Wide' : text === 'Nb' ? 'No ball' : text === 'Lb' ? 'Leg bye' : text === 'B' ? 'Bye' : `${text} runs`;
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-base font-black tabular-nums ring-1 ${tone}`}
      aria-label={spoken}
    >
      {text}
    </span>
  );
}

/**
 * The bold lead line: who bowled to whom, and what happened.
 *
 * Split out from the commentary prose on purpose — the feed gives the participants and the
 * outcome separately, and flattening them into one `·`-separated line is what made the
 * original unreadable.
 */
function LeadLine({ event }: { event: TimelineEvent }) {
  const outcome = humanizeType(event);
  const parts: string[] = [];
  if (event.bowler && event.batsman) parts.push(`${event.bowler} to ${event.batsman}`);
  else if (event.batsman) parts.push(event.batsman);
  else if (event.bowler) parts.push(event.bowler);

  const isPlainBall = event.type.toLowerCase() === 'ball' && !event.extraType;
  if (outcome && !isPlainBall) {
    const shown = event.displayOvers ? outcome : outcome;
    parts.push(shown);
  }
  if (!parts.length) return null;
  return <p className="text-sm font-semibold text-mtext">{parts.join(' to ').replace(/ to (.+) to /, ' to ')}</p>;
}

/**
 * One titled cell inside the end-of-over card.
 *
 * The label sits under the value rather than beside it, because the commentary column is too
 * narrow for a side-by-side label and value without the value wrapping away from it.
 */
function OverTile({
  label,
  value,
  className = '',
  children,
}: {
  label: string;
  value?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`min-w-0 rounded-lg border border-lborder bg-card px-2.5 py-2 ${className}`}>
      <p className="truncate font-mono text-sm font-bold tabular-nums text-mtext">{value}</p>
      <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-wider text-stext">
        {label}
      </p>
      {children}
    </div>
  );
}

/**
 * The end of an over, as one card.
 *
 * The balls, the score, the two batters at the crease and the bowler's figures used to be two
 * separate strips. The second one was a thin line of mono text directly under the first, which
 * read as a stray line rather than a moment in the match — and because the list is newest
 * first, the final over's card sits at the very top of the feed and looked like a page header.
 * They are one card now, and the figures are cells rather than running text.
 *
 * Nothing here is stored: the ball sequence is the deliveries of this over, the score is the
 * feed's own string for the last of them, and the figures are accumulated from the balls. If
 * the over is still in progress only the balls so far are shown, so the card is never a claim
 * about a future over. A figure the feed did not give is left out rather than filled in.
 */
function EndOfOverCard({
  over,
  batters,
  bowler,
}: {
  over: OverSummary;
  batters: { name: string; runs: number; balls: number; notOut: boolean }[];
  bowler: { name: string; overs: string; maidens: number; runs: number; wickets: number } | null;
}) {
  if (!over.scoreAfter && !batters.length && !bowler) return null;
  return (
    <div className="border-y border-lborder bg-secondary/50 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-mtext">
          {over.complete ? 'End of over' : 'Over in progress'}
          {over.overNumber !== null ? ` · ${over.overNumber}` : ''}
        </p>
        {/*
          The six balls on one line. These used to be the shared `BallTracker` boxes, but at
          that size they wrapped to one per row inside the narrow commentary column, which is
          what made the card look broken.
        */}
        <span className="flex flex-nowrap items-center gap-1">
          {over.events.map((event, index) => {
            const label = String(ballOutcomeLabel(event));
            const tone =
              label === 'W'
                ? 'bg-danger/15 text-danger'
                : label === '6'
                  ? 'bg-gold/20 text-gold'
                  : label === '4'
                    ? 'bg-accent/15 text-accent'
                    : 'bg-secondary text-stext';
            return (
              <span
                key={`${label}-${index}`}
                className={`inline-grid h-7 w-7 place-items-center rounded font-mono text-xs font-bold tabular-nums ${tone}`}
              >
                {label}
              </span>
            );
          })}
        </span>
      </div>

      {/* The score, the batters and the bowler, as cells. Two columns is the narrow case,
          three once there is room, and the bowler always takes the full width because it
          carries four figures. */}
      <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {over.scoreAfter ? (
          <OverTile label="Score" value={over.scoreAfter} />
        ) : null}
        {batters.map((batter) => (
          <OverTile
            key={batter.name}
            label="Batter"
            value={`${batter.name}${batter.notOut ? '*' : ''} ${batter.runs} (${batter.balls})`}
          />
        ))}
        {bowler ? (
          <OverTile
            label="Bowler"
            className="col-span-2 sm:col-span-3"
            value={`${bowler.name}  ${bowler.overs}-${bowler.maidens}-${bowler.runs}-${bowler.wickets}`}
          />
        ) : null}
      </div>
    </div>
  );
}

/**
 * A milestone a batter actually reached, shown under the delivery that reached it.
 *
 * Whether the asterisk is shown depends on whether the batter is still at the crease *now*,
 * which the caller works out from the innings figures, so the card does not claim a
 * not-out marker for a batter dismissed later.
 */
function MilestoneRow({ milestone, notOut }: { milestone: MilestoneAtBall; notOut: boolean }) {
  return (
    <div className="border-y border-lborder bg-accent/10 px-3.5 py-2.5">
      <p className="text-sm font-bold text-mtext">
        {milestone.batter} reaches {milestone.mark}
        {notOut ? '*' : ''}
      </p>
      <p className="mt-0.5 text-[11px] text-stext">
        {milestone.runs} runs from the balls in this feed
        {notOut ? ', still at the crease' : ''}
      </p>
    </div>
  );
}

type FilterKey = 'all' | 'fours' | 'sixes' | 'wickets' | `inning-${number}`;

export default function MatchTimeline({
  payload,
  upcoming,
  showOverSummaries = true,
}: {
  payload: Record<string, unknown> | null;
  upcoming?: boolean;
  /**
   * Whether to render the per-over summary card — the row headed "End of over · N"
   * with the score, the two batters at the crease and the bowler's figures.
   *
   * It is on by default and the match centre turns it off. The card restates the
   * running score, the two batters and the bowler after every over, and on a dense
   * match page that repeats the scoreboard three times per over and pushes the actual
   * deliveries apart. The data is still computed either way; only the rendering is
   * optional, so a consumer that does want the summaries keeps getting them.
   */
  showOverSummaries?: boolean;
}) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [visibleCount, setVisibleCount] = useState(20);

  const events = parseTimelineEvents(payload);
  const counts = countCommentary(events);
  const thisOver = extractBalls(payload);
  const summary = matchSummary(payload);

  const overs = useMemo(() => buildOverSummaries(events), [events]);
  /** Over number -> the two batters and the bowler at that point, from the ball events. */
  const overContext = useMemo(() => buildOverContext(events, overs), [events, overs]);
  /**
   * A fifty belongs to the ball that reached it, so this is keyed by the delivery's
   * position in `events`. Keying by batter instead would print the milestone again after
   * every one of the batter's remaining balls.
   */
  const milestonesByIndex = useMemo(() => {
    const latestInning = events.reduce<number | null>(
      (acc, e) => (typeof e.inning === 'number' ? e.inning : acc),
      null,
    );
    const map = new Map<number, MilestoneAtBall>();
    if (latestInning === null) return map;
    for (const entry of milestoneEvents(events, latestInning)) map.set(entry.index, entry);
    return map;
  }, [events]);

  /** Position of each event in the unfiltered list, so a filter cannot shift the lookup. */
  const eventIndex = useMemo(() => {
    const map = new Map<TimelineEvent, number>();
    events.forEach((event, index) => map.set(event, index));
    return map;
  }, [events]);

  /** The current innings' figures, used to tell a not-out batter from a dismissed one. */
  const currentFigures = useMemo(() => {
    const latestInning = events.reduce<number | null>(
      (acc, e) => (typeof e.inning === 'number' ? e.inning : acc),
      null,
    );
    return inningsFigures(events, latestInning).batters;
  }, [events]);
  const currentBatters = currentFigures;
  /** Name -> id, so a milestone found by name can be looked up by id and the other way. */
  const currentBatterIds = useMemo(() => {
    const map = new Map<string, string>();
    for (const figure of currentFigures.values()) {
      if (figure.id) map.set(figure.name, figure.id);
    }
    return map;
  }, [currentFigures]);

  const inningsPresent = useMemo(() => {
    const set = new Set<number>();
    events.forEach((event) => {
      if (typeof event.inning === 'number') set.add(event.inning);
    });
    return [...set].sort((a, b) => a - b);
  }, [events]);

  const filtered = useMemo(() => filterEvents(events, filter), [events, filter]);

  if (!events.length) {
    return (
      <EmptyState
        icon={Radio}
        title={upcoming ? "This match hasn't started yet" : 'No ball-by-ball yet'}
        message={
          upcoming
            ? 'The timeline will appear here once play begins.'
            : 'A match record exists, but there are no ball events to show yet.'
        }
      />
    );
  }

  const latestFirst = [...filtered].reverse();
  const shown = latestFirst.slice(0, visibleCount);
  const remaining = latestFirst.length - shown.length;

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'fours', label: `${counts.fours} Fours` },
    { key: 'sixes', label: `${counts.sixes} Sixes` },
    { key: 'wickets', label: `${counts.wickets} Wickets` },
    ...inningsPresent.map((inning) => ({ key: `inning-${inning}` as FilterKey, label: `Inn ${inning}` })),
  ];

  return (
    <div className="space-y-5">
      {(summary.result || summary.scores.length > 0) && (
        <div className="rounded-xl border border-lborder bg-secondary/40 px-3.5 py-3">
          {summary.result && <p className="text-sm font-semibold text-mtext">{summary.result}</p>}
          {summary.scores.length > 0 && (
            <p className="mt-1 font-mono text-xs text-stext">{summary.scores.join(' · ')}</p>
          )}
        </div>
      )}
      {thisOver.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-stext">This over</p>
          <BallTracker balls={thisOver} size="lg" />
        </div>
      )}
      <div className="flex flex-wrap gap-2" aria-label="Filter commentary">
        {filters.map((option) => {
          const active = filter === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                setFilter(option.key);
                setVisibleCount(20);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
                active
                  ? 'bg-brand text-brand-fg ring-brand'
                  : 'bg-card text-mtext ring-lborder hover:bg-secondary'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <div className="overflow-hidden rounded-xl border border-lborder">
        <div className="flex items-center justify-between border-b border-lborder bg-secondary/50 px-3.5 py-2">
          <p className="text-xs font-semibold text-mtext">
            {filter === 'all' && counts.balls > 0
              ? `${counts.balls} ball${counts.balls === 1 ? '' : 's'}`
              : `${filtered.length} shown`}
          </p>
          <p className="text-[11px] text-stext">Latest first</p>
        </div>
        <ol className="max-h-[min(40rem,70vh)] overflow-y-auto overscroll-contain divide-y divide-lborder">
          {shown.map((event, index) => {
            const prev = shown[index - 1];
            const showInnings = typeof event.inning === 'number' && event.inning !== prev?.inning;
            const context = overContext.get(`${event.inning ?? 'x'}:${event.over ?? 'x'}`);
            const showOverEnd = Boolean(context?.complete) && isLastBallOfOver(event, filtered);
            const milestone = milestonesByIndex.get(eventIndex.get(event) ?? -1);
            // Whether the batter is still at the crease comes from the innings figures,
            // not from the milestone entry, so a batter dismissed later loses the asterisk.
            const milestoneBatter = milestone
              ? currentBatters.get(
                  currentBatterIds.get(event.batsman ?? '') ?? `name:${milestone.batter}`,
                )
              : undefined;
            return (
              <li key={`${event.id ?? event.type}-${event.displayOvers}-${index}`}>
                {showInnings && (
                  <p className="sticky top-0 z-[1] border-b border-lborder bg-secondary px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-stext">
                    Innings {event.inning}
                  </p>
                )}
                {renderEvent(event)}
                {showOverEnd && context && showOverSummaries ? (
                  <EndOfOverCard
                    over={context}
                    batters={context.batters}
                    bowler={context.bowler}
                  />
                ) : null}
                {milestone ? (
                  <MilestoneRow milestone={milestone} notOut={milestoneBatter ? !milestoneBatter.out : false} />
                ) : null}
              </li>
            );
          })}
        </ol>
        {remaining > 0 && (
          <div className="border-t border-lborder px-3.5 py-3 text-center">
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + 30)}
              className="rounded-full bg-secondary px-4 py-1.5 text-xs font-semibold text-mtext ring-1 ring-lborder hover:bg-card"
            >
              Load more ({remaining} older)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
