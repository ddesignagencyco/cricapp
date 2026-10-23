import { renderHook, act } from '@testing-library/react';
import { useMatchStream, mergeLiveRows, mergeLiveUpdate, mergeMatchLivePayload, clearLiveSnapshots, rememberLiveSnapshot, withLatestLive } from '../hooks/useMatchStream';

jest.mock('socket.io-client', () => ({
  io: jest.fn(),
}));

import { io } from 'socket.io-client';

const ioMock = io as unknown as jest.Mock;

type Handler = (..._args: unknown[]) => void;

function makeSocket() {
  const handlers = new Map<string, Handler[]>();
  return {
    connected: true,
    emitted: [] as Array<[string, unknown]>,
    on(event: string, fn: Handler) {
      handlers.set(event, [...(handlers.get(event) ?? []), fn]);
    },
    off(event: string, fn: Handler) {
      handlers.set(event, (handlers.get(event) ?? []).filter((h) => h !== fn));
    },
    once(event: string, fn: Handler) {
      this.on(event, fn);
    },
    emit(event: string, payload: unknown) {
      this.emitted.push([event, payload]);
    },
    disconnect: jest.fn(),
    fire(event: string, payload: unknown) {
      (handlers.get(event) ?? []).forEach((h) => h(payload));
    },
    listenerCount(event: string) {
      return (handlers.get(event) ?? []).length;
    },
  };
}

let socket: ReturnType<typeof makeSocket>;

beforeEach(() => {
  clearLiveSnapshots();
  socket = makeSocket();
  ioMock.mockReturnValue(socket);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('mergeMatchLivePayload', () => {
  it('ignores null and undefined values so a partial update cannot wipe state', () => {
    const prev: Record<string, unknown> = { matchId: 'm1', venue: 'Gaddafi', runs: 150 };
    const out = mergeMatchLivePayload(prev, { venue: null, runs: undefined, city: 'Lahore' });
    expect(out.venue).toBe('Gaddafi');
    expect(out.runs).toBe(150);
    expect(out.city).toBe('Lahore');
  });

  it('does not let a thin event type overwrite the row type', () => {
    const out = mergeMatchLivePayload({ type: 'scheduled' }, { type: 'runs' });
    expect(out.type).toBe('scheduled');
  });

  it('keeps the previous matchId when the payload omits it', () => {
    expect(mergeMatchLivePayload({ matchId: 'm1' }, { venue: 'x' }).matchId).toBe('m1');
  });

  it('lets a new matchId win when the payload carries one', () => {
    expect(mergeMatchLivePayload({ matchId: 'm1' }, { matchId: 'm2' }).matchId).toBe('m2');
  });

  describe('overs handling', () => {
    it('accepts a newer ball count', () => {
      const out = mergeMatchLivePayload(
        { currentInnings: { overs: '7.3', runs: 50 } },
        { currentInnings: { overs: '7.4', runs: 51 } },
      );
      expect(out.currentInnings).toMatchObject({ overs: '7.4', runs: 51 });
    });

    it('keeps the richer cricket decimal when the socket sends whole overs', () => {
      // Provider sometimes sends 7 after we already know 7.3 — going backwards
      // would visibly rewind the over counter for users.
      const out = mergeMatchLivePayload(
        { currentInnings: { overs: '7.3', runs: 50 } },
        { currentInnings: { overs: '7', runs: 50 } },
      );
      expect(out.currentInnings).toMatchObject({ overs: '7.3' });
    });

    it('accepts the lower overs when a new innings starts (runs reset)', () => {
      const out = mergeMatchLivePayload(
        { currentInnings: { overs: '20.0', runs: 200, battingTeam: 'Lahore' } },
        { currentInnings: { overs: '0.1', runs: 1, battingTeam: 'Lahore' } },
      );
      expect(out.currentInnings).toMatchObject({ overs: '0.1', runs: 1 });
    });

    it('resets overs when the batting team changes innings', () => {
      const out = mergeMatchLivePayload(
        { currentInnings: { overs: '20.0', runs: 200, battingTeam: 'Lahore' } },
        { currentInnings: { overs: '0.2', runs: 3, battingTeam: 'Islamabad' } },
      );
      expect(out.currentInnings).toMatchObject({ overs: '0.2', battingTeam: 'Islamabad' });
    });

    it('preserves the previous score when the payload sends an empty innings', () => {
      const out = mergeMatchLivePayload(
        { currentInnings: { overs: '10.2', runs: 80, wickets: 2 } },
        { currentInnings: { overs: '', runs: 0, wickets: 0 } },
      );
      expect(out.currentInnings).toMatchObject({ overs: '10.2', runs: 80, wickets: 2 });
    });
  });

  it('merges teamScores per side instead of replacing the object', () => {
    const out = mergeMatchLivePayload(
      { teamScores: { home: { runs: 100 }, away: { runs: 90 } } },
      { teamScores: { home: { runs: 120 } } },
    );
    expect(out.teamScores).toEqual({ home: { runs: 120 }, away: { runs: 90 } });
  });

  it('merges lastEvent rather than replacing it', () => {
    const out = mergeMatchLivePayload(
      { lastEvent: { text: 'Four', over: 3 } },
      { lastEvent: { over: 4 } },
    );
    expect(out.lastEvent).toEqual({ text: 'Four', over: 4 });
  });

  it('rejects a teamNames array with fewer than two entries', () => {
    const prev = { teamNames: ['Lahore', 'Islamabad'] };
    expect(mergeMatchLivePayload(prev, { teamNames: ['Only'] }).teamNames).toEqual([
      'Lahore',
      'Islamabad',
    ]);
  });

  it('does not let an empty string clear a populated field', () => {
    const out = mergeMatchLivePayload(
      { venue: 'Gaddafi', matchStatus: 'live', tournament: 'PSL' },
      { venue: '', matchStatus: '', tournament: '' },
    );
    expect(out).toMatchObject({ venue: 'Gaddafi', matchStatus: 'live', tournament: 'PSL' });
  });
});

describe('mergeLiveUpdate', () => {
  const live = { matchId: 'm1', status: 'live', venue: 'Gaddafi' };

  it('ignores pings and updates with no matchId', () => {
    const rows = [live];
    expect(mergeLiveUpdate(rows, { type: 'ping' })).toBe(rows);
    expect(mergeLiveUpdate(rows, null)).toBe(rows);
    expect(mergeLiveUpdate(rows, { type: 'live:update' })).toBe(rows);
  });

  it('ignores thin events that carry no score fields', () => {
    const rows = [live];
    expect(mergeLiveUpdate(rows, { type: 'live:update', matchId: 'm1', data: { type: 'runs' } })).toBe(rows);
  });

  it('patches the matching match in place', () => {
    const out = mergeLiveUpdate([live], {
      type: 'live:update',
      matchId: 'm1',
      data: { venue: 'Nishtar' },
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ matchId: 'm1', venue: 'Nishtar', status: 'live' });
  });

  it('leaves other matches untouched', () => {
    const out = mergeLiveUpdate([live, { matchId: 'm2', status: 'upcoming' }], {
      type: 'live:update',
      matchId: 'm1',
      data: { venue: 'Nishtar' },
    });
    expect(out[1]).toEqual({ matchId: 'm2', status: 'upcoming' });
  });

  it('prepends a brand new match only when it is live', () => {
    const out = mergeLiveUpdate([], {
      type: 'live:update',
      matchId: 'new',
      data: { status: 'live' },
    });
    expect(out).toHaveLength(1);
    expect(out[0].matchId).toBe('new');
  });

  it('does not add an unknown match that is not live', () => {
    const out = mergeLiveUpdate([live], {
      type: 'live:update',
      matchId: 'new',
      data: { status: 'completed' },
    });
    expect(out).toHaveLength(1);
  });

  it('does not mutate the input array', () => {
    const rows = [live];
    const snapshot = JSON.stringify(rows);
    mergeLiveUpdate(rows, { type: 'live:update', matchId: 'm1', data: { venue: 'New' } });
    expect(JSON.stringify(rows)).toBe(snapshot);
  });

  describe('revision ordering', () => {
    it('drops a frame whose revision is older than the row it would patch', () => {
      const rows: Array<Record<string, unknown>> = [
        { matchId: 'm1', status: 'live', revision: 500 },
      ];
      const out = mergeLiveUpdate(rows, {
        type: 'live:update',
        matchId: 'm1',
        revision: 400,
        data: { displayScore: '10/0', venue: 'Stale' },
      });
      // Same array back: nothing was merged, so nothing rewound.
      expect(out).toBe(rows);
      expect(out[0].revision).toBe(500);
      expect(out[0].venue).toBeUndefined();
      expect(out[0].displayScore).toBeUndefined();
    });

    it('applies a frame whose revision is newer', () => {
      const rows: Array<Record<string, unknown>> = [
        { matchId: 'm1', status: 'live', revision: 500 },
      ];
      const out = mergeLiveUpdate(rows, {
        type: 'live:update',
        matchId: 'm1',
        revision: 501,
        data: { displayScore: '12/1' },
      });
      expect(out[0]).toMatchObject({ revision: 501, displayScore: '12/1' });
    });

    it('reads the revision off the snapshot when the frame omits it', () => {
      const rows: Array<Record<string, unknown>> = [
        { matchId: 'm1', status: 'live', revision: 500 },
      ];
      const out = mergeLiveUpdate(rows, {
        type: 'live:update',
        matchId: 'm1',
        data: { revision: 400, displayScore: '10/0' },
      });
      expect(out).toBe(rows);
    });

    it('does not treat an equal revision as stale', () => {
      // The provider can rewrite the same position with a fresher runs/wickets write,
      // so equal revisions must still merge.
      const rows: Array<Record<string, unknown>> = [
        { matchId: 'm1', status: 'live', revision: 500, displayScore: '10/0' },
      ];
      const out = mergeLiveUpdate(rows, {
        type: 'live:update',
        matchId: 'm1',
        revision: 500,
        data: { displayScore: '10/0', venue: 'Gaddafi' },
      });
      expect(out[0]).toMatchObject({ venue: 'Gaddafi' });
    });

    it('falls back to the overs heuristic when either side has no revision', () => {
      const rows = [{ matchId: 'm1', status: 'live', currentInnings: { overs: '10.2', runs: 80 } }];
      const out = mergeLiveUpdate(rows, {
        type: 'live:update',
        matchId: 'm1',
        data: { currentInnings: { overs: '9.4', runs: 70 } },
      });
      // Behind in balls with no totals to prove freshness: the progress fields are kept.
      expect(out[0].currentInnings).toMatchObject({ overs: '10.2', runs: 80 });
    });
  });
});

describe('useMatchStream', () => {
  it('subscribes to the requested match on mount', () => {
    renderHook(() => useMatchStream('m1'));
    expect(socket.emitted).toContainEqual(['subscribe:match', { matchId: 'm1' }]);
  });

  it('emits a normalised match_update from a live:update event', () => {
    const { result } = renderHook(() => useMatchStream('m1'));

    act(() => {
      socket.fire('live:update', {
        type: 'live:update',
        matchId: 'm1',
        ts: 1234,
        data: { status: 'live', venue: 'Gaddafi' },
      });
    });

    expect(result.current).toEqual({
      type: 'match_update',
      matchId: 'm1',
      ts: 1234,
      data: { status: 'live', venue: 'Gaddafi' },
    });
  });

  it('unwraps a nested match snapshot', () => {
    const { result } = renderHook(() => useMatchStream('m1'));
    act(() => {
      socket.fire('live:update', {
        type: 'live:update',
        matchId: 'm1',
        data: { match: { status: 'live', venue: 'Gaddafi' } },
      });
    });
    expect(result.current?.data).toEqual({ status: 'live', venue: 'Gaddafi' });
  });

  it('drops events for a different match', () => {
    const { result } = renderHook(() => useMatchStream('m1'));
    act(() => {
      socket.fire('live:update', {
        type: 'live:update',
        matchId: 'm2',
        data: { status: 'live' },
      });
    });
    expect(result.current).toBeNull();
  });

  it('drops pings and thin events', () => {
    const { result } = renderHook(() => useMatchStream('m1'));
    act(() => {
      socket.fire('live:update', { type: 'ping', matchId: 'm1' });
      socket.fire('live:update', { type: 'live:update', matchId: 'm1', data: { type: 'wicket' } });
    });
    expect(result.current).toBeNull();
  });

  it('accepts match:update as well as live:update', () => {
    const { result } = renderHook(() => useMatchStream('m1'));
    act(() => {
      socket.fire('match:update', {
        type: 'match:update',
        matchId: 'm1',
        data: { status: 'live' },
      });
    });
    expect(result.current?.data).toEqual({ status: 'live' });
  });

  it('carries the revision through instead of dropping it', () => {
    const { result } = renderHook(() => useMatchStream('m1'));
    act(() => {
      socket.fire('live:update', {
        type: 'live:update',
        matchId: 'm1',
        revision: 777,
        data: { status: 'live' },
      });
    });
    expect(result.current?.revision).toBe(777);
  });

  it('falls back to the snapshot revision when the frame omits it', () => {
    const { result } = renderHook(() => useMatchStream('m1'));
    act(() => {
      socket.fire('live:update', {
        type: 'live:update',
        matchId: 'm1',
        data: { status: 'live', revision: 778 },
      });
    });
    expect(result.current?.revision).toBe(778);
  });

  it('does not connect when disabled', () => {
    renderHook(() => useMatchStream('m1', false));
    expect(ioMock).not.toHaveBeenCalled();
  });

  it('unsubscribes and detaches listeners on unmount', () => {
    const { unmount } = renderHook(() => useMatchStream('m1'));
    expect(socket.listenerCount('live:update')).toBe(1);

    unmount();

    expect(socket.emitted).toContainEqual(['unsubscribe:match', { matchId: 'm1' }]);
    expect(socket.listenerCount('live:update')).toBe(0);
    expect(socket.listenerCount('match:update')).toBe(0);
  });

  it('keeps the shared socket alive while a second subscriber is mounted', () => {
    renderHook(() => useMatchStream('m1'));
    const second = renderHook(() => useMatchStream('m2'));
    second.unmount();
    // First subscriber still holds a ref, so the socket must stay connected.
    expect(socket.disconnect).not.toHaveBeenCalled();
  });
});

describe('list subscription coalescing', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const frame = (matchId: string, runs: number, revision: number) => ({
    type: 'live:update',
    matchId,
    revision,
    data: { status: 'live', currentInnings: { runs, wickets: 1, overs: 5.1, battingTeam: 'PAK' } },
  });

  it('keeps one pending frame per match instead of letting another match replace it', () => {
    const { result } = renderHook(() => useMatchStream(undefined, true));
    const rows = [
      { matchId: 'a', status: 'live', currentInnings: { runs: 10, wickets: 1, overs: 5, battingTeam: 'PAK' }, revision: 1 },
      { matchId: 'b', status: 'live', currentInnings: { runs: 20, wickets: 1, overs: 5, battingTeam: 'PAK' }, revision: 1 },
    ];

    act(() => socket.fire('live:update', frame('a', 11, 2))); // leading edge
    act(() => {
      socket.fire('live:update', frame('a', 14, 3));
      socket.fire('live:update', frame('b', 24, 3));
    });
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Both matches' latest frames survive the window.
    const merged = mergeLiveUpdate(rows, result.current);
    expect((merged[0].currentInnings as { runs: number }).runs).toBe(14);
    expect((merged[1].currentInnings as { runs: number }).runs).toBe(24);
  });
});

describe('mergeLiveRows', () => {
  const row = (matchId: string, runs: number, overs: number, revision: number) => ({
    matchId,
    status: 'live',
    revision,
    currentInnings: { runs, wickets: 2, overs, battingTeam: 'PAK' },
  });

  it('does not let a lagging poll rewind a socket-fresh row', () => {
    const next = mergeLiveRows([row('a', 40, 8.2, 5)], [row('a', 33, 7.6, 4)]);
    expect(next[0].currentInnings).toMatchObject({ runs: 40, overs: 8.2 });
  });

  it('applies a newer poll', () => {
    const next = mergeLiveRows([row('a', 33, 7.6, 4)], [row('a', 40, 8.2, 5)]);
    expect(next[0].currentInnings).toMatchObject({ runs: 40, overs: 8.2 });
  });

  it('lets the poll decide which matches are listed', () => {
    const next = mergeLiveRows([row('a', 33, 7.6, 4), row('old', 1, 1, 1)], [row('a', 33, 7.6, 4), row('new', 5, 1, 1)]);
    expect(next.map((r) => r.matchId)).toEqual(['a', 'new']);
  });

  it('seeds from the poll when nothing is on screen yet', () => {
    const rows = [row('a', 33, 7.6, 4)];
    expect(mergeLiveRows([], rows)).toEqual(rows);
  });
});

describe('ordering by the cricket, not by revision alone', () => {
  const inn = (runs: number, overs: number, wickets = 6) => ({ battingTeam: 'AUS', runs, wickets, overs });

  it('rejects an older score that carries the same revision (the 151 → 136 bounce)', () => {
    // Revision is derived from the stored timeline and lags, so a cached snapshot two
    // overs old can share it with the live one.
    const prev = { matchId: 'm1', status: 'live', revision: 900, currentInnings: inn(151, 19.2), displayScore: '151/6' };
    const stale = { matchId: 'm1', status: 'live', revision: 900, currentInnings: inn(136, 17.4), displayScore: '136/6' };
    const out = mergeMatchLivePayload(prev, stale);
    expect(out.currentInnings).toMatchObject({ runs: 151, overs: 19.2 });
    expect(out.displayScore).toBe('151/6');
  });

  it('accepts a newer score even when its revision is lower (different writer)', () => {
    const prev = { matchId: 'm1', status: 'live', revision: 950, currentInnings: inn(136, 17.4) };
    const fresh = { matchId: 'm1', status: 'live', revision: 900, currentInnings: inn(151, 19.2) };
    expect(mergeMatchLivePayload(prev, fresh).currentInnings).toMatchObject({ runs: 151, overs: 19.2 });
    expect(mergeMatchLivePayload(prev, fresh).revision).toBe(900);
  });

  it('takes the higher total on the same ball (extras add runs without a ball)', () => {
    const prev = { matchId: 'm1', status: 'live', currentInnings: inn(140, 18) };
    expect(mergeMatchLivePayload(prev, { currentInnings: inn(141, 18) }).currentInnings).toMatchObject({ runs: 141 });
    expect(mergeMatchLivePayload({ ...prev, currentInnings: inn(141, 18) }, { currentInnings: inn(140, 18) }).currentInnings).toMatchObject({ runs: 141 });
  });

  it('does not let a stale frame rewrite the per-side totals', () => {
    const prev = { matchId: 'm1', status: 'live', currentInnings: inn(151, 19.2), teamScores: { home: { score: '151/6', overs: '19.2' } } };
    const stale = { currentInnings: inn(136, 17.4), teamScores: { home: { score: '136/6', overs: '17.4' } } };
    expect(mergeMatchLivePayload(prev, stale).teamScores).toMatchObject({ home: { score: '151/6' } });
  });
});

describe('latest live snapshot shared across surfaces', () => {
  const row = (runs: number, overs: number) => ({ matchId: 'sr:match:1', status: 'live', currentInnings: { battingTeam: 'AUS', runs, wickets: 6, overs } });

  it('brings a stale server row forward to the newest score the tab has seen', () => {
    rememberLiveSnapshot(row(151, 19.2));
    expect(withLatestLive(row(136, 17.4)).currentInnings).toMatchObject({ runs: 151, overs: 19.2 });
  });

  it('never moves the remembered snapshot backwards', () => {
    rememberLiveSnapshot(row(151, 19.2));
    rememberLiveSnapshot(row(136, 17.4));
    expect(withLatestLive(row(100, 15)).currentInnings).toMatchObject({ runs: 151 });
  });

  it('keeps a row that is already ahead of what was remembered', () => {
    rememberLiveSnapshot(row(140, 18));
    expect(withLatestLive(row(151, 19.2)).currentInnings).toMatchObject({ runs: 151 });
  });

  it('seeds a newly listed row from the remembered snapshot', () => {
    rememberLiveSnapshot(row(151, 19.2));
    const [seeded] = mergeLiveRows([], [row(136, 17.4)]);
    expect(seeded.currentInnings).toMatchObject({ runs: 151 });
  });
});
