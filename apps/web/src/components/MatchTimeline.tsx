'use client';

import { Radio } from 'lucide-react';
import EmptyState from './EmptyState';
import BallTracker from './BallTracker';

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
  nonStriker?: string;
  bowler?: string;
  shot?: string;
  connect?: string;
  zone?: string;
  dismissal?: string;
  dismissed?: string;
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
        nonStriker: pickName(batting?.non_striker ?? rec.non_striker),
        bowler: pickName(bowling?.bowler ?? rec.bowler),
        shot: humanize(str(batting?.shot_type)),
        connect: humanize(str(batting?.connect)),
        zone: humanize(str(batting?.zone_played_in)),
        dismissal: humanize(str(details?.type)),
        dismissed: pickName(dismissal?.player),
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

  const events = parseTimelineEvents(payload).filter(isDelivery);
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
  const bowled = overEvents.map(deliveryLabel);
  const legalCount = overEvents.filter((event) => isLegalDelivery(event)).length;
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

function extraKind(event: TimelineEvent): string {
  return (event.extraType || event.type || '').toLowerCase().replace(/[-\s]/g, '_');
}

function isDelivery(event: TimelineEvent): boolean {
  if (event.over === undefined) return false;
  const type = event.type.toLowerCase();
  if (type === 'period_start' || type === 'period_end' || type === 'match_started' || type === 'match_ended') {
    return false;
  }
  return /^(ball|wicket|boundary|four|six)/.test(type) || Boolean(event.extraType) || Boolean(event.ball);
}

function isLegalDelivery(event: TimelineEvent): boolean {
  const extra = extraKind(event);
  return extra !== 'wide' && extra !== 'no_ball' && extra !== 'noball';
}

function deliveryLabel(event: TimelineEvent): string | number {
  const extra = extraKind(event);
  if (event.type.toLowerCase().includes('wicket') || event.dismissal) return 'W';
  if (extra === 'wide') return 'Wd';
  if (extra === 'no_ball' || extra === 'noball') return 'Nb';
  if (extra === 'leg_bye' || extra === 'legbye') return 'Lb';
  if (extra === 'bye') return 'B';
  if (event.runs === 6 || event.type.toLowerCase() === 'six') return 6;
  if (event.runs === 4 || event.type.toLowerCase() === 'boundary' || event.type.toLowerCase() === 'four') return 4;
  if (typeof event.runs === 'number') return event.runs;
  return 0;
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

function eventMeta(event: TimelineEvent): string[] {
  const chips: string[] = [];
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
  else if (typeof event.runs === 'number' && isDelivery(event) && !event.dismissal) {
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
} {
  const data = unwrapPayload(payload);
  const status = asRecord(data?.sport_event_status);
  const periods = Array.isArray(status?.period_scores) ? status.period_scores : [];
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
  };
}

function rowTone(event: TimelineEvent): string {
  const type = event.type.toLowerCase();
  if (type.includes('wicket') || event.dismissal) return 'border-l-2 border-l-danger bg-[var(--color-danger-soft)]';
  if (type === 'six') return 'border-l-2 border-l-gold bg-[var(--color-warning-soft)]';
  if (type === 'boundary' || event.runs === 4) return 'border-l-2 border-l-accent bg-[var(--color-brand-soft)]';
  if (event.dropped) return 'border-l-2 border-l-warning bg-[var(--color-warning-soft)]';
  return '';
}

export default function MatchTimeline({
  payload,
  upcoming,
}: {
  payload: Record<string, unknown> | null;
  upcoming?: boolean;
}) {
  const events = parseTimelineEvents(payload);
  const deliveries = events.filter(isDelivery);
  const thisOver = extractBalls(payload);
  const latestFirst = [...events].reverse();
  const summary = matchSummary(payload);

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

  const renderEvent = (event: TimelineEvent) => {
    const meta = eventMeta(event);
    return (
      <div className={`px-3.5 py-3 ${rowTone(event)}`}>
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-xs font-semibold text-accent">{eventTitle(event)}</p>
          {event.displayScore && (
            <p className="shrink-0 font-mono text-[11px] tabular-nums text-stext">{event.displayScore}</p>
          )}
        </div>
        {event.commentary && <p className="mt-1 text-sm leading-relaxed text-mtext">{event.commentary}</p>}
        {meta.length > 0 && (
          <p className="mt-1.5 text-[11px] leading-relaxed text-stext">{meta.join(' · ')}</p>
        )}
      </div>
    );
  };

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
      <div className="overflow-hidden rounded-xl border border-lborder">
        <div className="flex items-center justify-between border-b border-lborder bg-secondary/50 px-3.5 py-2">
          <p className="text-xs font-semibold text-mtext">
            {deliveries.length > 0
              ? `${deliveries.length} ball${deliveries.length === 1 ? '' : 's'}`
              : `${events.length} event${events.length === 1 ? '' : 's'}`}
          </p>
          <p className="text-[11px] text-stext">Latest first</p>
        </div>
        <ol className="max-h-[min(40rem,70vh)] overflow-y-auto overscroll-contain divide-y divide-lborder">
          {latestFirst.map((event, index) => {
            const prev = latestFirst[index - 1];
            const showInnings =
              typeof event.inning === 'number' && event.inning !== prev?.inning;
            return (
              <li key={`${event.id ?? event.type}-${event.displayOvers}-${index}`}>
                {showInnings && (
                  <p className="sticky top-0 z-[1] border-b border-lborder bg-secondary px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-stext">
                    Innings {event.inning}
                  </p>
                )}
                {renderEvent(event)}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
