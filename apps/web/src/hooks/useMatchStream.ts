'use client';

import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { CLIENT_BASE } from '../services/api/client';
import { fetchLiveMatches, fetchMatchById } from '../services/matches';

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

const LOG = '[live-socket]';

let sharedSocket: Socket | null = null;
let sharedRefCount = 0;
let debugBound = false;

function socketUrl(): string {
  return CLIENT_BASE.replace(/\/$/, '');
}

function bindSocketDebug(socket: Socket, url: string): void {
  if (debugBound) return;
  debugBound = true;
  console.info(LOG, 'connecting to', `${url}/matches`);
  socket.on('connect', () => {
    const transport = socket.io.engine?.transport?.name;
    console.info(LOG, 'connected', { id: socket.id, transport });
  });
  socket.on('ready', (payload: unknown) => {
    console.info(LOG, 'server ready', payload);
  });
  socket.on('connect_error', (err: Error) => {
    console.error(LOG, 'connect_error', err.message);
  });
  socket.on('disconnect', (reason: string) => {
    console.warn(LOG, 'disconnected', reason);
  });
  socket.io.on('reconnect_attempt', (attempt: number) => {
    console.info(LOG, 'reconnect_attempt', attempt);
  });
  socket.io.on('reconnect', (attempt: number) => {
    console.info(LOG, 'reconnected', attempt);
  });
}

function acquireMatchesSocket(): Socket {
  if (!sharedSocket) {
    const url = socketUrl();
    sharedSocket = io(`${url}/matches`, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 15000,
    });
    bindSocketDebug(sharedSocket, url);
  }
  sharedRefCount += 1;
  return sharedSocket;
}

function releaseMatchesSocket(): void {
  sharedRefCount = Math.max(0, sharedRefCount - 1);
  if (sharedRefCount > 0 || !sharedSocket) return;
  console.info(LOG, 'closing socket (no listeners left)');
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
  const nextRow = { ...payload, matchId: update.matchId } as T;

  if (idx === -1) {
    if (nextRow.status === 'live') {
      return [nextRow, ...matches];
    }
    return matches;
  }

  const next = [...matches];
  next[idx] = { ...next[idx], ...payload, matchId: update.matchId };
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
      const rec = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
      console.info(LOG, 'UI update', {
        matchId: matchKey,
        status: rec.status,
        displayScore: rec.displayScore,
      });
      setUpdate({
        type: 'match_update',
        matchId: matchKey,
        data,
        ts: ts ?? Date.now(),
      });
    };

    const hydrate = (incoming: LiveUpdate, eventName: string) => {
      const id = incoming.matchId?.trim();
      console.info(LOG, eventName, {
        type: incoming.type,
        matchId: id,
        ts: incoming.ts,
      });
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
          console.info(LOG, 'refetching match', id);
          void fetchMatchById(id)
            .then((match) => {
              if (match) emitHydrated(id, match, incoming.ts);
              else console.warn(LOG, 'refetch returned empty', id);
            })
            .catch((err: unknown) => {
              console.error(LOG, 'refetch failed', id, err);
            });
        }, 350)
      );
    };

    const onLive = (payload: LiveUpdate) => hydrate(payload, 'live:update');
    const onMatch = (payload: LiveUpdate) => hydrate(payload, 'match:update');

    socket.on('live:update', onLive);
    socket.on('match:update', onMatch);

    const subscribe = () => {
      if (!matchId) {
        console.info(LOG, 'listening for all live:update events');
        return;
      }
      console.info(LOG, 'subscribe:match', matchId);
      socket.emit('subscribe:match', { matchId });
    };

    if (socket.connected) {
      console.info(LOG, 'already connected', socket.id);
      subscribe();
    } else {
      socket.once('connect', subscribe);
    }

    const pollLive = () => {
      if (cancelled) return;
      if (matchId) {
        void fetchMatchById(matchId)
          .then((match) => {
            if (match) emitHydrated(matchId, match);
          })
          .catch((err: unknown) => {
            console.error(LOG, 'poll fallback failed', matchId, err);
          });
        return;
      }
      void fetchLiveMatches()
        .then((items) => {
          for (const match of items) {
            const id = match.matchId || match.id;
            if (id) emitHydrated(String(id), match);
          }
        })
        .catch((err: unknown) => {
          console.error(LOG, 'poll fallback live list failed', err);
        });
    };
    const pollTimer = setInterval(pollLive, 8000);

    return () => {
      cancelled = true;
      clearInterval(pollTimer);
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
