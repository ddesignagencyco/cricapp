import { apiGet, apiGetOptional, apiPost, apiPatch, apiDelete } from '../services/api/client';

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

import {
  fetchTeams,
  fetchTeamsPage,
  fetchTeamById,
  fetchTeamRosterPage,
  fetchTeamRoster,
  fetchTeamSchedule,
  fetchTeamResults,
} from '../services/teams';
import { fetchStreams, fetchStreamById, createStream, updateStream, deleteStream } from '../services/streams';
import { fetchGalleryPage, fetchGalleryItem, uploadGalleryMedia, deleteGalleryMedia } from '../services/gallery';
import {
  fetchNotificationHistory,
  registerDevice,
  fetchDevices,
  updateDevicePreferences,
  unregisterDevice,
  requestNotificationPermission,
} from '../services/notifications';

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
  // resetAllMocks, not clearAllMocks: clear only drops call records, so a
  // mockResolvedValue from an earlier test would still be answering here.
  jest.resetAllMocks();
});

describe('teams service', () => {
  it('unwraps a team list', async () => {
    get.mockResolvedValue(page([{ id: 't1' }]));
    await expect(fetchTeams({ q: 'lah' })).resolves.toHaveLength(1);
    expect(get).toHaveBeenCalledWith('/teams', { q: 'lah' }, { signal: undefined });
  });

  it('returns pagination meta', async () => {
    get.mockResolvedValue(page([{ id: 't1' }], 30, 3));
    await expect(fetchTeamsPage({ page: 2 })).resolves.toEqual({
      items: [{ id: 't1' }],
      total: 30,
      totalPages: 3,
    });
  });

  it('percent encodes a colon in the team id path', async () => {
    getOptional.mockResolvedValue(null);
    await fetchTeamById('sr:competitor:1');
    expect(getOptional).toHaveBeenCalledWith('/teams/sr%3Acompetitor%3A1', undefined, { signal: undefined });
  });

  it('defaults the roster page size and lets params override it', async () => {
    get.mockResolvedValue(page([{ id: 'p1' }]));
    await fetchTeamRosterPage('LHR', { limit: 10 });
    expect(get).toHaveBeenCalledWith('/teams/LHR/players', { page: 1, limit: 10 }, { signal: undefined });
  });

  it('defaults a full roster fetch to 100 players', async () => {
    get.mockResolvedValue(page([{ id: 'p1' }]));
    await fetchTeamRoster('LHR');
    expect(get).toHaveBeenCalledWith('/teams/LHR/players', { page: 1, limit: 100 }, { signal: undefined });
  });

  it('reads schedule and results from separate routes', async () => {
    get.mockResolvedValue(page([]));
    await fetchTeamSchedule('LHR');
    expect(get).toHaveBeenCalledWith('/teams/LHR/schedule', { page: 1, limit: 50 }, { signal: undefined });

    await fetchTeamResults('LHR');
    expect(get).toHaveBeenCalledWith('/teams/LHR/results', { page: 1, limit: 50 }, { signal: undefined });
  });
});

describe('fetchTeamsCatalog', () => {
  // fetchTeamsCatalog memoises its promise in a module-level variable for the
  // lifetime of the process, so each test needs a fresh module instance or it
  // would just receive the first test's cached teams.
  function freshCatalog() {
    let mod!: typeof import('../services/teams');
    jest.isolateModules(() => {
      mod = require('../services/teams');
    });
    return mod.fetchTeamsCatalog;
  }

  it('fetches only the first page when everything fits', async () => {
    const fetchTeamsCatalog = freshCatalog();
    get.mockResolvedValue({ data: [{ id: 't2', name: 'B' }, { id: 't1', name: 'A' }], meta: { totalRecords: 2, page: 1, limit: 100, totalPages: 1 } });
    const out = await fetchTeamsCatalog();
    expect(get).toHaveBeenCalledTimes(1);
    // Sorted by name for a stable picker.
    expect(out.map((t) => t.name)).toEqual(['A', 'B']);
  });

  it('follows the extra pages up to the cap', async () => {
    const fetchTeamsCatalog = freshCatalog();
    get
      .mockResolvedValueOnce({ data: [{ id: 't1', name: 'A' }], meta: { totalRecords: 300, page: 1, limit: 100, totalPages: 3 } })
      .mockResolvedValueOnce({ data: [{ id: 't2', name: 'B' }], meta: { totalRecords: 300, page: 2, limit: 100, totalPages: 3 } })
      .mockResolvedValueOnce({ data: [{ id: 't3', name: 'C' }], meta: { totalRecords: 300, page: 3, limit: 100, totalPages: 3 } });
    const out = await fetchTeamsCatalog(4);
    expect(get).toHaveBeenCalledTimes(3);
    expect(out).toHaveLength(3);
  });

  it('drops a duplicate id that appears on two pages', async () => {
    const fetchTeamsCatalog = freshCatalog();
    get
      .mockResolvedValueOnce({ data: [{ id: 't1', name: 'A' }], meta: { totalRecords: 2, page: 1, limit: 100, totalPages: 2 } })
      .mockResolvedValueOnce({ data: [{ id: 't1', name: 'A' }], meta: { totalRecords: 2, page: 2, limit: 100, totalPages: 2 } });
    const out = await fetchTeamsCatalog(2);
    expect(out).toHaveLength(1);
  });

  it('skips an item with no id so the picker does not show a broken key', async () => {
    const fetchTeamsCatalog = freshCatalog();
    get.mockResolvedValue({ data: [{ name: 'No Id' }, { id: 't1', name: 'A' }], meta: { totalRecords: 2, page: 1, limit: 100, totalPages: 1 } });
    const out = await fetchTeamsCatalog();
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('t1');
  });

  it('serves a second caller from the cache instead of refetching', async () => {
    const fetchTeamsCatalog = freshCatalog();
    get.mockResolvedValue({ data: [{ id: 't1', name: 'A' }], meta: { totalRecords: 1, page: 1, limit: 100, totalPages: 1 } });
    await Promise.all([fetchTeamsCatalog(), fetchTeamsCatalog()]);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('clears the cached promise after a failure so the next call can retry', async () => {
    const fetchTeamsCatalog = freshCatalog();
    get.mockRejectedValueOnce(new Error('offline'));
    await expect(fetchTeamsCatalog()).rejects.toThrow('offline');

    get.mockResolvedValue({ data: [{ id: 't1', name: 'A' }], meta: { totalRecords: 1, page: 1, limit: 100, totalPages: 1 } });
    await expect(fetchTeamsCatalog()).resolves.toHaveLength(1);
  });
});

describe('streams service', () => {
  it('maps a raw row onto the Stream shape', async () => {
    get.mockResolvedValue(page([{ id: 's1', title: 'Live Match', streamUrl: 'https://youtu.be/x', provider: 'YouTube' }]));
    const [stream] = await fetchStreams();
    expect(stream).toMatchObject({
      id: 's1',
      title: 'Live Match',
      shortTitle: 'Live Match',
      status: 'upcoming',
      embedUrl: 'https://youtu.be/x',
      host: 'YouTube',
    });
  });

  it('defaults a missing status to upcoming', async () => {
    get.mockResolvedValue(page([{ id: 's1', title: 'T' }]));
    const [stream] = await fetchStreams({ status: 'upcoming' });
    expect(stream.status).toBe('upcoming');
  });

  it('lets an explicit api field win over the derived default', async () => {
    get.mockResolvedValue(page([{ id: 's1', title: 'T', status: 'live', embedUrl: 'derived' }]));
    const [stream] = await fetchStreams();
    // The spread of `item` runs last, so a real field is never clobbered.
    expect(stream.status).toBe('live');
    expect(stream.embedUrl).toBe('derived');
  });

  it('returns null for a stream that no longer exists', async () => {
    getOptional.mockResolvedValue(null);
    await expect(fetchStreamById('missing')).resolves.toBeNull();
  });

  it('maps a single stream through the same transform', async () => {
    getOptional.mockResolvedValue({ id: 's1', title: 'T' } as never);
    const stream = await fetchStreamById('s1');
    expect(stream?.shortTitle).toBe('T');
  });

  it('creates, updates and deletes against the same id route', async () => {
    post.mockResolvedValue({} as never);
    await createStream({ title: 'T', streamUrl: 'u' });
    expect(post).toHaveBeenCalledWith('/streams', { title: 'T', streamUrl: 'u' }, { headers: {} });

    patch.mockResolvedValue({} as never);
    await updateStream('s1', { status: 'live' });
    expect(patch).toHaveBeenCalledWith('/streams/s1', { status: 'live' }, { headers: {} });

    del.mockResolvedValue(undefined as never);
    await deleteStream('s1');
    expect(del).toHaveBeenCalledWith('/streams/s1', { headers: {} });
  });
});

describe('gallery service', () => {
  it('defaults the gallery page size to 40', async () => {
    get.mockResolvedValue(page([{ id: 'g1' }]));
    const res = await fetchGalleryPage({ type: 'image' });
    expect(get).toHaveBeenCalledWith('/gallery', { page: 1, limit: 40, type: 'image' }, { signal: undefined });
    expect(res.items).toHaveLength(1);
  });

  it('returns null for a missing item', async () => {
    getOptional.mockResolvedValue(null);
    await expect(fetchGalleryItem('nope')).resolves.toBeNull();
    expect(getOptional).toHaveBeenCalledWith('/gallery/nope', undefined, { signal: undefined });
  });

  it('uploads as multipart with the type always present', async () => {
    post.mockResolvedValue({} as never);
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    await uploadGalleryMedia({ file, type: 'short', title: 'T' });
    const body = (post.mock.calls[0] as unknown as [string, FormData])[1];
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('type')).toBe('short');
    expect(body.get('title')).toBe('T');
    // Omitted rather than sent as an empty string.
    expect(body.get('caption')).toBeNull();
  });

  it('deletes by id', async () => {
    del.mockResolvedValue(undefined as never);
    await deleteGalleryMedia('g1');
    expect(del).toHaveBeenCalledWith('/gallery/g1', { headers: {} });
  });
});

describe('notifications service', () => {
  it('lists history with default pagination', async () => {
    get.mockResolvedValue(page([{ id: 'n1' }], 4));
    const res = await fetchNotificationHistory();
    expect(get).toHaveBeenCalledWith('/notifications/history', { page: 1, limit: 20 }, { headers: {} });
    expect(res.total).toBe(4);
  });

  it('registers a device with its platform', async () => {
    post.mockResolvedValue({} as never);
    await registerDevice({ fcmToken: 'tok', platform: 'web' });
    expect(post).toHaveBeenCalledWith('/devices', { fcmToken: 'tok', platform: 'web' }, { headers: {} });
  });

  it('returns an array for devices and never null', async () => {
    get.mockResolvedValue([{ id: 'd1' }] as never);
    await expect(fetchDevices()).resolves.toHaveLength(1);

    get.mockResolvedValue({ unexpected: true } as never);
    await expect(fetchDevices()).resolves.toEqual([]);
  });

  it('nests preferences under the device patch', async () => {
    patch.mockResolvedValue({} as never);
    await updateDevicePreferences('d1', { matches: true });
    expect(patch).toHaveBeenCalledWith('/devices/d1/preferences', { preferences: { matches: true } }, { headers: {} });
  });

  it('unregisters a device', async () => {
    del.mockResolvedValue(undefined as never);
    await unregisterDevice('d1');
    expect(del).toHaveBeenCalledWith('/devices/d1', { headers: {} });
  });
});

describe('requestNotificationPermission', () => {
  const original = window.Notification;

  afterEach(() => {
    if (original === undefined) delete (window as { Notification?: unknown }).Notification;
    else (window as { Notification?: unknown }).Notification = original;
  });

  it('reports unsupported when the browser has no Notification api', async () => {
    delete (window as { Notification?: unknown }).Notification;
    await expect(requestNotificationPermission()).resolves.toBe('unsupported');
  });

  it('returns an already granted permission without prompting again', async () => {
    (window as { Notification?: unknown }).Notification = { permission: 'granted' };
    await expect(requestNotificationPermission()).resolves.toBe('granted');
  });

  it('returns a denied permission as-is', async () => {
    (window as { Notification?: unknown }).Notification = { permission: 'denied' };
    await expect(requestNotificationPermission()).resolves.toBe('denied');
  });

  it('prompts only when the permission is still default', async () => {
    const requestPermission = jest.fn().mockResolvedValue('granted');
    (window as { Notification?: unknown }).Notification = { permission: 'default', requestPermission };
    await expect(requestNotificationPermission()).resolves.toBe('granted');
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });
});
