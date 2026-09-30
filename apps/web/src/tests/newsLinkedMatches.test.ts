import { matchIdOf, matchLabel, resetMatchIndex, searchLinkedMatches } from '../lib/newsLinkedMatches';

jest.mock('../services/matches', () => ({ fetchMatchById: jest.fn(), fetchMatchesPage: jest.fn() }));

import { fetchMatchById, fetchMatchesPage } from '../services/matches';

const getPage = fetchMatchesPage as jest.MockedFunction<typeof fetchMatchesPage>;
const getMatch = fetchMatchById as jest.MockedFunction<typeof fetchMatchById>;

/** A row shaped like GET /api/matches, which is the only list that returns the id. */
function match(over: Record<string, unknown> = {}) {
  return {
    matchId: 'sr:match:1',
    status: 'completed',
    teams: { home: { code: 'SUR', name: 'Surrey Jaguars' }, away: { code: 'MON', name: 'Montreal Tigers' } },
    teamNames: ['Surrey Jaguars', 'Montreal Tigers'],
    tournament: 'Global T20 Canada',
    venue: 'Caa Centre',
    scheduled: '2023-07-21T19:30:00+00:00',
    ...over,
  };
}

/** Serves `total` rows across pages of 100, the API's maximum page size. */
function serveCatalog(total: number, rows: (_i: number) => Record<string, unknown> = () => ({})) {
  getPage.mockImplementation(async ({ page = 1, limit = 100 } = {}) => {
    const from = ((page as number) - 1) * (limit as number);
    const size = Math.max(0, Math.min(limit as number, total - from));
    return {
      items: Array.from({ length: size }, (_, i) => match({ matchId: `sr:match:${from + i + 1}`, ...rows(from + i) })),
      total,
      totalPages: Math.max(1, Math.ceil(total / (limit as number))),
    } as never;
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  resetMatchIndex();
  getMatch.mockResolvedValue(null);
  serveCatalog(0);
});

describe('the Matches picker in the news editor', () => {
  it('finds a match by team name', async () => {
    serveCatalog(1);
    await expect(searchLinkedMatches('Surrey')).resolves.toEqual([
      { id: 'sr:match:1', label: 'Surrey Jaguars vs Montreal Tigers · Global T20 Canada · 21 Jul 2023' },
    ]);
  });

  it('finds a match by id', async () => {
    serveCatalog(1, () => ({ matchId: 'sr:match:42214237' }));
    const rows = await searchLinkedMatches('42214237');
    expect(rows[0]).toEqual({
      id: 'sr:match:42214237',
      label: 'Surrey Jaguars vs Montreal Tigers · Global T20 Canada · 21 Jul 2023',
    });
  });

  it('searches every status, not only live or upcoming fixtures', async () => {
    // A name search must reach the completed and cancelled matches too: an article is
    // usually written about a fixture that has already finished.
    serveCatalog(4, (i) => ({
      matchId: `sr:match:${i + 1}`,
      status: ['completed', 'live', 'upcoming', 'cancelled'][i],
    }));
    const rows = await searchLinkedMatches('Surrey');
    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row.id).sort()).toEqual(['sr:match:1', 'sr:match:2', 'sr:match:3', 'sr:match:4']);
  });

  it('marks a live match so the right fixture is easy to pick', async () => {
    serveCatalog(1, () => ({ status: 'live' }));
    const rows = await searchLinkedMatches('Surrey');
    expect(rows[0].label.endsWith('· LIVE')).toBe(true);
  });

  it('reads the whole table, not only the first page', async () => {
    // 250 rows is 3 pages; the fixture named below lives on the last one.
    getPage.mockImplementation(async ({ page = 1, limit = 100 } = {}) => {
      const from = ((page as number) - 1) * (limit as number);
      const size = Math.max(0, Math.min(limit as number, 250 - from));
      return {
        items: Array.from({ length: size }, (_, i) =>
          match({
            matchId: `sr:match:${from + i + 1}`,
            ...(from + i === 249 ? { teamNames: ['Zebras', 'Surrey Jaguars'], teams: {} } : {}),
          }),
        ),
        total: 250,
        totalPages: 3,
      } as never;
    });
    const rows = await searchLinkedMatches('Zebras');
    expect(rows.map((row) => row.id)).toEqual(['sr:match:250']);
  });

  it('asks for every page it needs and no more', async () => {
    serveCatalog(250);
    await searchLinkedMatches('Surrey');
    expect(getPage.mock.calls.map((call) => call[0]?.page).sort()).toEqual([1, 2, 3]);
  });

  it('caps how much of the table one search will crawl', async () => {
    serveCatalog(20000);
    await searchLinkedMatches('Surrey');
    expect(getPage).toHaveBeenCalledTimes(40);
  });

  it('loads the table once and reuses it for the next keystroke', async () => {
    serveCatalog(250);
    await searchLinkedMatches('Surrey');
    const callsAfterFirst = getPage.mock.calls.length;
    await searchLinkedMatches('Montreal');
    await searchLinkedMatches('Global');
    expect(getPage.mock.calls.length).toBe(callsAfterFirst);
  });

  it('rebuilds the index after the cache expires', async () => {
    jest.useFakeTimers();
    try {
      serveCatalog(250);
      await searchLinkedMatches('Surrey');
      const callsAfterFirst = getPage.mock.calls.length;
      jest.setSystemTime(Date.now() + 6 * 60 * 1000);
      await searchLinkedMatches('Surrey');
      expect(getPage.mock.calls.length).toBeGreaterThan(callsAfterFirst);
    } finally {
      jest.useRealTimers();
    }
  });

  it('shares one load between two searches made at once', async () => {
    serveCatalog(250);
    await Promise.all([searchLinkedMatches('Surrey'), searchLinkedMatches('Montreal')]);
    expect(getPage).toHaveBeenCalledTimes(3);
  });

  it('does not let one aborted keystroke break the shared load', async () => {
    serveCatalog(250);
    const controller = new AbortController();
    const first = searchLinkedMatches('Surrey', controller.signal);
    controller.abort();
    await first;
    // The index survives the abort, so the next search still works (capped at 25 rows).
    await expect(searchLinkedMatches('Montreal')).resolves.toHaveLength(25);
  });

  it('ranks an exact id above a name match', async () => {
    serveCatalog(2, (i) => ({ matchId: i === 0 ? 'sr:match:7' : 'sr:match:12345678' }));
    const rows = await searchLinkedMatches('sr:match:7');
    expect(rows[0].id).toBe('sr:match:7');
  });

  it('resolves a pasted id in one request even when the table does not have it', async () => {
    serveCatalog(1);
    getMatch.mockResolvedValue(
      match({ matchId: 'sr:match:999', teams: { home: { name: 'Lahore' }, away: { name: 'Karachi' } } }) as never,
    );
    const rows = await searchLinkedMatches('sr:match:999');
    expect(rows[0]).toEqual({ id: 'sr:match:999', label: 'Lahore vs Karachi' });
  });

  it('ignores a blank query instead of listing the table', async () => {
    serveCatalog(250);
    await expect(searchLinkedMatches('   ')).resolves.toEqual([]);
    expect(getPage).not.toHaveBeenCalled();
  });

  it('is not case sensitive', async () => {
    serveCatalog(1);
    await expect(searchLinkedMatches('sUrReY')).resolves.toHaveLength(1);
  });

  it('skips a row that carries no id rather than offering something unlinkable', async () => {
    getPage.mockResolvedValue({ items: [match({ matchId: '' })], total: 1, totalPages: 1 } as never);
    await expect(searchLinkedMatches('Surrey')).resolves.toEqual([]);
  });

  it('limits the dropdown', async () => {
    serveCatalog(200);
    await expect(searchLinkedMatches('Surrey')).resolves.toHaveLength(25);
  });

  it('reports a failure instead of silently offering nothing', async () => {
    getPage.mockRejectedValue(new Error('offline'));
    await expect(searchLinkedMatches('Surrey')).rejects.toThrow('offline');
  });

  it('does not cache a failed load, so the next search can succeed', async () => {
    getPage.mockRejectedValueOnce(new Error('offline'));
    await expect(searchLinkedMatches('Surrey')).rejects.toThrow('offline');
    serveCatalog(1);
    await expect(searchLinkedMatches('Surrey')).resolves.toHaveLength(1);
  });
});

describe('match label helpers', () => {
  it('accepts the id field names the API has used', () => {
    expect(matchIdOf({ matchId: 'sr:match:1' })).toBe('sr:match:1');
    expect(matchIdOf({ match_id: 'sr:match:2' })).toBe('sr:match:2');
    expect(matchIdOf({ id: 'sr:match:3' })).toBe('sr:match:3');
  });

  it('returns an empty string when the row has no id at all', () => {
    expect(matchIdOf({ teams: ['SUR', 'MON'] })).toBe('');
    expect(matchIdOf(null)).toBe('');
  });

  it('names both sides from the shapes the list and search endpoints use', () => {
    expect(matchLabel({ teams: { home: { name: 'Lahore' }, away: { name: 'Karachi' } } })).toBe('Lahore vs Karachi');
    expect(matchLabel({ teamNames: ['Lahore', 'Karachi'], teams: ['Lahore', 'Karachi'] })).toBe('Lahore vs Karachi');
  });
});
