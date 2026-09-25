import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedUrlQuery } from './useDebouncedUrlQuery';

const mockReplace = vi.fn();
const mockPush = vi.fn();
let mockSearch = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  usePathname: () => '/players',
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

describe('useDebouncedUrlQuery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockReplace.mockReset();
    mockPush.mockReset();
    mockSearch = '';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps immediate local input, trims, debounces, and resets page', () => {
    mockSearch = 'page=3';
    const { result } = renderHook(() => useDebouncedUrlQuery({ param: 'search' }));

    act(() => result.current.setInput('  Babar  '));
    expect(result.current.input).toBe('  Babar  ');
    expect(mockReplace).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(349));
    expect(mockReplace).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(mockReplace).toHaveBeenCalledWith('/players?search=Babar', { scroll: false });
  });

  it('clears the search param without firing duplicate URL updates', () => {
    mockSearch = 'search=old&page=4';
    const { result } = renderHook(() => useDebouncedUrlQuery({ param: 'search' }));

    act(() => result.current.setInput(''));
    act(() => vi.advanceTimersByTime(350));

    expect(mockReplace).toHaveBeenCalledWith('/players', { scroll: false });
  });
});
