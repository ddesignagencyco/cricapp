'use client';

import { useEffect, useState } from 'react';
import { CLIENT_BASE } from '../services/api/client';

export interface LiveUpdate {
  type: string;
  matchId?: string;
  data?: unknown;
  ts?: number;
}

function streamUrl(matchId?: string | null): string {
  const origin = CLIENT_BASE.replace(/\/$/, '');
  if (matchId) {
    return `${origin}/api/matches/${encodeURIComponent(matchId)}/stream`;
  }
  return `${origin}/api/matches/live/stream`;
}

export function mergeLiveUpdate<T extends { matchId?: string; id?: string }>(
  matches: T[],
  update: LiveUpdate | null
): T[] {
  if (!update || update.type === 'ping' || !update.matchId) return matches;
  const payload =
    update.data && typeof update.data === 'object' ? (update.data as Record<string, unknown>) : {};
  const idx = matches.findIndex((m) => (m.matchId || m.id) === update.matchId);
  if (idx === -1) return matches;
  const next = [...matches];
  next[idx] = { ...next[idx], ...payload, matchId: update.matchId };
  return next;
}

export function useMatchStream(matchId?: string | null, enabled = true): LiveUpdate | null {
  const [update, setUpdate] = useState<LiveUpdate | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof EventSource === 'undefined') return;

    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const connect = () => {
      if (closed) return;
      es = new EventSource(streamUrl(matchId));
      es.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as LiveUpdate;
          if (parsed?.type === 'ping') return;
          setUpdate(parsed);
        } catch {
          // ignore malformed frames
        }
      };
      es.onerror = () => {
        es?.close();
        es = null;
        if (closed) return;
        retry = setTimeout(connect, 15000);
      };
    };

    connect();

    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      es?.close();
    };
  }, [matchId, enabled]);

  return update;
}
