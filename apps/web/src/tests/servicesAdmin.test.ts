import { apiGet, apiGetOptional, apiPost, apiPatch, apiDelete, ApiError } from '../services/api/client';

jest.mock('../services/api/client', () => {
  const actual = jest.requireActual('../services/api/client');
  return {
    ...actual,
    apiGet: jest.fn(),
    apiGetOptional: jest.fn(),
    apiPost: jest.fn(),
    apiPatch: jest.fn(),
    apiDelete: jest.fn(),
  };
});

import { fetchMatchOdds, convertOdds, fetchOddsMargin, fetchOddsHistory, fetchAdminOddsSourceHealth } from '../services/odds';
import {
  fetchTournaments,
  fetchTournamentsPage,
  fetchTournamentById,
  fetchTournamentSeasons,
  fetchTournamentInfo,
  fetchTournamentResults,
} from '../services/tournaments';
import { fetchTours, fetchToursPage } from '../services/tours';
import {
  fetchAdminUsers,
  updateAdminUser,
  deleteAdminUser,
  fetchAdminAuthors,
  createAdminAuthor,
  updateAdminAuthor,
  deleteAdminAuthor,
  fetchReportedComments,
  moderateComment,
  resolveReport,
  fetchAdminAnalytics,
  fetchIngestionHealth,
} from '../services/admin';
import {
  fetchNewsAdmin,
  fetchAllNewsAdmin,
  fetchNewsArticle,
  createNews,
  updateNews,
  deleteNews,
  createCategory,
  updateCategory,
  deleteCategory,
  createNewsTranslation,
} from '../services/newsAdmin';

const get = apiGet as jest.MockedFunction<typeof apiGet>;
const getOptional = apiGetOptional as jest.MockedFunction<typeof apiGetOptional>;
const post = apiPost as jest.MockedFunction<typeof apiPost>;
const patch = apiPatch as jest.MockedFunction<typeof apiPatch>;
const del = apiDelete as jest.MockedFunction<typeof apiDelete>;

const page = (items: unknown[], total = items.length, totalPages = 1) => ({
  data: items,
  meta: { totalRecords: total, page: 1, limit: 20, totalPages },
});

beforeEach(() => {
  jest.resetAllMocks();
});

describe('odds service', () => {
  it('returns an ok result on success', async () => {
    get.mockResolvedValue({ matchId: 'm1' } as never);
    await expect(fetchMatchOdds('sr:match:1')).resolves.toEqual({ status: 'ok', data: { matchId: 'm1' } });
    expect(get).toHaveBeenCalledWith('/odds/sr%3Amatch%3A1', undefined, { revalidate: 30 });
  });

  it('reports forbidden rather than throwing on 403', async () => {
    // 403 means the odds feed is not licensed, which the UI shows as a teaser.
    get.mockRejectedValue(new ApiError(403, 'no odds license'));
    await expect(fetchMatchOdds('m1')).resolves.toEqual({ status: 'forbidden' });
  });

  it('reports not_found on 404', async () => {
    get.mockRejectedValue(new ApiError(404, 'gone'));
    await expect(fetchMatchOdds('m1')).resolves.toEqual({ status: 'not_found' });
  });

  it('rethrows a server error so outages are not hidden as "no odds"', async () => {
    get.mockRejectedValue(new ApiError(500, 'boom'));
    await expect(fetchMatchOdds('m1')).rejects.toBeInstanceOf(ApiError);
  });

  it('honours an explicit revalidate window', async () => {
    get.mockResolvedValue({} as never);
    await fetchMatchOdds('m1', { revalidate: 300 });
    expect(get).toHaveBeenCalledWith('/odds/m1', undefined, { revalidate: 300 });
  });

  it('converts odds and returns null for an invalid value', async () => {
    get.mockResolvedValue({ decimal: 1.91 } as never);
    await expect(convertOdds('fractional', '5/2')).resolves.toEqual({ decimal: 1.91 });
    expect(get).toHaveBeenCalledWith('/odds/tools/convert', { from: 'fractional', value: '5/2' });

    get.mockRejectedValue(new ApiError(400, 'bad'));
    await expect(convertOdds('decimal', 'abc')).resolves.toBeNull();
  });

  it('posts decimals to the margin tool', async () => {
    post.mockResolvedValue({ margin: 5 } as never);
    await fetchOddsMargin([1.91, 1.91]);
    expect(post).toHaveBeenCalledWith('/odds/tools/margin', { decimals: [1.91, 1.91] });

    post.mockRejectedValue(new ApiError(400, 'bad'));
    await expect(fetchOddsMargin([-1])).resolves.toBeNull();
  });

  it('reads odds history and returns null when unavailable', async () => {
    get.mockResolvedValue({ points: [] } as never);
    await fetchOddsHistory('m1', { marketKey: 'match_winner' });
    expect(get).toHaveBeenCalledWith('/odds/m1/history', { marketKey: 'match_winner' }, { revalidate: 60 });

    get.mockRejectedValue(new ApiError(403, 'no license'));
    await expect(fetchOddsHistory('m1')).resolves.toBeNull();
  });

  it('reads source health from the admin route', async () => {
    get.mockResolvedValue({} as never);
    await fetchAdminOddsSourceHealth();
    expect(get).toHaveBeenCalledWith('/admin/odds/sources/health', undefined, { headers: {} });
  });
});

describe('tournaments service', () => {
  it('lists tournaments and their pagination', async () => {
    get.mockResolvedValue(page([{ id: 't' }], 20, 2));
    await expect(fetchTournaments({ q: 'psl' })).resolves.toHaveLength(1);
    expect(get).toHaveBeenCalledWith('/tournaments', { q: 'psl' }, { signal: undefined });

    await expect(fetchTournamentsPage()).resolves.toMatchObject({ total: 20, totalPages: 2 });
  });

  it('reads one tournament and its seasons', async () => {
    getOptional.mockResolvedValue({ id: 't' } as never);
    await fetchTournamentById('t1');
    expect(getOptional).toHaveBeenCalledWith('/tournaments/t1', undefined, { signal: undefined });

    get.mockResolvedValue(page([{ id: 's1' }]));
    await fetchTournamentSeasons('t1');
    expect(get).toHaveBeenCalledWith('/tournaments/t1/seasons', { page: 1, limit: 100 }, { signal: undefined });
  });

  it('returns null when the tournament has no cached info', async () => {
    getOptional.mockResolvedValue(null);
    await expect(fetchTournamentInfo('t1')).resolves.toBeNull();
    expect(getOptional).toHaveBeenCalledWith('/tournaments/t1/info', undefined, { signal: undefined });
  });

  it('reads a full 100-row results set by default', async () => {
    get.mockResolvedValue(page([]));
    await fetchTournamentResults('t1');
    expect(get).toHaveBeenCalledWith('/tournaments/t1/results', { page: 1, limit: 100 }, { signal: undefined });
  });
});

describe('tours service', () => {
  it('lists tours with a default page of 20', async () => {
    get.mockResolvedValue(page([{ id: 'tour1' }]));
    await expect(fetchTours()).resolves.toHaveLength(1);
    expect(get).toHaveBeenCalledWith('/tours', { page: 1, limit: 20 }, { signal: undefined });
  });

  it('returns pagination meta', async () => {
    get.mockResolvedValue(page([{ id: 'tour1' }], 45, 5));
    await expect(fetchToursPage({ page: 2 })).resolves.toMatchObject({ total: 45, totalPages: 5 });
  });
});

describe('admin service', () => {
  it('lists users with default pagination', async () => {
    get.mockResolvedValue(page([{ id: 'u1' }], 30, 2));
    const res = await fetchAdminUsers();
    expect(get).toHaveBeenCalledWith('/admin/users', { page: 1, limit: 20 }, { headers: {} });
    expect(res).toEqual({ items: [{ id: 'u1' }], total: 30, totalPages: 2 });
  });

  it('updates and deletes a user', async () => {
    patch.mockResolvedValue({} as never);
    await updateAdminUser('u1', { isAdmin: true });
    expect(patch).toHaveBeenCalledWith('/admin/users/u1', { isAdmin: true }, { headers: {} });

    del.mockResolvedValue(undefined as never);
    await deleteAdminUser('u1');
    expect(del).toHaveBeenCalledWith('/admin/users/u1', { headers: {} });
  });

  it('manages authors', async () => {
    get.mockResolvedValue([{ id: 'a1' }] as never);
    await expect(fetchAdminAuthors()).resolves.toHaveLength(1);
    expect(get).toHaveBeenCalledWith('/admin/authors', undefined, { headers: {} });

    post.mockResolvedValue({} as never);
    await createAdminAuthor({ name: 'Ali' });
    expect(post).toHaveBeenCalledWith('/admin/authors', { name: 'Ali' }, { headers: {} });

    patch.mockResolvedValue({} as never);
    await updateAdminAuthor('a1', { bio: 'x' });
    expect(patch).toHaveBeenCalledWith('/admin/authors/a1', { bio: 'x' }, { headers: {} });

    del.mockResolvedValue(undefined as never);
    await deleteAdminAuthor('a1');
    expect(del).toHaveBeenCalledWith('/admin/authors/a1', { headers: {} });
  });

  it('coerces a non-array author list to empty', async () => {
    get.mockResolvedValue({ unexpected: true } as never);
    await expect(fetchAdminAuthors()).resolves.toEqual([]);
  });

  it('moderates a comment and resolves a report on separate routes', async () => {
    patch.mockResolvedValue({} as never);
    await moderateComment('c1', 'hidden');
    expect(patch).toHaveBeenCalledWith('/admin/comments/c1', { status: 'hidden' }, { headers: {} });

    await resolveReport('r1');
    expect(patch).toHaveBeenLastCalledWith('/admin/reports/r1', { status: 'resolved' }, { headers: {} });

    await resolveReport('r1', 'dismissed');
    expect(patch).toHaveBeenLastCalledWith('/admin/reports/r1', { status: 'dismissed' }, { headers: {} });
  });

  it('lists reported comments, defaulting to an empty array', async () => {
    get.mockResolvedValue([{ id: 'r1' }] as never);
    await expect(fetchReportedComments()).resolves.toHaveLength(1);

    get.mockResolvedValue(null as never);
    await expect(fetchReportedComments()).resolves.toEqual([]);
  });

  it('reads analytics and ingestion health', async () => {
    get.mockResolvedValue({} as never);
    await fetchAdminAnalytics();
    expect(get).toHaveBeenLastCalledWith('/admin/analytics', undefined, { headers: {} });

    await fetchIngestionHealth();
    expect(get).toHaveBeenLastCalledWith('/admin/ingestion-health', undefined, { headers: {} });
  });
});

describe('newsAdmin service', () => {
  it('lists articles for the admin table', async () => {
    get.mockResolvedValue(page([{ id: 'n1' }], 5));
    const res = await fetchNewsAdmin({ q: 'psl' });
    expect(get).toHaveBeenCalledWith('/admin/news', { q: 'psl' }, { headers: {} });
    expect(res.total).toBe(5);
  });

  it('pages through everything at the api cap of 100', async () => {
    get
      .mockResolvedValueOnce(page([{ id: 'n1' }], 2, 2))
      .mockResolvedValueOnce(page([{ id: 'n2' }], 2, 2));
    const all = await fetchAllNewsAdmin();
    expect(get).toHaveBeenCalledTimes(2);
    expect(get).toHaveBeenNthCalledWith(1, '/admin/news', { page: 1, limit: 100 }, { headers: {} });
    expect(get).toHaveBeenNthCalledWith(2, '/admin/news', { page: 2, limit: 100 }, { headers: {} });
    expect(all).toHaveLength(2);
  });

  it('stops at maxPages even when the api reports more', async () => {
    get.mockResolvedValue(page([{ id: 'n' }], 100, 99));
    const all = await fetchAllNewsAdmin({}, 2);
    expect(get).toHaveBeenCalledTimes(2);
    expect(all).toHaveLength(2);
  });

  it('fetches an article directly on the happy path', async () => {
    get.mockResolvedValue({ id: 'n1' } as never);
    await expect(fetchNewsArticle('n1')).resolves.toEqual({ id: 'n1' });
  });

  it('falls back to scanning the admin list when the direct lookup 404s', async () => {
    get.mockRejectedValueOnce(new ApiError(404, 'gone'));
    get.mockResolvedValueOnce(page([{ id: 'n1' }, { id: 'n2', slug: 'target' }], 2, 1));
    const found = await fetchNewsArticle('target');
    expect(found.id).toBe('n2');
  });

  it('rethrows a non-404 error without scanning', async () => {
    get.mockRejectedValue(new ApiError(500, 'boom'));
    await expect(fetchNewsArticle('n1')).rejects.toBeInstanceOf(ApiError);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('rethrows the original 404 when the scan finds nothing', async () => {
    get.mockRejectedValueOnce(new ApiError(404, 'gone'));
    get.mockResolvedValueOnce(page([{ id: 'other' }], 1, 1));
    await expect(fetchNewsArticle('missing')).rejects.toBeInstanceOf(ApiError);
  });

  it('creates, updates and deletes an article', async () => {
    post.mockResolvedValue({} as never);
    await createNews({ title: 'T', content: '<p>c</p>' });
    expect(post).toHaveBeenCalledWith('/news', { title: 'T', content: '<p>c</p>' }, { headers: {} });

    patch.mockResolvedValue({} as never);
    await updateNews('n1', { title: 'New' });
    expect(patch).toHaveBeenCalledWith('/news/n1', { title: 'New' }, { headers: {} });

    del.mockResolvedValue(undefined as never);
    await deleteNews('n1');
    expect(del).toHaveBeenCalledWith('/news/n1', { headers: {} });
  });

  it('manages categories', async () => {
    post.mockResolvedValue({} as never);
    await createCategory('Cricket');
    expect(post).toHaveBeenCalledWith('/news/categories', { name: 'Cricket' }, { headers: {} });

    patch.mockResolvedValue({} as never);
    await updateCategory('cricket', { name: 'Cricket News' });
    expect(patch).toHaveBeenCalledWith('/news/categories/cricket', { name: 'Cricket News' }, { headers: {} });

    del.mockResolvedValue(undefined as never);
    await deleteCategory('cricket');
    expect(del).toHaveBeenCalledWith('/news/categories/cricket', { headers: {} });
  });

  it('creates a translation under the source article', async () => {
    post.mockResolvedValue({} as never);
    await createNewsTranslation('n1', { title: 'T', content: '<p>c</p>', language: 'ur' });
    expect(post).toHaveBeenCalledWith(
      '/news/n1/translations',
      { title: 'T', content: '<p>c</p>', language: 'ur' },
      { headers: {} },
    );
  });
});

describe('schedules service', () => {
  // The match index and the daily cache are module-level, so each test needs a
  // fresh instance of the module.
  function freshSchedules() {
    let mod!: typeof import('../services/schedules');
    jest.isolateModules(() => {
      mod = require('../services/schedules');
    });
    return mod;
  }

  const match = (id: string, scheduled: string, status: string) => ({
    matchId: id,
    scheduled,
    status,
    teams: ['sr:t:1', 'sr:t:2'],
    teamNames: ['Lahore', 'Islamabad'],
    tournament: 'PSL',
  });

  it('returns the ingested day when the provider already has rows', async () => {
    const { fetchDailySchedule: fn } = freshSchedules();
    get.mockResolvedValue(page([{ eventId: 'e1', kind: 'daily_schedule' }], 1));
    const res = await fn('2026-02-01');
    expect(get).toHaveBeenCalledWith('/schedules/2026-02-01', { page: 1, limit: 20 });
    expect(res.items).toHaveLength(1);
    // No fallback fetch, so only the one call happened.
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('rebuilds the day from matches when the day is empty', async () => {
    const { fetchDailySchedule: fn } = freshSchedules();
    get.mockImplementation((path: string, params?: { status?: string }) => {
      if (String(path).startsWith('/schedules/')) return Promise.resolve(page([], 0));
      if (params?.status === 'live') return Promise.resolve(page([match('m1', '2026-02-01T10:00:00Z', 'live')]));
      return Promise.resolve(page([match('m3', '2026-03-09T10:00:00Z', 'completed')]));
    });
    const res = await fn('2026-02-01');
    expect(res.items).toHaveLength(1);
    expect(res.meta.total).toBe(1);
  });

  it('maps a rebuilt match onto a sport event record', async () => {
    const { fetchDailySchedule: fn } = freshSchedules();
    get.mockImplementation((path: string, params?: { status?: string }) => {
      if (String(path).startsWith('/schedules/')) return Promise.resolve(page([], 0));
      if (params?.status === 'live') return Promise.resolve(page([match('m1', '2026-02-01T10:00:00Z', 'live')]));
      return Promise.resolve(page([]));
    });
    const [item] = (await fn('2026-02-01')).items;
    expect(item).toMatchObject({ kind: 'daily_schedule', scopeKey: '2026-02-01', eventId: 'm1', status: 'live' });
    const event = (item.payload as Record<string, Record<string, Record<string, unknown>>>).sport_event;
    expect(event.competitors).toHaveLength(2);
    expect(event.competitors[0]).toMatchObject({ id: 'sr:t:1', name: 'Lahore', qualifier: 'home' });
    expect(event.coverage).toEqual({ live: true });
  });

  it('filters the results view down to completed matches only', async () => {
    const { fetchDailyResults: fn } = freshSchedules();
    get.mockImplementation((path: string, params?: { status?: string }) => {
      if (String(path).startsWith('/schedules/')) return Promise.resolve(page([], 0));
      if (params?.status === 'live') return Promise.resolve(page([match('live', '2026-02-01T10:00:00Z', 'live')]));
      if (params?.status === 'upcoming') return Promise.resolve(page([]));
      return Promise.resolve(page([match('done', '2026-02-01T14:00:00Z', 'completed')]));
    });
    const res = await fn('2026-02-01');
    expect(res.items.map((i) => i.eventId)).toEqual(['done']);
  });

  it('excludes a match scheduled on a different day', async () => {
    const { fetchDailySchedule: fn } = freshSchedules();
    get.mockImplementation((path: string, params?: { status?: string }) => {
      if (String(path).startsWith('/schedules/')) return Promise.resolve(page([], 0));
      if (params?.status === 'live') return Promise.resolve(page([]));
      return Promise.resolve(page([match('other', '2026-02-05T10:00:00Z', 'completed')]));
    });
    const res = await fn('2026-02-01');
    expect(res.items).toEqual([]);
  });

  it('skips a match with an unparseable scheduled time', async () => {
    const { fetchDailySchedule: fn } = freshSchedules();
    get.mockImplementation((path: string, params?: { status?: string }) => {
      if (String(path).startsWith('/schedules/')) return Promise.resolve(page([], 0));
      if (params?.status === 'live') return Promise.resolve(page([match('bad', 'not-a-date', 'live')]));
      return Promise.resolve(page([]));
    });
    const res = await fn('2026-02-01');
    expect(res.items).toEqual([]);
  });

  it('paginates the rebuilt day locally', async () => {
    const { fetchDailySchedule: fn } = freshSchedules();
    get.mockImplementation((path: string, params?: { status?: string }) => {
      if (String(path).startsWith('/schedules/')) return Promise.resolve(page([], 0));
      if (params?.status === 'live') return Promise.resolve(page([]));
      if (params?.status === 'upcoming') return Promise.resolve(page([]));
      return Promise.resolve(
        page([
          match('a', '2026-02-01T10:00:00Z', 'completed'),
          match('b', '2026-02-01T14:00:00Z', 'completed'),
          match('c', '2026-02-01T18:00:00Z', 'completed'),
        ]),
      );
    });
    const res = await fn('2026-02-01', 1, 2);
    expect(res.items).toHaveLength(2);
    expect(res.meta).toEqual({ total: 3, page: 1, limit: 2, totalPages: 2 });
  });

  it('reuses the cached match index for a second day instead of refetching', async () => {
    const { fetchDailySchedule: fn } = freshSchedules();
    get.mockImplementation((path: string, params?: { status?: string }) => {
      if (String(path).startsWith('/schedules/')) return Promise.resolve(page([], 0));
      if (params?.status === 'live') return Promise.resolve(page([]));
      return Promise.resolve(page([]));
    });
    await fn('2026-02-01');
    const afterFirst = get.mock.calls.length;
    await fn('2026-02-02');
    // The second day must not trigger a fresh live/upcoming/completed sweep.
    expect(get.mock.calls.length).toBe(afterFirst + 1);
  });
});
