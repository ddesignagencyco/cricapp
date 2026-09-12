'use client';

import { Radio } from 'lucide-react';
import EmptyState from './EmptyState';
import BallTracker from './BallTracker';

export interface TimelineEvent {
  type: string;
  over?: number;
  ball?: number;
  runs?: number;
  extras?: number;
  commentary?: string;
  batsman?: string;
  bowler?: string;
  period?: string;
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

export function parseTimelineEvents(payload: Record<string, unknown> | null | undefined): TimelineEvent[] {
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
    .map((item) => {
      const rec = asRecord(item);
      if (!rec) return null;
      const batting = asRecord(rec.batting_params);
      const bowling = asRecord(rec.bowling_params);
      const type = str(rec.type) || str(rec.event_type) || 'event';
      return {
        type,
        over: num(rec.over_number ?? rec.over ?? rec.display_overs),
        ball: num(rec.ball_number ?? rec.ball),
        runs: num(rec.runs ?? batting?.runs ?? rec.score),
        extras: num(rec.extra_runs ?? rec.extras),
        commentary: str(rec.commentary ?? rec.text ?? rec.description ?? rec.match_note),
        batsman: pickName(rec.batsman ?? rec.striker ?? batting?.striker),
        bowler: pickName(rec.bowler ?? bowling?.bowler),
        period: str(rec.period_name ?? rec.period ?? rec.innings),
      } satisfies TimelineEvent;
    })
    .filter((event): event is TimelineEvent => !!event);
}

export function extractBalls(payload: Record<string, unknown> | null | undefined): (string | number | null)[] {
  if (!payload) return [];
  const keys = ['balls', 'recentBalls', 'thisOver'];
  for (const key of keys) {
    const value = payload[key];
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
  const lastOver = events[events.length - 1]?.over;
  if (lastOver == null) return [];
  const overEvents = events.filter((event) => event.over === lastOver);
  const bowled = overEvents.map(deliveryLabel);
  const legalCount = overEvents.filter((event) => {
    const type = event.type.toLowerCase();
    return !type.includes('wide') && !/(^|_)no[_ ]?ball/.test(type);
  }).length;
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

function isDelivery(event: TimelineEvent): boolean {
  if (event.over == null) return false;
  const type = event.type.toLowerCase();
  return /^(ball|wicket|boundary|four|six|wide|no.?ball|bye|leg.?bye)/.test(type) || type.includes('wicket');
}

function deliveryLabel(event: TimelineEvent): string | number {
  const type = event.type.toLowerCase();
  if (type.includes('wicket')) return 'W';
  if (type.includes('wide')) return 'Wd';
  if (/(^|_)no[_ ]?ball/.test(type) || type === 'noball') return 'Nb';
  if (event.runs === 4 || type.includes('four')) return 4;
  if (event.runs === 6 || type.includes('six')) return 6;
  if (typeof event.runs === 'number') return event.runs;
  return 0;
}

function humanizeType(type: string): string {
  const key = type.toLowerCase().replace(/_/g, ' ').trim();
  const labels: Record<string, string> = {
    ball: 'Ball',
    wicket: 'Wicket',
    boundary: 'Boundary',
    four: 'Four',
    six: 'Six',
    wide: 'Wide',
    'no ball': 'No ball',
    bye: 'Bye',
    'leg bye': 'Leg bye',
    'match started': 'Match started',
    'match ended': 'Match ended',
    'period start': 'Innings started',
    'period score': 'Innings score',
    'period end': 'Innings ended',
    'score change': 'Score update',
  };
  return labels[key] || key.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function eventTitle(event: TimelineEvent): string {
  const type = humanizeType(event.type);
  const overBall =
    event.over != null && event.ball != null
      ? `${event.over}.${event.ball}`
      : event.over != null
        ? `Over ${event.over}`
        : null;
  if (!overBall) return type;
  return type.toLowerCase() === 'ball' ? overBall : `${overBall} · ${type}`;
}

function eventDetail(event: TimelineEvent): string | null {
  const parts = [
    event.bowler && event.batsman ? `${event.bowler} to ${event.batsman}` : event.batsman || event.bowler,
    event.runs != null ? `${event.runs} run${event.runs === 1 ? '' : 's'}` : null,
    event.extras ? `${event.extras} extra${event.extras === 1 ? '' : 's'}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
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

  return (
    <div className="space-y-5">
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
        <ol className="max-h-[min(28rem,60vh)] overflow-y-auto overscroll-contain divide-y divide-lborder">
          {latestFirst.map((event, index) => {
            const detail = event.commentary || eventDetail(event);
            return (
              <li
                key={`${event.type}-${event.over}-${event.ball}-${index}`}
                className="px-3.5 py-2.5"
              >
                <p className="font-mono text-xs font-semibold text-accent">{eventTitle(event)}</p>
                {detail && <p className="mt-0.5 text-sm text-mtext">{detail}</p>}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
