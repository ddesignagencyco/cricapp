import { act, renderHook } from '@testing-library/react';

import { useDebouncedUrlQuery } from '../hooks/useDebouncedUrlQuery';

const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockSearch = '';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  usePathname: () => '/players',
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

describe('useDebouncedUrlQuery', () => {
  // The hook's own default. Kept as a constant here so the two cannot drift apart and
  // leave this file passing against a number the hook no longer uses.
  const DEBOUNCE_MS = 450;

  beforeEach(() => {
    jest.useFakeTimers();
    mockReplace.mockReset();
    mockPush.mockReset();
    mockSearch = '';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps immediate local input, trims, debounces, and resets page', () => {
    mockSearch = 'page=3';
    const { result } = renderHook(() => useDebouncedUrlQuery({ param: 'search' }));

    act(() => result.current.setInput('  Babar  '));
    expect(result.current.input).toBe('  Babar  ');
    expect(mockReplace).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(DEBOUNCE_MS - 1));
    expect(mockReplace).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(1));
    expect(mockReplace).toHaveBeenCalledWith('/players?search=Babar', { scroll: false });
  });

  it('clears the search param without firing duplicate URL updates', () => {
    mockSearch = 'search=old&page=4';
    const { result } = renderHook(() => useDebouncedUrlQuery({ param: 'search' }));

    act(() => result.current.setInput(''));
    act(() => jest.advanceTimersByTime(DEBOUNCE_MS));

    expect(mockReplace).toHaveBeenCalledWith('/players', { scroll: false });
  });

  it('does not eat a character typed while the debounce is committing', () => {
    // The bug this guards: the input was synced back from the URL on every URL change,
    // and the URL changed *because* of typing. So the echo of our own write overwrote
    // whatever the user had typed in the meantime — one keystroke silently disappeared,
    // more reliably the longer the debounce was.
    mockSearch = '';
    const { result, rerender } = renderHook(() => useDebouncedUrlQuery({ param: 'search' }));

    act(() => result.current.setInput('ab'));
    act(() => jest.advanceTimersByTime(DEBOUNCE_MS));
    expect(mockReplace).toHaveBeenCalledWith('/players?search=ab', { scroll: false });

    // The URL now reflects "ab". The reader keeps typing before React hands back the
    // navigation, which is the window the old code lost the keystroke in.
    act(() => result.current.setInput('abc'));

    // Next.js applies the navigation: the search params change to what we wrote.
    mockSearch = 'search=ab';
    rerender();

    expect(result.current.input).toBe('abc');
  });

  it('still follows the URL when the change did not come from this input', () => {
    // Back/forward, a shared link, a reset elsewhere. The echo suppression must not
    // lock the field against a value this hook never wrote.
    mockSearch = 'search=ab';
    const { result, rerender } = renderHook(() => useDebouncedUrlQuery({ param: 'search' }));

    act(() => result.current.setInput('abc'));
    act(() => jest.advanceTimersByTime(DEBOUNCE_MS));

    mockSearch = 'search=xy';
    rerender();

    expect(result.current.input).toBe('xy');
  });
});
