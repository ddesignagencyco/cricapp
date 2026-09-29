import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import EntityIdPicker, { type EntityChoice } from '../components/admin/EntityIdPicker';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

const DEBOUNCE_MS = 280;

function deferred<T>() {
  let resolve!: (_value: T) => void;
  let reject!: (_reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function type(value: string) {
  const input = screen.getByPlaceholderText('Search match by name') as HTMLInputElement;
  await act(async () => {
    fireEvent.change(input, { target: { value } });
  });
}

async function settle(ms = DEBOUNCE_MS + 1) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

function renderPicker(search: jest.Mock, onChange = jest.fn()) {
  render(
    <EntityIdPicker
      label="Matches"
      hint="Search match by name"
      values={[]}
      onChange={onChange}
      search={search}
    />
  );
  return { onChange };
}

describe('EntityIdPicker', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('waits for the debounce before searching', async () => {
    const search = jest.fn().mockResolvedValue([{ id: 'a', label: 'Alpha' }]);
    renderPicker(search);

    await type('l');
    expect(search).not.toHaveBeenCalled();

    await settle();
    expect(search).toHaveBeenCalledWith('l', expect.anything());
  });

  it('renders the hits that came back', async () => {
    const search = jest.fn().mockResolvedValue([{ id: 'a', label: 'Alpha' } as EntityChoice]);
    renderPicker(search);

    await type('alpha');
    await settle();

    await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
    expect(screen.getByText('a')).toBeTruthy();
  });

  it('ignores a slow earlier response that resolves after a newer one', async () => {
    // Regression: the old picker had no request sequence guard, so "l" resolving
    // after "lahore" overwrote the fresher list.
    const slow = deferred<EntityChoice[]>();
    const fast = deferred<EntityChoice[]>();
    const search = jest
      .fn()
      .mockImplementationOnce(() => slow.promise)
      .mockImplementationOnce(() => fast.promise);

    renderPicker(search);

    await type('l');
    await settle();
    await type('lahore');
    await settle();

    await act(async () => {
      fast.resolve([{ id: 'fresh', label: 'Fresh' }]);
    });
    await act(async () => {
      slow.resolve([{ id: 'stale', label: 'Stale' }]);
    });

    expect(screen.getByText('Fresh')).toBeTruthy();
    expect(screen.queryByText('Stale')).toBeNull();
  });

  it('aborts the in-flight request when the query changes', async () => {
    const signals: (AbortSignal | undefined)[] = [];
    const search = jest.fn().mockImplementation((_q: string, signal?: AbortSignal) => {
      signals.push(signal);
      return Promise.resolve([] as EntityChoice[]);
    });

    renderPicker(search);

    await type('l');
    await settle();
    await type('la');
    await settle();

    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);
  });

  it('keeps the previous hits visible while a newer search runs', async () => {
    // Regression: the list was gated on `!loading`, so it blinked out for the
    // whole debounce + round trip on every keystroke.
    const search = jest
      .fn()
      .mockResolvedValueOnce([{ id: 'a', label: 'Alpha' }] as EntityChoice[])
      .mockImplementationOnce(() => new Promise<EntityChoice[]>(() => {}));

    renderPicker(search);

    await type('alpha');
    await settle();
    await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());

    await type('alphabet');
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Searching…')).toBeTruthy();
  });

  it('surfaces a failure instead of showing a silent empty list', async () => {
    const search = jest.fn().mockRejectedValue(new Error('boom'));
    renderPicker(search);

    await type('alpha');
    await settle();

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByRole('alert').textContent).toMatch(/Search failed/i);
  });

  it('reports an empty result set so the admin knows search actually ran', async () => {
    const search = jest.fn().mockResolvedValue([] as EntityChoice[]);
    renderPicker(search);

    await type('zzzz');
    await settle();

    await waitFor(() => expect(screen.getByText(/No matches\./i)).toBeTruthy());
  });

  it('picks a settled result on Enter', async () => {
    const search = jest.fn().mockResolvedValue([
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
    ] as EntityChoice[]);
    const { onChange } = renderPicker(search);

    await type('a');
    await settle();
    await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());

    await act(async () => {
      fireEvent.keyDown(screen.getByPlaceholderText('Search match by name'), { key: 'Enter' });
    });

    expect(onChange).toHaveBeenCalledWith([{ id: 'a', label: 'Alpha' }]);
  });

  it('never writes the raw typed text as an id on Enter', async () => {
    // Regression: Enter fell back to addRaw(), silently storing the search text as
    // an id, which the API then rejected on save with "One or more match ids are invalid".
    const search = jest.fn().mockResolvedValue([] as EntityChoice[]);
    const { onChange } = renderPicker(search);

    await type('sr:match:does-not-exist');
    await settle();
    await waitFor(() => expect(screen.getByText(/No matches\./i)).toBeTruthy());

    await act(async () => {
      fireEvent.keyDown(screen.getByPlaceholderText('Search match by name'), { key: 'Enter' });
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('adds a manually typed id only through the explicit button', async () => {
    const search = jest.fn().mockResolvedValue([] as EntityChoice[]);
    const { onChange } = renderPicker(search);

    await type('sr:match:12345');
    await settle();

    await act(async () => {
      fireEvent.click(screen.getByText('Add id'));
    });

    expect(onChange).toHaveBeenCalledWith([{ id: 'sr:match:12345', label: 'sr:match:12345' }]);
  });

  it('does not double-add an id that is already linked', async () => {
    const search = jest.fn().mockResolvedValue([{ id: 'a', label: 'Alpha' }] as EntityChoice[]);
    const onChange = jest.fn();
    render(
      <EntityIdPicker
        label="Matches"
        hint="Search match by name"
        values={[{ id: 'a', label: 'Alpha' }]}
        onChange={onChange}
        search={search}
      />
    );

    await type('alpha');
    await settle();
    // The linked chip and the result row both read "Alpha", so target the option.
    await waitFor(() => expect(screen.getByRole('option')).toBeTruthy());

    await act(async () => {
      fireEvent.click(screen.getByRole('option').querySelector('button') as HTMLButtonElement);
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('clears results when the query is emptied', async () => {
    const search = jest.fn().mockResolvedValue([{ id: 'a', label: 'Alpha' }] as EntityChoice[]);
    renderPicker(search);

    await type('alpha');
    await settle();
    await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());

    await type('');
    expect(screen.queryByText('Alpha')).toBeNull();
  });
});
