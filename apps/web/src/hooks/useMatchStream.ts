'use client';

import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { CLIENT_BASE } from '../services/api/client';
import { fetchMatchById } from '../services/matches';
import { cricketOversToBalls } from '../utils/helpers';

export interface LiveUpdate {
  type: string;
  matchId?: string;
  data?: unknown;
  ts?: number;
}

const THIN_EVENT_TYPES = new Set([
  'runs',
  'wicket',
  'milestone',
  'match_started',
  'status_change',
  'match_update',
]);

let sharedSocket: Socket | null = null;
let sharedRefCount = 0;
let debugBound = false;

function socketUrl(): string {
  return CLIENT_BASE.replace(/\/$/, '');
}

function liveLog(event: string, detail?: unknown): void {
  if (detail === undefined) {
    console.warn(`[live-socket] ${event}`);
    return;
  }
  console.warn(`[live-socket] ${event}`, detail);
}

function summarizePayload(payload: LiveUpdate | null | undefined): Record<string, unknown> {
  const data =
    payload?.data && typeof payload.data === 'object'
      ? (payload.data as Record<string, unknown>)
      : {};
  const innings =
    data.currentInnings && typeof data.currentInnings === 'object'
      ? (data.currentInnings as Record<string, unknown>)
      : {};
  return {
    type: payload?.type,
    matchId: payload?.matchId || data.matchId,
    thin: isThinEvent(data),
    snapshot: Boolean(unwrapSnapshot(data)),
    status: data.status,
    displayScore: data.displayScore,
    overs: innings.overs,
    ts: payload?.ts,
  };
}

function bindSocketDebug(socket: Socket): void {
  if (debugBound) return;
  debugBound = true;
  liveLog('connecting', { url: `${socketUrl()}/matches` });
  socket.on('connect', () => {
    liveLog('connected', {
      id: socket.id,
      transport: socket.io.engine.transport.name,
    });
  });
  socket.on('disconnect', (reason) => {
    liveLog('disconnected', reason);
  });
  socket.on('connect_error', (err) => {
    liveLog('connect_error', err.message);
  });
  socket.io.on('reconnect_attempt', (attempt) => {
    liveLog('reconnect_attempt', attempt);
  });
  socket.on('ready', (payload: unknown) => {
    liveLog('ready', payload);
  });
  socket.on('live:update', (payload: LiveUpdate) => {
    liveLog('live:update', summarizePayload(payload));
  });
  socket.on('match:update', (payload: LiveUpdate) => {
    liveLog('match:update', summarizePayload(payload));
  });
}

function acquireMatchesSocket(): Socket {
  if (!sharedSocket) {
    sharedSocket = io(`${socketUrl()}/matches`, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 15000,
    });
    bindSocketDebug(sharedSocket);
  }
  sharedRefCount += 1;
  return sharedSocket;
}

function releaseMatchesSocket(): void {
  sharedRefCount = Math.max(0, sharedRefCount - 1);
  if (sharedRefCount > 0 || !sharedSocket) return;
  sharedSocket.disconnect();
  sharedSocket = null;
  debugBound = false;
}

function isThinEvent(data: unknown): boolean {
  if (!data || typeof data !== 'object') return true;
  const rec = data as Record<string, unknown>;
  const type = typeof rec.type === 'string' ? rec.type : '';
  const hasScoreFields =
    'currentInnings' in rec || 'displayScore' in rec || 'teams' in rec || 'lastEvent' in rec;
  return THIN_EVENT_TYPES.has(type) && !hasScoreFields;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeTeams(prev: unknown, incoming: unknown): unknown {
  if (incoming === undefined || incoming === null) return prev;
  if (Array.isArray(incoming)) {
    if (isPlainObject(prev)) return prev;
    return incoming;
  }
  if (!isPlainObject(incoming)) return prev ?? incoming;
  if (!isPlainObject(prev)) return incoming;
  return {
    ...prev,
    home: { ...(isPlainObject(prev.home) ? prev.home : {}), ...(isPlainObject(incoming.home) ? incoming.home : {}) },
    away: { ...(isPlainObject(prev.away) ? prev.away : {}), ...(isPlainObject(incoming.away) ? incoming.away : {}) },
  };
}

function keepRicherOvers(prevInn: unknown, incomingInn: Record<string, unknown>): unknown {
  const prev = isPlainObject(prevInn) ? prevInn : null;
  const prevOvers = prev?.overs;
  const nextOvers = incomingInn.overs;
  if (nextOvers === undefined || nextOvers === null || nextOvers === '') return prevOvers;
  if (prevOvers === undefined || prevOvers === null || prevOvers === '') return nextOvers;

  const prevBalls = cricketOversToBalls(prevOvers);
  const nextBalls = cricketOversToBalls(nextOvers);
  if (prevBalls === null) return nextOvers;
  if (nextBalls === null) return prevOvers;
  if (nextBalls >= prevBalls) return nextOvers;

  const prevRuns = Number(prev?.runs);
  const nextRuns = Number(incomingInn.runs);
  const newInnings =
    Number.isFinite(prevRuns) && Number.isFinite(nextRuns) && nextRuns + 8 < prevRuns;
  if (newInnings) return nextOvers;

  // Socket often sends whole overs (7) after a richer cricket decimal (7.3).
  return prevOvers;
}

function isEmptyInningsScore(inn: Record<string, unknown> | null): boolean {
  if (!inn) return true;
  const runs = Number(inn.runs);
  const wickets = Number(inn.wickets);
  return (!Number.isFinite(runs) || runs === 0) && (!Number.isFinite(wickets) || wickets === 0);
}

function mergeInnings(prev: unknown, incoming: unknown): unknown {
  if (!isPlainObject(incoming)) return prev ?? incoming;
  const prevInn = isPlainObject(prev) ? prev : null;
  const base = prevInn ? { ...prevInn, ...incoming } : { ...incoming };
  if (prevInn && isEmptyInningsScore(incoming) && !isEmptyInningsScore(prevInn)) {
    base.runs = prevInn.runs;
    base.wickets = prevInn.wickets;
    base.overs = prevInn.overs;
    return base;
  }
  base.overs = keepRicherOvers(prev, incoming);
  return base;
}

export function mergeMatchLivePayload<T extends Record<string, unknown>>(
  prev: T,
  payload: Record<string, unknown>
): T {
  const next: Record<string, unknown> = { ...prev };
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    if (key === 'type' && typeof value === 'string' && THIN_EVENT_TYPES.has(value)) continue;
    if (key === 'teams') {
      next.teams = mergeTeams(prev.teams, value);
      continue;
    }
    if (key === 'teamNames') {
      if (Array.isArray(value) && value.length >= 2 && value.some(Boolean)) next.teamNames = value;
      continue;
    }
    if (key === 'currentInnings') {
      next.currentInnings = mergeInnings(prev.currentInnings, value);
      continue;
    }
    if (key === 'lastEvent' && isPlainObject(value)) {
      next.lastEvent = { ...(isPlainObject(prev.lastEvent) ? prev.lastEvent : {}), ...value };
      continue;
    }
    if ((key === 'displayScore' || key === 'tournament' || key === 'venue' || key === 'matchStatus') && value === '' && prev[key]) {
      continue;
    }
    next[key] = value;
  }
  if (prev.matchId || payload.matchId) next.matchId = payload.matchId || prev.matchId;
  return next as T;
}

function unwrapSnapshot(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null;
  const rec = data as Record<string, unknown>;
  if (rec.match && typeof rec.match === 'object') {
    return rec.match as Record<string, unknown>;
  }
  if (isThinEvent(rec)) return null;
  if (
    'currentInnings' in rec ||
    'displayScore' in rec ||
    'status' in rec ||
    'teams' in rec
  ) {
    return rec;
  }
  return null;
}

export function mergeLiveUpdate<T extends { matchId?: string; id?: string; status?: string }>(
  matches: T[],
  update: LiveUpdate | null
): T[] {
  if (!update || update.type === 'ping' || !update.matchId) return matches;
  const payload =
    update.data && typeof update.data === 'object' ? (update.data as Record<string, unknown>) : {};
  if (isThinEvent(payload)) return matches;

  const idx = matches.findIndex((m) => (m.matchId || m.id) === update.matchId);
  const nextRow = mergeMatchLivePayload({ matchId: update.matchId } as T, payload);

  if (idx === -1) {
    if (nextRow.status === 'live') {
      return [nextRow, ...matches];
    }
    return matches;
  }

  const next = [...matches];
  next[idx] = mergeMatchLivePayload(next[idx] as T & Record<string, unknown>, payload);
  return next;
}

export function useMatchStream(matchId?: string | null, enabled = true): LiveUpdate | null {
  const [update, setUpdate] = useState<LiveUpdate | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const socket = acquireMatchesSocket();
    const pending = new Map<string, ReturnType<typeof setTimeout>>();
    let cancelled = false;

    const emitHydrated = (matchKey: string, data: unknown, ts?: number) => {
      if (cancelled) return;
      setUpdate({
        type: 'match_update',
        matchId: matchKey,
        data,
        ts: ts ?? Date.now(),
      });
    };

    const hydrate = (incoming: LiveUpdate) => {
      const id = incoming.matchId?.trim();
      if (!id || incoming.type === 'ping') return;
      if (matchId && id !== matchId) return;

      const snapshot = unwrapSnapshot(incoming.data);
      if (snapshot) {
        emitHydrated(id, snapshot, incoming.ts);
        return;
      }
      const prev = pending.get(id);
      if (prev) clearTimeout(prev);
      pending.set(
        id,
        setTimeout(() => {
          pending.delete(id);
          void fetchMatchById(id)
            .then((match) => {
              if (match) emitHydrated(id, match, incoming.ts);
            })
            .catch(() => undefined);
        }, 350)
      );
    };

    const onLive = (payload: LiveUpdate) => hydrate(payload);
    const onMatch = (payload: LiveUpdate) => hydrate(payload);

    socket.on('live:update', onLive);
    socket.on('match:update', onMatch);

    const subscribe = () => {
      liveLog('socket ready', { connected: socket.connected, id: socket.id });
      if (!matchId) {
        liveLog('listening for all live:update events');
        return;
      }
      liveLog('subscribe:match', matchId);
      socket.emit('subscribe:match', { matchId });
    };

    if (socket.connected) {
      subscribe();
    } else {
      socket.once('connect', subscribe);
    }

    return () => {
      cancelled = true;
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
      socket.off('live:update', onLive);
      socket.off('match:update', onMatch);
      socket.off('connect', subscribe);
      if (matchId) {
        socket.emit('unsubscribe:match', { matchId });
      }
      releaseMatchesSocket();
    };
  }, [matchId, enabled]);

  return update;
}
