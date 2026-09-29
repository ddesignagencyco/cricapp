import { renderHook, act } from '@testing-library/react';
import { useMatchStream, mergeLiveUpdate, mergeMatchLivePayload } from '../hooks/useMatchStream';

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
