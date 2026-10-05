'use client';

import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { CLIENT_BASE } from '../services/api/client';
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

/** Coalescing window for socket bursts (see `useMatchStream`). */
const SOCKET_UPDATE_WINDOW_MS = 1000;

function socketUrl(): string {
  return CLIENT_BASE.replace(/\/$/, '');
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
  }
  sharedRefCount += 1;
  return sharedSocket;
}

function releaseMatchesSocket(): void {
  sharedRefCount = Math.max(0, sharedRefCount - 1);
  if (sharedRefCount > 0 || !sharedSocket) return;
  sharedSocket.disconnect();
  sharedSocket = null;
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

function mergeTeamScores(prev: unknown, incoming: unknown): unknown {
  if (incoming === undefined || incoming === null) return prev;
  if (!isPlainObject(incoming)) return prev ?? incoming;
  if (!isPlainObject(prev)) return incoming;
  return {
    ...prev,
    home: { ...(isPlainObject(prev.home) ? prev.home : {}), ...(isPlainObject(incoming.home) ? incoming.home : {}) },
    away: { ...(isPlainObject(prev.away) ? prev.away : {}), ...(isPlainObject(incoming.away) ? incoming.away : {}) },
  };
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
  const prevBat = String(prevInn?.battingTeam || '').trim().toLowerCase();
  const nextBat = String(incoming.battingTeam || '').trim().toLowerCase();
  if (prevInn && prevBat && nextBat && prevBat !== nextBat) {
    return { ...incoming };
  }
  const base = prevInn ? { ...prevInn, ...incoming } : { ...incoming };
  if (prevInn && isEmptyInningsScore(incoming) && !isEmptyInningsScore(prevInn)) {
    base.runs = prevInn.runs;
    base.wickets = prevInn.wickets;
    base.overs = prevInn.overs;
    return base;
  }

  /**
   * A snapshot that is behind in balls is a stale redelivery, and runs/wickets/overs
   * all describe the same instant — so they have to move together or none of them
   * should.
   *
   * Previously only `overs` was protected (`keepRicherOvers`), so a late duplicate
   * carrying an older over still overwrote `runs` while the newer decimal overs was
   * kept. That manufactured an impossible innings — 74 runs at 12.3 overs when 78 had
   * already been bowled at 12.3 — and the score visibly jumped backwards mid-over.
   * The socket drops and redelivers events under load, so this happens in practice.
   */
  if (prevInn) {
    const prevBalls = cricketOversToBalls(prevInn.overs);
    const nextBalls = cricketOversToBalls(incoming.overs);
    const prevRuns = Number(prevInn.runs);
    const nextRuns = Number(incoming.runs);
    const runsAdvanced = Number.isFinite(prevRuns) && Number.isFinite(nextRuns) && nextRuns > prevRuns;
    // New innings (10 wickets, or a big enough total swing) legitimately resets the
    // count, so only a same-innings rollback is treated as stale.
    const isNewInnings =
      (Number(prevInn.wickets) >= 10) || (Number.isFinite(prevRuns) && Number.isFinite(nextRuns) && nextRuns + 8 < prevRuns);

    if (!isNewInnings && prevBalls !== null && nextBalls !== null && nextBalls < prevBalls) {
      /**
       * Behind in balls. Whether that is a stale redelivery depends on the runs:
       *
       * - runs also went backwards (or stood still) → the whole snapshot is older, so
       *   all of it is ignored. Previously only `overs` was protected, which let the
       *   older run total overwrite the newer one and manufactured an impossible
       *   innings (74 runs at 12.3 overs once 78 had already been bowled).
       * - runs advanced but the overs figure is coarser (the tag sometimes broadcasts
       *   whole overs, `12`, after a richer `12.3`) → this is fresher information, so
       *   it is kept and only the overs string is protected.
       */
      if (!runsAdvanced) return { ...prevInn };
      base.overs = keepRicherOvers(prev, incoming);
      return base;
    }
  }

  base.overs = keepRicherOvers(prev, incoming);
  return base;
}

/**
 * The keys that describe *how far the match has progressed*.
 *
 * Any of these arriving from behind is a stale write and must be ignored: a slow HTTP
 * poll, a cached server render, or a redelivered socket frame can all land after a
 * fresher one. Without this guard a refetch silently walked a live header backwards —
 * a match at 91/2 (7.6 ov) dropped to 69/2 (6 ov) and stayed there until the next
 * event, which is precisely the "card and header disagree" symptom.
 */
const PROGRESS_KEYS = new Set([
  'displayScore',
  'displayOvers',
  'currentInnings',
  'lastEvent',
  'matchStatus',
]);

/** True when `incoming` is behind what we already applied. */
function isBehindCurrentState(
  prev: Record<string, unknown>,
  incoming: Record<string, unknown>,
): boolean {
  const prevInn = isPlainObject(prev.currentInnings) ? prev.currentInnings : null;
  const nextInn = isPlainObject(incoming.currentInnings) ? incoming.currentInnings : null;
  // Different innings (a wicket fell, or the chase began) legitimately resets progress.
  const prevBat = String(prevInn?.battingTeam ?? '').trim().toLowerCase();
  const nextBat = String(nextInn?.battingTeam ?? '').trim().toLowerCase();
  if (prevBat && nextBat && prevBat !== nextBat) return false;
  if (Number(prevInn?.wickets) >= 10) return false;

  const prevBalls = cricketOversToBalls(prevInn?.overs ?? prev.displayOvers);
  const nextBalls = cricketOversToBalls(nextInn?.overs ?? incoming.displayOvers);
  if (prevBalls === null || nextBalls === null) return false;

  // Strictly behind by a ball or more. Equal is allowed: a poll that confirms the same
  // position may legitimately refresh runs/wickets written a moment later.
  if (nextBalls >= prevBalls) return false;

  /**
   * Behind in balls, but the totals moved forward — so this frame is *newer*, just
   * written with a coarser overs figure (the tag broadcasts whole overs after a richer
   * decimal). It must be applied, otherwise a genuine boundary is dropped and the score
   * stalls for a whole over.
   */
  const totalOf = (inn: Record<string, unknown> | null, score: unknown) => {
    const runs = Number(inn?.runs);
    if (Number.isFinite(runs)) return runs;
    const parsed = Number(String(score ?? '').match(/^\s*(\d+)/)?.[1]);
    return Number.isFinite(parsed) ? parsed : null;
  };
  // A reset is only genuine when the previous innings was actually finished. Gating on
  // "the total dropped a lot" is not enough: a stale frame can drop 20+ runs, and
  // treating that as a new innings is exactly how a live 91/2 got rewound to 69/2.
  if (prevBalls >= 120 || Number(prevInn?.wickets) >= 10) return false;

  const prevTotal = totalOf(prevInn, prev.displayScore);
  const nextTotal = totalOf(nextInn, incoming.displayScore);
  if (prevTotal !== null && nextTotal !== null && nextTotal > prevTotal) return false;

  // Wickets only increase within an innings, so a fall also proves freshness.
  const prevWkts = Number(prevInn?.wickets);
  const nextWkts = Number(nextInn?.wickets);
  if (Number.isFinite(prevWkts) && Number.isFinite(nextWkts) && nextWkts > prevWkts) return false;

  return true;
}

export function mergeMatchLivePayload<T extends Record<string, unknown>>(
  prev: T,
  payload: Record<string, unknown>
): T {
  const behind = isBehindCurrentState(prev, payload);
  const next: Record<string, unknown> = { ...prev };
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    if (behind && PROGRESS_KEYS.has(key)) continue;
    if (key === 'type' && typeof value === 'string' && THIN_EVENT_TYPES.has(value)) continue;
    if (key === 'teams') {
      next.teams = mergeTeams(prev.teams, value);
      continue;
    }
    if (key === 'teamScores') {
      next.teamScores = mergeTeamScores(prev.teamScores, value);
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

/**
 * Canonical form of a match id, for comparing a socket event's id against the id the
 * page is showing.
 *
 * The page reads its id from the URL segment, which Next.js hands over percent-encoded
 * (`sr%3Amatch%3A74932666`), while the socket sends the raw provider id
 * (`sr:match:74932666`). Compared raw, those never match, so a per-match page silently
 * discarded **every** update while the list pages — which match on the raw id from the
 * API response — kept updating. Normalising both sides makes the two agree.
 */
function normalizeMatchId(value: string | null | undefined): string {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
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

  const idx = matches.findIndex((m) => normalizeMatchId(m.matchId || m.id) === normalizeMatchId(update.matchId));
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
    setUpdate(null);

    const socket = acquireMatchesSocket();
    let cancelled = false;
    // Live payloads are cumulative snapshots, so a burst (several balls in one
    // over, or two matches updating together) can safely coalesce: the latest
    // snapshot supersedes the earlier ones. Without this every broadcast caused
    // a full-list merge plus per-card scoreboard math — the long-task/TBT
    // driver during live matches. The worst case added latency is one window.
    let pending: LiveUpdate | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      timer = null;
      const next = pending;
      pending = null;
      if (next && !cancelled) setUpdate(next);
    };

    const apply = (incoming: LiveUpdate) => {
      const id = normalizeMatchId(incoming.matchId);
      if (!id || incoming.type === 'ping') return;
      if (matchId && id !== normalizeMatchId(matchId)) return;
      const snapshot = unwrapSnapshot(incoming.data);
      if (!snapshot) return;
      if (cancelled) return;
      // Leading edge applies immediately so a fresh mount never waits;
      // anything arriving inside the window replaces the pending payload.
      if (!timer && !pending) {
        setUpdate({
          type: 'match_update',
          matchId: id,
          data: snapshot,
          ts: incoming.ts ?? Date.now(),
        });
        timer = setTimeout(() => {
          timer = null;
          flush();
        }, SOCKET_UPDATE_WINDOW_MS);
        return;
      }
      pending = {
        type: 'match_update',
        matchId: id,
        data: snapshot,
        ts: incoming.ts ?? Date.now(),
      };
    };

    const onLive = (payload: LiveUpdate) => apply(payload);
    const onMatch = (payload: LiveUpdate) => apply(payload);

    socket.on('live:update', onLive);
    socket.on('match:update', onMatch);

    const subscribe = () => {
      if (!matchId) return;
      socket.emit('subscribe:match', { matchId });
    };

    if (socket.connected) {
      subscribe();
    } else {
      socket.once('connect', subscribe);
    }

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      pending = null;
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
