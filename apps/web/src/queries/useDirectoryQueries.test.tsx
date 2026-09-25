import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPlayersPage } from '../services/players';
import { usePlayersQuery } from './useDirectoryQueries';

vi.mock('../services/players', () => ({
  fetchPlayersPage: vi.fn(),
  fetchPlayerById: vi.fn(),
}));

function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
        gcTime: Infinity,
      },
    },
  });
}

const emptyPage = { items: [], total: 0, totalPages: 1 };

describe('directory query hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes the abort signal, reuses cached requests, and separates parameter caches', async () => {
    vi.mocked(fetchPlayersPage).mockResolvedValue(emptyPage);
    const client = createClient();
    const wrapper = createWrapper(client);
    const { result, rerender } = renderHook(
      ({ q }: { q: string }) => usePlayersQuery({ limit: 24, page: 1, q }),
      { initialProps: { q: 'ali' }, wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchPlayersPage).toHaveBeenCalledTimes(1);
    expect(fetchPlayersPage).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 24, page: 1, q: 'ali' }),
      expect.any(AbortSignal)
    );

    rerender({ q: 'ali' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchPlayersPage).toHaveBeenCalledTimes(1);

    rerender({ q: 'babar' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchPlayersPage).toHaveBeenCalledTimes(2);
  });

  it('keeps previous page data visible while a same-search page is fetching', async () => {
    vi.mocked(fetchPlayersPage)
      .mockResolvedValueOnce({ items: [], total: 40, totalPages: 2 })
      .mockImplementationOnce(() => new Promise(() => undefined));
    const client = createClient();
    const wrapper = createWrapper(client);
    const { result, rerender } = renderHook(
      ({ page }: { page: number }) => usePlayersQuery({ limit: 20, page, q: 'ali' }),
      { initialProps: { page: 1 }, wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    rerender({ page: 2 });
    await waitFor(() => expect(result.current.isFetching).toBe(true));
    expect(result.current.data?.total).toBe(40);
    expect(result.current.isPlaceholderData).toBe(true);
  });

  it('does not surface expected abort errors when a query key changes', async () => {
    let calls = 0;
    vi.mocked(fetchPlayersPage).mockImplementation((_params, signal) => {
      calls += 1;
      if (calls === 1 && signal) {
        return new Promise((_, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        });
      }
      return Promise.resolve(emptyPage);
    });
    const client = createClient();
    const wrapper = createWrapper(client);
    const { result, rerender } = renderHook(
      ({ q }: { q: string }) => usePlayersQuery({ limit: 20, page: 1, q }),
      { initialProps: { q: 'first' }, wrapper }
    );

    await waitFor(() => expect(calls).toBe(1));
    rerender({ q: 'second' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isError).toBe(false);
  });

  it('exposes pending, empty, and error states without converting errors into empty data', async () => {
    let resolvePage: ((_value: typeof emptyPage) => void) | undefined;
    vi.mocked(fetchPlayersPage).mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePage = resolve;
      })
    );
    const client = createClient();
    const wrapper = createWrapper(client);
    const pending = renderHook(() => usePlayersQuery({ limit: 20, page: 1 }), { wrapper });
    expect(pending.result.current.isPending).toBe(true);
    resolvePage?.(emptyPage);
    await waitFor(() => expect(pending.result.current.isSuccess).toBe(true));
    expect(pending.result.current.data).toEqual(emptyPage);

    pending.unmount();
    vi.mocked(fetchPlayersPage).mockRejectedValueOnce(new Error('network'));
    const errored = renderHook(() => usePlayersQuery({ limit: 20, page: 2 }), { wrapper });
    await waitFor(() => expect(errored.result.current.isError).toBe(true));
    expect(errored.result.current.data).toBeUndefined();
  });
});
