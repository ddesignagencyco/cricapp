import { act, renderHook } from '@testing-library/react';
import { useMatchStream, mergeLiveUpdate, mergeMatchLivePayload } from '../hooks/useMatchStream';
import { useMatchState } from '../hooks/useMatchState';

/**
 * Regression cover for "the same live match shows different scores on different
 * pages". Both causes below made a per-match page silently drop every socket
 * update while the list pages — which key off the raw id — kept moving.
 */

type Handler = (_payload: unknown) => void;

let handlers: Record<string, Handler> = {};
let emitted: Array<{ event: string; payload: unknown }> = [];
let connected = true;

jest.mock('socket.io-client', () => ({
  io: () => ({
    connected,
    on: (event: string, fn: Handler) => {
      handlers[event] = fn;
    },
    once: (event: string, fn: Handler) => {
      handlers[event] = fn;
    },
    off: () => {},
    emit: (_event: string, _payload: unknown) => {
      emitted.push({ event: _event, payload: _payload });
    },
    disconnect: () => {},
  }),
}));

/**
 * A realistic cumulative snapshot.
 *
 * `displayScore`, `displayOvers` and `teams` are included because
 * `deriveMatchState.pickScoreSource` reads the published row score first and only
 * falls back to `currentInnings` — a fixture with `currentInnings` alone would prove
 * nothing about which source actually won.
 */
function snapshot(runs: number, overs: string, wickets = 0) {
  return {
    status: 'live',
    currentInnings: { runs, overs, wickets, battingTeam: 'ZIM' },
    displayScore: `${runs}/${wickets}`,
    displayOvers: overs,
    teams: { home: { code: 'ZIM', score: `${runs}/${wickets}` }, away: { code: 'WI', score: '' } },
  };
}

function fire(event: string, matchId: string, data: unknown) {
  act(() => {
    handlers[event]?.({ type: 'match_update', matchId, data });
  });
}

beforeEach(() => {
  handlers = {};
  emitted = [];
  connected = true;
});

describe('match id normalisation', () => {
  it('accepts a socket update whose id is encoded differently from the page id', () => {
    // The page reads its id from the URL segment (encoded); the socket sends the raw
    // provider id. Compared raw they never matched and every update was dropped.
    const { result } = renderHook(() => useMatchStream('sr%3Amatch%3A74932666'));

    fire('live:update', 'sr:match:74932666', snapshot(78, '12.3'));

    expect(result.current).not.toBeNull();
    expect((result.current?.data as { currentInnings: { runs: number } }).currentInnings.runs).toBe(78);
  });

  it('still discards an update for a different match', () => {
    const { result } = renderHook(() => useMatchStream('sr:match:111'));
    fire('live:update', 'sr:match:222', snapshot(78, '12.3'));
    expect(result.current).toBeNull();
  });

  it('merges a live update into the right row of a list regardless of id encoding', () => {
    const list = [{ matchId: 'sr:match:74932666', currentInnings: { runs: 74, overs: '12.1', wickets: 1 } }];
    const next = mergeLiveUpdate(list as never, {
      type: 'match_update',
      matchId: 'sr%3Amatch%3A74932666',
      data: snapshot(78, '12.3', 2),
    } as never);

    expect(next).toHaveLength(1);
    expect((next[0] as unknown as { currentInnings: { runs: number; overs: string } }).currentInnings).toMatchObject({
      runs: 78,
      overs: '12.3',
    });
  });
});

describe('a slow poll may never rewind the score (race #4 in the brief)', () => {
  /**
   * The reported regression: the header advanced to 91/2 at 7.6 overs, then a poll or
   * cached server render landed carrying 69/2 at 6.0 and the score walked backwards —
   * while the timeline underneath still showed 91/2.
   */
  const advanced = {
    displayScore: '91/2',
    displayOvers: '7.6',
    currentInnings: { runs: 91, overs: '7.6', wickets: 2, battingTeam: 'WI' },
  };
  const stale = {
    displayScore: '69/2',
    displayOvers: '6',
    currentInnings: { runs: 69, overs: '6', wickets: 2, battingTeam: 'WI' },
  };

  it('ignores a frame that is behind in balls', () => {
    const out = mergeMatchLivePayload(advanced as never, stale as never) as unknown as typeof advanced;
    expect(out.displayScore).toBe('91/2');
    expect(out.displayOvers).toBe('7.6');
    expect(out.currentInnings).toMatchObject({ runs: 91, overs: '7.6' });
  });

  it('ignores it through the list path too, not just a single match', () => {
    const list = [{ matchId: 'sr:match:74932666', ...advanced }];
    const next = mergeLiveUpdate(list as never, {
      type: 'match_update',
      matchId: 'sr:match:74932666',
      data: stale,
    } as never);
    expect((next[0] as unknown as { displayScore: string }).displayScore).toBe('91/2');
  });

  it('still accepts a genuinely newer frame', () => {
    const out = mergeMatchLivePayload(stale as never, advanced as never) as unknown as typeof advanced;
    expect(out.displayScore).toBe('91/2');
    expect(out.currentInnings).toMatchObject({ runs: 91, overs: '7.6' });
  });

  it('still accepts a coarse-overs frame whose total has advanced', () => {
    const out = mergeMatchLivePayload(
      { displayScore: '74/1', displayOvers: '12.1', currentInnings: { runs: 74, overs: '12.1', wickets: 1, battingTeam: 'WI' } } as never,
      { displayScore: '78/2', displayOvers: '12', currentInnings: { runs: 78, overs: '12', wickets: 2, battingTeam: 'WI' } } as never,
    ) as unknown as { displayScore: string; currentInnings: Record<string, unknown> };
    expect(out.displayScore).toBe('78/2');
    // The richer decimal survives even though the frame's own figure was coarser.
    expect(out.currentInnings.overs).toBe('12.1');
  });
});

describe('socket stays on regardless of status', () => {
  it('applies updates even when the seeded status is not live', () => {
    // An innings break (or any provider status variant) used to switch the socket off
    // entirely, freezing the header on its server snapshot until a manual refresh.
    const { result } = renderHook(() =>
      useMatchState(snapshot(74, '12.1', 1) as never, 'sr:match:1'),
    );

    fire('live:update', 'sr:match:1', snapshot(90, '15.2'));

    expect(result.current.runs).toBe(90);
    expect(result.current.battingTeam).toBe('ZIM');
  });

  it('advances when the socket skips a ball and reports a coarser overs figure', () => {
    // The socket occasionally broadcasts whole overs (12) after the client already has
    // a richer decimal (12.1). `keepRicherOvers` must keep 12.1 while the run total —
    // which is cumulative and never stale — still moves forward.
    const { result } = renderHook(() =>
      useMatchState(snapshot(74, '12.1', 1) as never, 'sr:match:1'),
    );

    fire('live:update', 'sr:match:1', snapshot(78, '12', 2));

    expect(result.current.runs).toBe(78);
    expect(result.current.oversLabel).toBe('12.1');
  });

  it('accepts a genuinely newer overs from the socket', () => {
    const { result } = renderHook(() =>
      useMatchState(snapshot(74, '12.1', 1) as never, 'sr:match:1'),
    );

    fire('live:update', 'sr:match:1', snapshot(82, '13.4', 2));

    expect(result.current.runs).toBe(82);
    expect(result.current.oversLabel).toBe('13.4');
  });

  it('never walks the score backwards on a late duplicate event', () => {
    const { result } = renderHook(() =>
      useMatchState(snapshot(78, '12.3', 2) as never, 'sr:match:1'),
    );

    // An out-of-order redelivery of an older snapshot must not win.
    fire('live:update', 'sr:match:1', snapshot(74, '12.1', 1));

    expect(result.current.runs).toBe(78);
  });

  it('emits a room subscription for the match it is showing', () => {
    renderHook(() => useMatchStream('sr:match:777'));
    expect(emitted.some((e) => e.event === 'subscribe:match')).toBe(true);
  });
});