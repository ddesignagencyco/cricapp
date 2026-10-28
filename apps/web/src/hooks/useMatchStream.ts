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
  /**
   * Monotonic revision of the snapshot this frame carries.
   *
   * The API computes it from the max ball sequence in the stored timeline and sends it
   * at the top level of every `live:update`, `match:update` and subscribe replay. It is
   * the only exact ordering signal on the wire, so it is carried all the way through to
   * the merge instead of being dropped — comparing overs to decide what is stale is a
   * heuristic that this makes unnecessary.
   */
  revision?: number | null;
  /**
   * Frames for several matches that landed inside one coalescing window. Only a list
   * subscription (no `matchId`) can produce one; `mergeLiveUpdate` applies each frame.
   */
  batch?: LiveUpdate[];
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

/**
 * Whether `incoming` is provably older than what we already applied, by revision alone.
 *
 * Returns `null` when either side has no revision — a match the provider has not
 * sequenced yet, or a snapshot from a path that never set one. Callers must fall back to
 * the overs heuristic in that case rather than treating "unknown" as "current".
 *
 * Equal revisions are **not** stale: the API can rewrite the same position with a richer
 * overs figure, and a poll confirming the same ball may legitimately carry fresher runs.
 */
function isStaleByRevision(
  prev: unknown,
  incoming: unknown,
): boolean | null {
  const prevRevision = isPlainObject(prev) ? prev.revision : undefined;
  const nextRevision = isPlainObject(incoming) ? incoming.revision : undefined;
  if (typeof prevRevision !== 'number' || typeof nextRevision !== 'number') return null;
  if (!Number.isFinite(prevRevision) || !Number.isFinite(nextRevision)) return null;
  return nextRevision < prevRevision;
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
  // Per-side totals describe the same instant, so a stale frame must not rewrite them
  // either, nor stamp the row with its older revision / timestamp.
  'teams',
  'teamScores',
  'periodScores',
  'revision',
  'updatedAt',
]);

type Progress = 'ahead' | 'behind' | 'same' | 'unknown';

/**
 * Where `incoming` sits relative to `prev` in the innings in progress, read from the
 * cricket itself: balls first, then runs and wickets.
 *
 * This is the primary ordering. `revision` cannot be: on this API it is derived from
 * the stored *timeline*, which ingestion refreshes only every few poll cycles, so two
 * snapshots a whole over apart routinely carry the same revision — and an equal
 * revision used to count as "current". That let a cached 136 overwrite a live 151.
 */
function compareProgress(prev: Record<string, unknown>, incoming: Record<string, unknown>): Progress {
  const prevInn = isPlainObject(prev.currentInnings) ? prev.currentInnings : null;
  const nextInn = isPlainObject(incoming.currentInnings) ? incoming.currentInnings : null;
  // A different batting side (the chase began) cannot be compared ball for ball.
  const prevBat = String(prevInn?.battingTeam ?? '').trim().toLowerCase();
  const nextBat = String(nextInn?.battingTeam ?? '').trim().toLowerCase();
  if (prevBat && nextBat && prevBat !== nextBat) return 'unknown';
  if (Number(prevInn?.wickets) >= 10) return 'unknown';

  const prevBalls = cricketOversToBalls(prevInn?.overs ?? prev.displayOvers);
  const nextBalls = cricketOversToBalls(nextInn?.overs ?? incoming.displayOvers);
  if (prevBalls === null || nextBalls === null) return 'unknown';
  // Back to the first two overs from ten or more overs on: a new innings (super over, or
  // a provider that keeps the batting label), not a stale frame — those are a few overs
  // old, never a reset to the start.
  if (nextBalls <= 12 && prevBalls - nextBalls >= 60) return 'unknown';

  const totalOf = (inn: Record<string, unknown> | null, score: unknown) => {
    const runs = Number(inn?.runs);
    if (inn && inn.runs !== undefined && inn.runs !== null && Number.isFinite(runs)) return runs;
    const parsed = Number(String(score ?? '').match(/(\d+)\s*\/\s*\d+\s*$/)?.[1]);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const prevTotal = totalOf(prevInn, prev.displayScore);
  const nextTotal = totalOf(nextInn, incoming.displayScore);
  const prevWkts = Number(prevInn?.wickets);
  const nextWkts = Number(nextInn?.wickets);
  const moreRuns = prevTotal !== null && nextTotal !== null && nextTotal > prevTotal;
  const fewerRuns = prevTotal !== null && nextTotal !== null && nextTotal < prevTotal;
  // Wickets only increase within an innings, so a fall also proves freshness.
  const moreWickets = Number.isFinite(prevWkts) && Number.isFinite(nextWkts) && nextWkts > prevWkts;

  if (nextBalls > prevBalls) return 'ahead';
  if (nextBalls < prevBalls) {
    // Behind in balls but the totals moved forward: a newer frame written with a
    // coarser overs figure (whole overs after a richer decimal). It must apply.
    return moreRuns || moreWickets ? 'ahead' : 'behind';
  }
  // Same ball. Extras (wides, no-balls) add runs without a ball, so the higher total
  // is the later write.
  if (moreRuns || moreWickets) return 'ahead';
  if (fewerRuns) return 'behind';
  return 'same';
}

/**
 * True when `incoming` is older than what is already applied. The cricket decides;
 * `revision` only breaks a tie the balls cannot (same ball and totals, or no innings
 * data at all, e.g. a status-only frame).
 */
function isBehindCurrentState(prev: Record<string, unknown>, incoming: Record<string, unknown>): boolean {
  const progress = compareProgress(prev, incoming);
  if (progress === 'behind') return true;
  if (progress === 'ahead') return false;
  return isStaleByRevision(prev, incoming) === true;
}

/* ─── Latest known live state, shared by every surface in this tab ─── */

/**
 * The freshest snapshot this tab has seen for each live match.
 *
 * Every surface keeps its own copy of the rows, and a surface that mounts — a client
 * navigation back to the homepage, the match page opening from a card — starts from
 * whatever it was handed: a server render up to a minute old, or a cached query. With
 * nothing on screen yet there was nothing for the stale guard to protect, so the card
 * printed the old score (136) until the next frame brought it back (151). Seeding from
 * this map instead means a newly mounted surface starts at the newest score any other
 * surface already showed.
 */
const latestLive = new Map<string, Record<string, unknown>>();

/** Records a snapshot; only ever moves a match forward. */
export function rememberLiveSnapshot(row: unknown): void {
  if (!isPlainObject(row)) return;
  const id = normalizeMatchId(String(row.matchId ?? row.id ?? ''));
  if (!id) return;
  const known = latestLive.get(id);
  latestLive.set(id, known ? mergeMatchLivePayload(known, row) : { ...row });
}

/** `row`, brought forward to the newest snapshot this tab has seen for it. */
export function withLatestLive<T>(row: T): T {
  if (!isPlainObject(row)) return row;
  const known = latestLive.get(normalizeMatchId(String(row.matchId ?? row.id ?? '')));
  return known ? (mergeMatchLivePayload(row as Record<string, unknown>, known) as T) : row;
}

/** Test hook: forget every remembered snapshot. */
export function clearLiveSnapshots(): void {
  latestLive.clear();
}

export function mergeMatchLivePayload<T extends Record<string, unknown>>(
  prev: T,
  payload: Record<string, unknown>
): T {
  // Balls, runs and wickets decide; revision only breaks a tie (see `compareProgress`).
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
  if (update?.batch?.length) {
    return update.batch.reduce((rows, frame) => mergeLiveUpdate(rows, frame), matches);
  }
  if (!update || update.type === 'ping' || !update.matchId) return matches;
  const payload =
    update.data && typeof update.data === 'object' ? (update.data as Record<string, unknown>) : {};
  if (isThinEvent(payload)) return matches;

  const idx = matches.findIndex((m) => normalizeMatchId(m.matchId || m.id) === normalizeMatchId(update.matchId));

  /**
   * Drop a frame the row is already ahead of, before any merging happens.
   *
   * The socket drops and redelivers under load, so a late duplicate carrying an older
   * revision must not be applied at all — not merely have its progress fields ignored.
   * `mergeMatchLivePayload` already shields the score from going backwards; this stops
   * the stale frame from overwriting the row's `revision` and `updatedAt` on its way
   * there, which would leave the row advertising itself as older than it is.
   */
  const incomingRevision = typeof update.revision === 'number' ? update.revision : payload.revision;

  /**
   * The row records the revision it was last updated from, so the next frame can be
   * ordered against it. The API sends it at the top level of the frame as well as inside
   * the snapshot, so fold it in when only the outer field carried it.
   */
  const mergeable: Record<string, unknown> =
    payload.revision === undefined && typeof incomingRevision === 'number'
      ? { ...payload, revision: incomingRevision }
      : payload;

  // Same ordering rule as the merge itself: the cricket first, revision as tie-break.
  if (idx !== -1 && isBehindCurrentState(matches[idx] as Record<string, unknown>, mergeable)) {
    return matches;
  }

  const nextRow = mergeMatchLivePayload({ matchId: update.matchId } as T, mergeable);

  if (idx === -1) {
    if (nextRow.status === 'live') {
      return [nextRow, ...matches];
    }
    return matches;
  }

  const next = [...matches];
  next[idx] = mergeMatchLivePayload(next[idx] as T & Record<string, unknown>, mergeable);
  return next;
}

/**
 * Folds a fresh list snapshot (a poll, or a new server render) into the rows already
 * on screen.
 *
 * The snapshot decides *which* matches are listed and in what order, but each row it
 * shares with the screen goes through `mergeMatchLivePayload`, so a poll that is behind
 * the socket cannot walk a card's score back. Replacing the rows wholesale did exactly
 * that: every 30s poll rewound socket-fresh cards by a ball or more until the next frame.
 */
export function mergeLiveRows<T extends { matchId?: string; id?: string }>(prev: T[], rows: T[]): T[] {
  rows.forEach(rememberLiveSnapshot);
  const byId = new Map(prev.map((row) => [normalizeMatchId(row.matchId || row.id), row]));
  return rows.map((row) => {
    const current = byId.get(normalizeMatchId(row.matchId || row.id));
    // A row new to this surface starts from the newest score the tab already knows.
    return current
      ? mergeMatchLivePayload(current as T & Record<string, unknown>, row as Record<string, unknown>)
      : withLatestLive(row);
  });
}

export function useMatchStream(matchId?: string | null, enabled = true): LiveUpdate | null {
  const [update, setUpdate] = useState<LiveUpdate | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    setUpdate(null);

    const socket = acquireMatchesSocket();
    let cancelled = false;
    // Live payloads are cumulative snapshots, so a burst of balls for one match can
    // safely coalesce: its latest snapshot supersedes the earlier ones. Without this
    // every broadcast caused a full-list merge plus per-card scoreboard math — the
    // long-task/TBT driver during live matches. The worst case added latency is one
    // window.
    //
    // Pending frames are kept *per match*. A single slot let match B's frame replace
    // match A's inside the same window, so on list pages A's card silently skipped
    // that update and sat a ball or more behind its match page until A scored again.
    let pending = new Map<string, LiveUpdate>();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      timer = null;
      const frames = [...pending.values()];
      pending = new Map();
      if (!frames.length || cancelled) return;
      setUpdate(frames.length === 1 ? frames[0] : { type: 'batch', ts: Date.now(), batch: frames });
    };

    const apply = (incoming: LiveUpdate) => {
      const id = normalizeMatchId(incoming.matchId);
      if (!id || incoming.type === 'ping') return;
      if (matchId && id !== normalizeMatchId(matchId)) return;
      const snapshot = unwrapSnapshot(incoming.data);
      if (!snapshot) return;
      if (cancelled) return;
      /**
       * The revision lives at the top level of the frame, but the canonical snapshot
       * carries it inside the payload too. Prefer the explicit field and fall back to
       * the snapshot so a frame from either path orders correctly.
       */
      const revision =
        typeof incoming.revision === 'number'
          ? incoming.revision
          : typeof snapshot.revision === 'number'
            ? snapshot.revision
            : null;
      rememberLiveSnapshot({ ...snapshot, matchId: id, ...(revision !== null ? { revision } : {}) });
      const build = (): LiveUpdate => ({
        type: 'match_update',
        matchId: id,
        data: snapshot,
        ts: incoming.ts ?? Date.now(),
        ...(revision !== null ? { revision } : {}),
      });
      // Leading edge applies immediately so a fresh mount never waits; anything
      // arriving inside the window replaces that match's pending payload only.
      if (!timer && pending.size === 0) {
        setUpdate(build());
        timer = setTimeout(flush, SOCKET_UPDATE_WINDOW_MS);
        return;
      }
      pending.set(id, build());
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
