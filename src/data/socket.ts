import { useSyncExternalStore } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_HEADERS, API_URL } from '../config';
import { toMatch, type RawMatch } from './adapt';
import type { Match } from './types';

/*
 * Live scores over the API's socket (namespace /matches, the same feed the
 * website uses). Every ball the server broadcasts `live:update`; frames that
 * carry a full match snapshot update cards immediately, and every frame
 * pings listeners so open screens refresh the details (commentary, cards).
 */

interface LiveFrame {
  type?: string;
  matchId?: string;
  data?: unknown;
  revision?: number | null;
  batch?: LiveFrame[];
}

const snapshots = new Map<string, { match: Match; revision: number }>();
const snapshotListeners = new Set<() => void>();
const eventListeners = new Set<(matchId?: string) => void>();
let socket: Socket | null = null;
let users = 0;

/** A frame is a snapshot when it carries scores, not just "runs happened". */
const isSnapshot = (d: unknown): d is RawMatch =>
  !!d && typeof d === 'object' && 'matchId' in d && ('teamScores' in d || 'currentInnings' in d || 'periodScores' in d);

function apply(frame: LiveFrame) {
  if (frame.batch) return frame.batch.forEach(apply);
  if (isSnapshot(frame.data)) {
    const id = frame.data.matchId;
    const revision = typeof frame.revision === 'number' ? frame.revision : Date.now();
    const prev = snapshots.get(id);
    // Never step back to an older ball.
    if (!prev || revision >= prev.revision) {
      snapshots.set(id, { match: toMatch(frame.data), revision });
      snapshotListeners.forEach(l => l());
    }
  }
  eventListeners.forEach(l => l(frame.matchId));
}

function connect() {
  if (socket) return;
  socket = io(`${API_URL}/matches`, {
    transports: ['websocket'],
    // React Native's WebSocket accepts headers; the tunnel needs this one.
    extraHeaders: API_HEADERS,
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 15000,
  });
  socket.on('live:update', apply);
  socket.on('match:update', apply);
}

function disconnect() {
  socket?.disconnect();
  socket = null;
}

/** Keep the socket open while anyone listens; returns the release function. */
export function onLiveEvent(listener: (matchId?: string) => void) {
  eventListeners.add(listener);
  users += 1;
  connect();
  return () => {
    eventListeners.delete(listener);
    users = Math.max(0, users - 1);
    if (!users) disconnect();
  };
}

/** Join a match's room for its updates (match centre). */
export function watchMatch(id: string) {
  connect();
  socket?.emit('subscribe:match', { matchId: id });
  return () => {
    socket?.emit('unsubscribe:match', { matchId: id });
  };
}

const subscribe = (l: () => void) => {
  snapshotListeners.add(l);
  return () => snapshotListeners.delete(l);
};

/**
 * The freshest version of a match: the socket snapshot when it's newer than
 * what the screen fetched, keeping fields only the fetch has (venue, live extras).
 */
export function useLiveMatch(match: Match): Match {
  const snap = useSyncExternalStore(subscribe, () => snapshots.get(match.id));
  if (!snap) return match;
  const s = snap.match;
  return {
    ...match,
    status: s.status,
    innings: s.innings.length ? s.innings : match.innings,
    statusText: s.statusText || match.statusText,
    result: s.result ?? match.result,
    battingTeamId: s.battingTeamId ?? match.battingTeamId,
    target: s.target ?? match.target,
    live: s.live ? { ...match.live, ...s.live, recent: match.live?.recent ?? [], partnership: match.live?.partnership } : match.live,
  };
}
