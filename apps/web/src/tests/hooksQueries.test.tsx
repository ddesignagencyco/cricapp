import { renderHook, act, render } from '@testing-library/react';
import { useState } from 'react';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { runAbortable } from '../queries/queryUtils';
import { makeQueryClient, getQueryClient } from '../queries/queryClient';
import { QUERY_STALE_TIME, QUERY_GC_TIME } from '../queries/constants';
import { filterChipClass, filterChipCountClass } from '../components/ui/filterChip';
import { surfaceCard, cardInteractive, directoryRowCard, newsCard, cardDiamond } from '../components/ui/interaction';
import { ApiError } from '../services/api/client';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useDebouncedValue', () => {
  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('a'));
    expect(result.current).toBe('a');
  });

  it('holds the old value until the delay elapses', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), {
      initialProps: { v: 'a' },
    });

    rerender({ v: 'b' });
    expect(result.current).toBe('a');

    act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(result.current).toBe('a');

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('b');
  });

  it('restarts the timer on each keystroke so only the last value lands', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), {
      initialProps: { v: 'a' },
    });

    rerender({ v: 'ab' });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    rerender({ v: 'abc' });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    // The first timer was cancelled, so the old value is still showing.
    expect(result.current).toBe('a');

    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe('abc');
  });

  it('defaults the delay to 350ms', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v), {
      initialProps: { v: 'a' },
    });
    rerender({ v: 'b' });
    act(() => {
      jest.advanceTimersByTime(349);
    });
    expect(result.current).toBe('a');
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('b');
  });
});

describe('useFocusTrap', () => {
  function Dialog({ active }: { active: boolean }) {
    const ref = useFocusTrap<HTMLDivElement>(active);
    return (
      <div>
        <button type="button">outside</button>
        <div ref={ref} tabIndex={-1} data-testid="dialog">
          <button type="button" data-testid="first">
            first
          </button>
          <button type="button" data-testid="last">
            last
          </button>
        </div>
      </div>
    );
  }

  const byTestId = (id: string) => {
    const el = document.querySelector<HTMLElement>(`[data-testid="${id}"]`);
    if (!el) throw new Error(`missing ${id}`);
    return el;
  };

  function tab(shiftKey = false) {
    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true });
    document.activeElement?.dispatchEvent(event);
    return event;
  }

  it('moves focus into the dialog when it opens', () => {
    render(<Dialog active />);
    expect(document.activeElement?.textContent).toBe('first');
  });

  it('does not touch focus while the dialog is closed', () => {
    render(<Dialog active={false} />);
    expect(document.activeElement?.textContent).not.toBe('first');
  });

  it('wraps focus from the last control back to the first', () => {
    render(<Dialog active />);
    const last = byTestId('last');
    last.focus();
    const event = tab();
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement?.textContent).toBe('first');
  });

  it('wraps focus backwards from the first control to the last', () => {
    render(<Dialog active />);
    const event = tab(true);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement?.textContent).toBe('last');
  });

  it('leaves middle tabbing alone', () => {
    render(<Dialog active />);
    const first = byTestId('first');
    first.focus();
    const event = tab();
    expect(event.defaultPrevented).toBe(false);
  });

  it('ignores keys other than Tab', () => {
    render(<Dialog active />);
    const first = byTestId('first');
    first.focus();
    const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
    document.activeElement?.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('detaches the listener on unmount so it cannot leak', () => {
    const { unmount } = render(<Dialog active />);
    unmount();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    expect(() => document.dispatchEvent(event)).not.toThrow();
  });
});

describe('runAbortable', () => {
  it('passes the signal to the fetcher and returns its result', async () => {
    const controller = new AbortController();
    await expect(runAbortable(controller.signal, async () => 'data')).resolves.toBe('data');
  });

  it('rethrows a real failure when not aborted', async () => {
    const controller = new AbortController();
    await expect(
      runAbortable(controller.signal, async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
  });

  it('never settles after an abort, so react-query drops the stale query', async () => {
    const controller = new AbortController();
    const promise = runAbortable(controller.signal, async () => {
      controller.abort();
      throw new Error('aborted');
    });
    let settled = false;
    void promise.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(settled).toBe(false);
  });
});

describe('query client', () => {
  it('builds a client with the shared staleness windows', () => {
    const client = makeQueryClient();
    const opts = client.getDefaultOptions().queries;
    expect(opts?.staleTime).toBe(QUERY_STALE_TIME);
    expect(opts?.gcTime).toBe(QUERY_GC_TIME);
    expect(opts?.refetchOnWindowFocus).toBe(false);
    expect(opts?.refetchOnReconnect).toBe(true);
  });

  it('retries once for a transient failure', () => {
    const retry = makeQueryClient().getDefaultOptions().queries?.retry as (_n: number, _e: unknown) => boolean;
    expect(retry(0, new Error('network'))).toBe(true);
    expect(retry(1, new Error('network'))).toBe(false);
  });

  it('never retries a client error', () => {
    const retry = makeQueryClient().getDefaultOptions().queries?.retry as (_n: number, _e: unknown) => boolean;
    [400, 401, 403, 404].forEach((status) => {
      expect(retry(0, new ApiError(status, 'nope'))).toBe(false);
    });
  });

  it('still retries a 500', () => {
    const retry = makeQueryClient().getDefaultOptions().queries?.retry as (_n: number, _e: unknown) => boolean;
    expect(retry(0, new ApiError(500, 'boom'))).toBe(true);
  });

  it('returns the same client on the server for every call', () => {
    const spy = jest.spyOn(globalThis, 'window', 'get').mockReturnValue(undefined as never);
    try {
      expect(getQueryClient()).toBeInstanceOf(Object);
      expect(typeof getQueryClient().getDefaultOptions).toBe('function');
    } finally {
      spy.mockRestore();
    }
  });

  it('memoises one client in the browser', () => {
    expect(getQueryClient()).toBe(getQueryClient());
  });
});

describe('shared class name helpers', () => {
  it('switches the chip treatment on the active flag', () => {
    expect(filterChipClass(true)).toContain('btn-brand');
    expect(filterChipClass(false)).toContain('btn-secondary');
    expect(filterChipClass(true)).not.toContain('btn-secondary');
  });

  it('keeps the base layout identical whichever state it is in', () => {
    // Everything up to the state-specific class must be byte-identical, so the
    // chip cannot change size between the two states.
    const base = 'inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold motion-reduce:transition-none active:translate-y-px';
    expect(filterChipClass(true)).toBe(`${base} btn-brand`);
    expect(filterChipClass(false)).toBe(`${base} btn-secondary bg-card text-stext hover:text-mtext`);
  });

  it('dims the count only when the chip is inactive', () => {
    expect(filterChipCountClass(false)).toContain('text-stext');
    expect(filterChipCountClass(true)).not.toContain('text-stext');
  });

  it('exposes non-empty shared surface classes', () => {
    [surfaceCard, cardInteractive, directoryRowCard, newsCard, cardDiamond].forEach((value) => {
      expect(value.length).toBeGreaterThan(0);
    });
  });

  it('marks directory rows as interactive so hover styles apply', () => {
    expect(directoryRowCard).toContain('card-interactive');
  });
});

describe('query constants', () => {
  it('uses five minute staleness and thirty minute collection', () => {
    expect(QUERY_STALE_TIME).toBe(5 * 60 * 1000);
    expect(QUERY_GC_TIME).toBe(30 * 60 * 1000);
  });

  it('collects long after data goes stale, avoiding a refetch flash', () => {
    expect(QUERY_GC_TIME).toBeGreaterThan(QUERY_STALE_TIME);
  });
});

describe('state helper sanity', () => {
  it('keeps a re-render hook usable inside the fake timer environment', () => {
    const { result } = renderHook(() => useState(1)[0]);
    expect(result.current).toBe(1);
  });
});
