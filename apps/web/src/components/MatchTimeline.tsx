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

function pickName(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  const rec = asRecord(value);
  if (!rec) return undefined;
  const name = rec.name || rec.full_name || rec.short_name;
  return typeof name === 'string' ? name : undefined;
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

export function extractBalls(payload: Record<string, unknown> | null | undefined): (string | number)[] {
  if (!payload) return [];
  const keys = ['balls', 'recentBalls', 'thisOver'];
  for (const key of keys) {
    const value = payload[key];
    if (Array.isArray(value)) return value as (string | number)[];
  }
  const nested = asRecord(payload.currentOver) || asRecord(payload.over);
  if (nested && Array.isArray(nested.balls)) {
    return nested.balls as (string | number)[];
  }

  const events = parseTimelineEvents(payload).filter(isDelivery);
  if (!events.length) return [];
  const lastOver = events[events.length - 1]?.over;
  return events
    .filter((event) => event.over === lastOver)
    .map(deliveryLabel);
}

function isDelivery(event: TimelineEvent): boolean {
  const type = event.type.toLowerCase();
  return /ball|wicket|boundary|four|six|wide|no.?ball|bye|leg.?bye|run|extra/.test(type);
}

function deliveryLabel(event: TimelineEvent): string | number {
  const type = event.type.toLowerCase();
  if (type.includes('wicket')) return 'W';
  if (type.includes('wide')) return 'Wd';
  if (type.includes('no')) return 'Nb';
  if (event.runs === 4 || type.includes('four')) return 4;
  if (event.runs === 6 || type.includes('six')) return 6;
  if (typeof event.runs === 'number') return event.runs;
  return '•';
}

function eventTitle(event: TimelineEvent): string {
  const type = event.type.replace(/_/g, ' ');
  const overBall =
    event.over != null && event.ball != null
      ? `${event.over}.${event.ball}`
      : event.over != null
        ? `Over ${event.over}`
        : null;
  return overBall ? `${overBall} · ${type}` : type;
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
      <ol className="space-y-2">
        {events.map((event, index) => (
          <li
            key={`${event.type}-${event.over}-${event.ball}-${index}`}
            className="rounded-xl border border-lborder bg-secondary/40 px-3.5 py-2.5"
          >
            <p className="text-xs font-bold uppercase tracking-wide text-accent">{eventTitle(event)}</p>
            {event.commentary && <p className="mt-1 text-sm text-mtext">{event.commentary}</p>}
            {(event.batsman || event.bowler || event.runs != null) && (
              <p className="mt-1 text-xs text-stext">
                {[
                  event.batsman && `Batter ${event.batsman}`,
                  event.bowler && `Bowler ${event.bowler}`,
                  event.runs != null && `${event.runs} run${event.runs === 1 ? '' : 's'}`,
                  event.extras ? `${event.extras} extra${event.extras === 1 ? '' : 's'}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
          </li>
        ))}
      </ol>
      {deliveries.length === 0 && (
        <p className="text-xs text-stext">{events.length} match event{events.length === 1 ? '' : 's'} recorded. No deliveries yet.</p>
      )}
    </div>
  );
}
