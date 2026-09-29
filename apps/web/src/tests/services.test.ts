import { apiGet, apiGetOptional, apiPost, apiPatch, ApiError } from '../services/api/client';

jest.mock('../services/api/client', () => {
  const actual = jest.requireActual('../services/api/client');
  return {
    ...actual,
    apiGet: jest.fn(),
    apiGetOptional: jest.fn(),
    apiPost: jest.fn(),
    apiPut: jest.fn(),
    apiPatch: jest.fn(),
    apiDelete: jest.fn(),
  };
});

import {
  fetchMatches,
  fetchMatchesPage,
  fetchLiveMatches,
  fetchMatchById,
  fetchMatchTimeline,
  matchSideIds,
} from '../services/matches';
import { searchAll, searchRowId } from '../services/search';
import { fetchApiHealth } from '../services/health';
import { fetchHeadToHead } from '../services/headToHead';
import {
  login,
  register,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  getCurrentUser,
  updateProfile,
  logout,
  authHeaders,
  getAccessToken,
} from '../services/auth';
import { subscribeNewsletter, unsubscribeNewsletter, fetchNewsletterSubscribers } from '../services/newsletter';
import { getShareLink, sharePageMetadata } from '../services/sharing';
import { submitContact, fetchContactSubmissions, updateContactStatus } from '../services/contact';

const get = apiGet as jest.MockedFunction<typeof apiGet>;
const getOptional = apiGetOptional as jest.MockedFunction<typeof apiGetOptional>;
const post = apiPost as jest.MockedFunction<typeof apiPost>;
const patch = apiPatch as jest.MockedFunction<typeof apiPatch>;

const page = (items: unknown[], total = items.length) => ({
  data: items,
  meta: { totalRecords: total, page: 1, limit: 20, totalPages: 1 },
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('matches service', () => {
  it('unwraps a paginated list into a plain array', async () => {
    get.mockResolvedValue(page([{ id: 'm1' }, { id: 'm2' }]));
    await expect(fetchMatches({ status: 'live' })).resolves.toHaveLength(2);
    expect(get).toHaveBeenCalledWith('/matches', { status: 'live' }, { signal: undefined });
  });

  it('returns an empty array for a null response', async () => {
    get.mockResolvedValue(null);
    await expect(fetchMatches()).resolves.toEqual([]);
  });

  it('exposes pagination meta separately', async () => {
    get.mockResolvedValue({ data: [{ id: 'm1' }], meta: { totalRecords: 87, page: 2, limit: 20, totalPages: 5 } });
    await expect(fetchMatchesPage({ page: 2 })).resolves.toEqual({
      items: [{ id: 'm1' }],
      total: 87,
      totalPages: 5,
    });
  });

  it('forwards the abort signal so a stale poll is dropped', async () => {
    const controller = new AbortController();
    get.mockResolvedValue(page([]));
    await fetchMatches({}, controller.signal);
    expect(get).toHaveBeenCalledWith('/matches', {}, { signal: controller.signal });
  });

  it('uses the dedicated live endpoint', async () => {
    get.mockResolvedValue(page([{ id: 'live1' }]));
    await expect(fetchLiveMatches()).resolves.toHaveLength(1);
    expect(get).toHaveBeenCalledWith('/matches/live', undefined, { signal: undefined });
  });

  it('decodes an encoded match id from the route', async () => {
    getOptional.mockResolvedValue({ id: 'sr:match:1' });
    await fetchMatchById('sr%3Amatch%3A1');
    expect(getOptional).toHaveBeenCalledWith('/matches/sr:match:1', undefined, { signal: undefined });
  });

  it('does not throw on a malformed encoded id', async () => {
    getOptional.mockResolvedValue(null);
    await expect(fetchMatchById('%E0%A4%A')).resolves.toBeNull();
    expect(getOptional).toHaveBeenCalledWith('/matches/%E0%A4%A', undefined, { signal: undefined });
  });

  it('requests the timeline under the match', async () => {
    getOptional.mockResolvedValue({ matchId: 'm1', payload: {} });
    await fetchMatchTimeline('m1');
    expect(getOptional).toHaveBeenCalledWith('/matches/m1/timeline', undefined, { signal: undefined });
  });
});

describe('matchSideIds', () => {
  it('reads ids from the object form', () => {
    expect(matchSideIds({ teams: { home: { teamId: 'h1' }, away: { teamId: 'a1' } } } as never)).toEqual({
      home: 'h1',
      away: 'a1',
    });
  });

  it('falls back from teamId to id to code', () => {
    expect(matchSideIds({ teams: { home: { id: 'h2' }, away: { code: 'ISB' } } } as never)).toEqual({
      home: 'h2',
      away: 'ISB',
    });
  });

  it('reads the legacy array form positionally', () => {
    expect(matchSideIds({ teams: ['Lahore', 'Islamabad'] } as never)).toEqual({
      home: 'Lahore',
      away: 'Islamabad',
    });
  });

  it('returns empty strings for a missing or malformed teams field', () => {
    expect(matchSideIds({} as never)).toEqual({ home: '', away: '' });
    expect(matchSideIds({ teams: 'nonsense' } as never)).toEqual({ home: '', away: '' });
  });
});

describe('search service', () => {
  it('returns empty buckets for a blank query without calling the api', async () => {
    await expect(searchAll('   ')).resolves.toEqual({
      players: [],
      teams: [],
      matches: [],
      tournaments: [],
    });
    expect(get).not.toHaveBeenCalled();
  });

  it('sends a per-bucket limit with the query', async () => {
    get.mockResolvedValue({ players: [], teams: [], matches: [], tournaments: [] });
    await searchAll('  lahore  ');
    expect(get).toHaveBeenCalledWith('/search', {
      q: 'lahore',
      playerLimit: 20,
      teamLimit: 20,
      matchLimit: 20,
      tournamentLimit: 20,
    });
  });

  it('normalises a player name from whichever field the api used', async () => {
    get.mockResolvedValue({ players: [{ fullName: 'Babar Azam' }] });
    const res = await searchAll('babar');
    expect(res.players[0]).toMatchObject({ name: 'Babar Azam', fullName: 'Babar Azam' });
  });

  it('falls back through name, fullName then shortName', async () => {
    get.mockResolvedValue({ players: [{ shortName: 'BA' }] });
    const res = await searchAll('babar');
    expect(res.players[0].name).toBe('BA');
  });

  it('labels an unnamed player rather than rendering a blank row', async () => {
    get.mockResolvedValue({ players: [{}] });
    const res = await searchAll('x');
    expect(res.players[0].name).toBe('Player');
  });

  it('reads the team name off a nested team object', async () => {
    get.mockResolvedValue({ players: [{ name: 'Ali', team: { name: 'Lahore' } }] });
    const res = await searchAll('ali');
    expect(res.players[0].teamName).toBe('Lahore');
  });

  it('coerces a missing bucket to an empty array instead of crashing the page', async () => {
    get.mockResolvedValue({ players: [{ name: 'Ali' }] });
    const res = await searchAll('ali');
    expect(res.teams).toEqual([]);
    expect(res.matches).toEqual([]);
    expect(res.tournaments).toEqual([]);
  });

  it('ignores a non-array bucket', async () => {
    get.mockResolvedValue({ players: 'not-an-array' });
    await expect(searchAll('x')).resolves.toMatchObject({ players: [] });
  });

  it('forwards an abort signal when one is supplied', async () => {
    get.mockResolvedValue({ players: [], teams: [], matches: [], tournaments: [] });
    const controller = new AbortController();
    await searchAll('lahore', controller.signal);
    expect(get).toHaveBeenCalledWith(
      '/search',
      expect.objectContaining({ q: 'lahore' }),
      { signal: controller.signal }
    );
  });

  it('omits the options argument when there is no signal', async () => {
    get.mockResolvedValue({ players: [], teams: [], matches: [], tournaments: [] });
    await searchAll('lahore');
    expect(get.mock.calls[0]).toHaveLength(2);
  });
});

describe('searchRowId', () => {
  it('prefers id, then matchId, then eventId', () => {
    expect(searchRowId({ id: 'a', matchId: 'b', eventId: 'c' })).toBe('a');
    expect(searchRowId({ matchId: 'b', eventId: 'c' })).toBe('b');
    expect(searchRowId({ eventId: 'c' })).toBe('c');
  });

  it('accepts the snake_case aliases a raw-sql endpoint can return', () => {
    expect(searchRowId({ match_id: 'sr:match:1' })).toBe('sr:match:1');
    expect(searchRowId({ event_id: 'sr:match:2' })).toBe('sr:match:2');
  });

  it('coerces a numeric id', () => {
    expect(searchRowId({ id: 42 })).toBe('42');
  });

  // Regression guard: /api/search currently returns match rows with no id at all,
  // which used to render links to /matches/undefined.
  it('returns empty for a row with no usable id', () => {
    expect(searchRowId({ status: 'completed', tournament: 'PSL' })).toBe('');
    expect(searchRowId({ id: '' })).toBe('');
    expect(searchRowId({ id: '   ' })).toBe('');
    expect(searchRowId(null)).toBe('');
    expect(searchRowId(undefined)).toBe('');
  });
});

describe('health service', () => {
  it('calls the json health endpoint', async () => {
    get.mockResolvedValue({ status: 'ok' });
    await expect(fetchApiHealth()).resolves.toEqual({ status: 'ok' });
    expect(get).toHaveBeenCalledWith('/health/json');
  });
});

describe('headToHead service', () => {
  it('sorts the two ids so the cache key is order independent', async () => {
    getOptional.mockResolvedValue(null);
    await fetchHeadToHead('sr:competitor:2', 'sr:competitor:1');
    expect(getOptional).toHaveBeenCalledWith('/head-to-head/sr%3Acompetitor%3A1/sr%3Acompetitor%3A2');
  });

  it('decodes ids that arrive percent encoded from the url', async () => {
    getOptional.mockResolvedValue(null);
    await fetchHeadToHead('sr%3Acompetitor%3A1', 'sr%3Acompetitor%3A2');
    expect(getOptional).toHaveBeenCalledWith('/head-to-head/sr%3Acompetitor%3A1/sr%3Acompetitor%3A2');
  });

  it('returns null without calling the api when an id is missing', async () => {
    await expect(fetchHeadToHead('', 'sr:c:2')).resolves.toBeNull();
    await expect(fetchHeadToHead('sr:c:1', '')).resolves.toBeNull();
    expect(getOptional).not.toHaveBeenCalled();
  });

  it('returns null when the pair has never met', async () => {
    getOptional.mockResolvedValue(null);
    await expect(fetchHeadToHead('sr:c:1', 'sr:c:2')).resolves.toBeNull();
  });
});

describe('auth service', () => {
  it('sends no bearer header because the session is an http-only cookie', () => {
    expect(authHeaders()).toEqual({});
    expect(getAccessToken()).toBeNull();
  });

  it('posts the login payload', async () => {
    post.mockResolvedValue({ user: {} } as never);
    await login({ email: 'a@b.com', password: 'pw' } as never);
    expect(post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.com', password: 'pw' });
  });

  it('posts to signup, not register', async () => {
    post.mockResolvedValue({} as never);
    await register({ email: 'a@b.com', password: 'pw' } as never);
    expect(post).toHaveBeenCalledWith('/auth/signup', { email: 'a@b.com', password: 'pw' });
  });

  it('maps the reset token fields the api expects', async () => {
    post.mockResolvedValue({ message: 'ok' } as never);
    await resetPassword({ tokenId: 't1', token: 'tok', password: 'New1!' } as never);
    expect(post).toHaveBeenCalledWith('/auth/reset-password', {
      tokenId: 't1',
      token: 'tok',
      password: 'New1!',
    });
  });

  it('covers the remaining auth endpoints', async () => {
    post.mockResolvedValue({ message: 'ok' } as never);
    await forgotPassword({ email: 'a@b.com' } as never);
    expect(post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'a@b.com' });

    await verifyEmail({ tokenId: 't1', token: 'tok' } as never);
    expect(post).toHaveBeenCalledWith('/auth/verify-email', { tokenId: 't1', token: 'tok' });

    await resendVerification({ email: 'a@b.com' } as never);
    expect(post).toHaveBeenCalledWith('/auth/resend-verification', { email: 'a@b.com' });
  });

  it('reads and patches the current user', async () => {
    get.mockResolvedValue({ id: 'u1' } as never);
    await getCurrentUser();
    expect(get).toHaveBeenCalledWith('/auth/me');

    patch.mockResolvedValue({ id: 'u1' } as never);
    await updateProfile({ displayName: 'New' } as never);
    expect(patch).toHaveBeenCalledWith('/auth/me', { displayName: 'New' });
  });

  it('swallows a failing logout so the user is still signed out locally', async () => {
    post.mockRejectedValue(new ApiError(500, 'boom'));
    await expect(logout()).resolves.toBeUndefined();
  });
});

describe('newsletter service', () => {
  it('subscribes and unsubscribes', async () => {
    post.mockResolvedValue({ message: 'ok' } as never);
    await subscribeNewsletter('a@b.com');
    expect(post).toHaveBeenCalledWith('/newsletter/subscribe', { email: 'a@b.com' });

    await unsubscribeNewsletter('tok');
    expect(post).toHaveBeenCalledWith('/newsletter/unsubscribe', { token: 'tok' });
  });

  it('defaults the admin list to page 1 and lets params win', async () => {
    get.mockResolvedValue(page([{ id: 's1' }], 40));
    const res = await fetchNewsletterSubscribers({ page: 3, status: 'active' });
    expect(get).toHaveBeenCalledWith(
      '/admin/newsletter/subscribers',
      { page: 3, limit: 20, status: 'active' },
      { headers: {} },
    );
    expect(res).toEqual({ items: [{ id: 's1' }], total: 40, totalPages: 1 });
  });
});

describe('sharing service', () => {
  it('encodes the entity id in the share path', async () => {
    get.mockResolvedValue({} as never);
    await getShareLink('match', 'sr:match:1');
    expect(get).toHaveBeenCalledWith('/share/match/sr%3Amatch%3A1');
  });

  it('falls back to the title when there is no description', () => {
    const meta = sharePageMetadata({ title: 'Match', path: '/matches/m1' });
    expect(meta.description).toBe('Match');
  });

  it('uses a large image card only when there is an image', () => {
    const withImage = sharePageMetadata({ title: 'T', path: '/x', image: 'https://i.test/a.jpg' });
    expect(withImage.twitter).toMatchObject({ card: 'summary_large_image', images: ['https://i.test/a.jpg'] });
    expect(withImage.openGraph?.images).toEqual([{ url: 'https://i.test/a.jpg' }]);

    const without = sharePageMetadata({ title: 'T', path: '/x' });
    expect(without.twitter).toMatchObject({ card: 'summary' });
    expect(without.openGraph?.images).toBeUndefined();
  });

  it('sets the open graph url from the path', () => {
    expect(sharePageMetadata({ title: 'T', path: '/matches/m1' }).openGraph).toMatchObject({
      url: '/matches/m1',
      siteName: 'PAK CRICZONE',
    });
  });
});

describe('contact service', () => {
  it('submits the form', async () => {
    post.mockResolvedValue({ message: 'sent' } as never);
    await submitContact({ name: 'Ali', email: 'a@b.com', message: 'Hi' });
    expect(post).toHaveBeenCalledWith('/contact', { name: 'Ali', email: 'a@b.com', message: 'Hi' });
  });

  it('lists submissions with default pagination', async () => {
    get.mockResolvedValue(page([{ id: 'c1' }], 5));
    const res = await fetchContactSubmissions();
    expect(get).toHaveBeenCalledWith(
      '/admin/contact-submissions',
      { page: 1, limit: 20 },
      { headers: {} },
    );
    expect(res.total).toBe(5);
  });

  it('patches the status on the nested status route', async () => {
    patch.mockResolvedValue({ id: 'c1' } as never);
    await updateContactStatus('c1', 'resolved');
    expect(patch).toHaveBeenCalledWith('/admin/contact-submissions/c1/status', { status: 'resolved' }, { headers: {} });
  });
});
