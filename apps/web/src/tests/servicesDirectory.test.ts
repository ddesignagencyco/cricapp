import { apiGet, apiGetOptional, apiPost, apiPatch, apiPut, apiDelete } from '../services/api/client';

jest.mock('../services/api/client', () => {
  const actual = jest.requireActual('../services/api/client');
  return {
    ...actual,
    apiGet: jest.fn(),
    apiGetOptional: jest.fn(),
    apiPost: jest.fn(),
    apiPatch: jest.fn(),
    apiPut: jest.fn(),
    apiDelete: jest.fn(),
  };
});

import { fetchPlayers, fetchPlayersPage, fetchPlayersByTeam, fetchPlayerById } from '../services/players';
import {
  listComments,
  createComment,
  deleteComment,
  getReactionCounts,
  toggleReaction,
  reportComment,
} from '../services/comments';
import {
  formatSiteLocation,
  publicSocials,
  mapsHref,
  fetchSiteSettings,
  loadSiteSettings,
  saveSiteSettings,
  EMPTY_SITE_SETTINGS,
} from '../services/siteSettings';
import {
  fetchPslSeasons,
  fetchPslStandings,
  fetchPslSchedule,
  fetchPslLeaders,
  fetchPslSquads,
} from '../services/psl';
import { mapNewsItem, fetchNews, fetchNewsPage, fetchNewsById, fetchNewsCategories } from '../services/news';
import { fetchEditorialPages, fetchEditorialPage, upsertEditorialPage } from '../services/editorial';
import { fetchPublicAuthors, fetchPublicAuthor, authorSlugFromArticle, authorAvatarFromArticle } from '../services/authors';
import { askAssistant } from '../services/assistant';

const get = apiGet as jest.MockedFunction<typeof apiGet>;
const getOptional = apiGetOptional as jest.MockedFunction<typeof apiGetOptional>;
const post = apiPost as jest.MockedFunction<typeof apiPost>;
const patch = apiPatch as jest.MockedFunction<typeof apiPatch>;
const put = apiPut as jest.MockedFunction<typeof apiPut>;
const del = apiDelete as jest.MockedFunction<typeof apiDelete>;

const page = (items: unknown[], total = items.length, totalPages = 1) => ({
  data: items,
  meta: { totalRecords: total, page: 1, limit: 20, totalPages },
});

beforeEach(() => {
  jest.resetAllMocks();
});

describe('players service', () => {
  it('defaults the player list to 50', async () => {
    get.mockResolvedValue(page([{ id: 'p1' }]));
    await fetchPlayers();
    expect(get).toHaveBeenCalledWith('/players', { q: undefined, team: undefined, limit: 50 }, { signal: undefined });
  });

  it('passes the team filter through', async () => {
    get.mockResolvedValue(page([]));
    await fetchPlayersByTeam('LHR');
    expect(get).toHaveBeenCalledWith('/players', { team: 'LHR' }, { signal: undefined });
  });

  it('returns pagination meta from the paged variant', async () => {
    get.mockResolvedValue(page([{ id: 'p1' }], 90, 9));
    await expect(fetchPlayersPage({ page: 3 })).resolves.toEqual({
      items: [{ id: 'p1' }],
      total: 90,
      totalPages: 9,
    });
  });

  it('asks for the ten most recent matches alongside a player', async () => {
    getOptional.mockResolvedValue(null);
    await fetchPlayerById('sr:player:1');
    expect(getOptional).toHaveBeenCalledWith('/players/sr:player:1', { recent: 10 }, { signal: undefined });
  });
});

describe('comments service', () => {
  it('lists comments for a match with defaults', async () => {
    get.mockResolvedValue(page([{ id: 'c1' }], 30, 3));
    const res = await listComments('match', 'm1');
    expect(get).toHaveBeenCalledWith('/comments', { targetType: 'match', targetId: 'm1', page: 1, limit: 10 });
    expect(res).toEqual({ items: [{ id: 'c1' }], total: 30, totalPages: 3 });
  });

  it('routes a stream comment to the nested stream route', async () => {
    get.mockResolvedValue(page([]));
    await listComments('stream', 's1', 2, 20);
    expect(get).toHaveBeenCalledWith('/streams/s1/comments', { page: 2, limit: 20 });
  });

  it('creates a match comment on the flat route', async () => {
    post.mockResolvedValue({} as never);
    await createComment('news', 'n1', 'Nice');
    expect(post).toHaveBeenCalledWith('/comments', { targetType: 'news', targetId: 'n1', body: 'Nice' }, { headers: {} });
  });

  it('creates a stream comment on the nested route', async () => {
    post.mockResolvedValue({} as never);
    await createComment('stream', 's1', 'Nice');
    expect(post).toHaveBeenCalledWith('/streams/s1/comments', { body: 'Nice' }, { headers: {} });
  });

  it('reads and toggles reactions', async () => {
    get.mockResolvedValue({ counts: { fire: 3 }, emojis: ['fire'] } as never);
    await getReactionCounts('match', 'm1');
    expect(get).toHaveBeenCalledWith('/reactions', { targetType: 'match', targetId: 'm1' });

    post.mockResolvedValue({ message: 'ok' } as never);
    await toggleReaction('comment', 'c1', '🔥', 'c1');
    expect(post).toHaveBeenCalledWith(
      '/reactions',
      { targetType: 'comment', targetId: 'c1', emoji: '🔥', commentId: 'c1' },
      { headers: {} },
    );
  });

  it('reports a comment on the nested report route', async () => {
    post.mockResolvedValue({ message: 'ok' } as never);
    await reportComment('c1', 'spam');
    expect(post).toHaveBeenCalledWith('/comments/c1/report', { reason: 'spam' }, { headers: {} });
  });

  it('deletes a comment', async () => {
    del.mockResolvedValue(undefined as never);
    await deleteComment('c1');
    expect(del).toHaveBeenCalledWith('/comments/c1', { headers: {} });
  });
});

describe('siteSettings helpers', () => {
  it('joins street and place', () => {
    expect(formatSiteLocation({ address: 'Gaddafi Stadium', city: 'Lahore', country: 'Pakistan' })).toBe(
      'Gaddafi Stadium, Lahore, Pakistan',
    );
  });

  it('uses whichever half is present', () => {
    expect(formatSiteLocation({ address: 'Gaddafi Stadium', city: '', country: '' })).toBe('Gaddafi Stadium');
    expect(formatSiteLocation({ address: '', city: 'Lahore', country: 'Pakistan' })).toBe('Lahore, Pakistan');
  });

  it('returns an empty string when nothing is set', () => {
    expect(formatSiteLocation({ address: '', city: '', country: '' })).toBe('');
  });

  it('drops socials that are missing either field so the footer shows no blank chip', () => {
    expect(
      publicSocials({ socials: [{ platform: 'x', value: 'a' }, { platform: '', value: 'b' }, { platform: 'y', value: '  ' }] }),
    ).toEqual([{ platform: 'x', value: 'a' }]);
  });

  it('handles a missing socials array', () => {
    expect(publicSocials({ socials: undefined as never })).toEqual([]);
  });

  it('only allows an absolute http(s) maps url', () => {
    expect(mapsHref('https://maps.google.com/?x')).toBe('https://maps.google.com/?x');
    expect(mapsHref('http://maps.google.com/?x')).toBe('http://maps.google.com/?x');
    expect(mapsHref('javascript:alert(1)')).toBeNull();
    expect(mapsHref('maps.google.com')).toBeNull();
    expect(mapsHref(null)).toBeNull();
  });
});

describe('siteSettings service', () => {
  it('fetches settings with an abort signal', async () => {
    const controller = new AbortController();
    get.mockResolvedValue(EMPTY_SITE_SETTINGS as never);
    await fetchSiteSettings(controller.signal);
    expect(get).toHaveBeenCalledWith('/site-settings', undefined, { signal: controller.signal });
  });

  it('falls back to empty settings rather than failing the layout on a 500', async () => {
    get.mockRejectedValue(new Error('boom'));
    await expect(loadSiteSettings()).resolves.toEqual(EMPTY_SITE_SETTINGS);
  });

  it('revalidates the cached server render', async () => {
    get.mockResolvedValue(EMPTY_SITE_SETTINGS as never);
    await loadSiteSettings();
    expect(get).toHaveBeenCalledWith('/site-settings', undefined, { revalidate: 60 });
  });

  it('saves through the admin route', async () => {
    put.mockResolvedValue(EMPTY_SITE_SETTINGS as never);
    await saveSiteSettings({ city: 'Lahore' });
    expect(put).toHaveBeenCalledWith('/admin/site-settings', { city: 'Lahore' }, { headers: {} });
  });
});

describe('psl service', () => {
  it.each([
    ['seasons', fetchPslSeasons],
    ['standings', fetchPslStandings],
    ['schedule', fetchPslSchedule],
    ['leaders', fetchPslLeaders],
    ['squads', fetchPslSquads],
  ])('reads %s with a default limit of 100', async (segment, fn) => {
    get.mockResolvedValue(page([{ id: 'x' }]));
    await fn({ season: '2026' });
    expect(get).toHaveBeenCalledWith(`/psl/${segment}`, { limit: 100, season: '2026' });
  });

  it('lets a caller override the default limit', async () => {
    get.mockResolvedValue(page([]));
    await fetchPslStandings({ limit: 5 });
    expect(get).toHaveBeenCalledWith('/psl/standings', { limit: 5 });
  });
});

describe('mapNewsItem', () => {
  it('supplies a title and author when the api omits them', () => {
    const item = mapNewsItem({ id: 'n1' });
    expect(item.title).toBe('Untitled Story');
    expect(item.author).toBe('Editorial Team');
  });

  it('prefers the nested author ref name over the flat author string', () => {
    const item = mapNewsItem({ id: 'n1', author: 'Flat', authorRef: { id: 'a1', name: 'Nested' } });
    expect(item.author).toBe('Nested');
    expect(item.authorId).toBe('a1');
  });

  it('falls back through category object then string then id', () => {
    expect(mapNewsItem({ id: 'n', category: { name: 'Cricket' } }).category).toBe('Cricket');
    expect(mapNewsItem({ id: 'n', category: 'News' }).category).toBe('News');
    expect(mapNewsItem({ id: 'n', categoryId: 'cat-1' }).category).toBe('cat-1');
    expect(mapNewsItem({ id: 'n' }).category).toBe('Cricket');
  });

  it('takes the category slug as the type', () => {
    expect(mapNewsItem({ id: 'n', category: { name: 'Cricket', slug: 'cricket' } }).type).toBe('cricket');
  });

  it('normalises tags to strings and promotes the first to tag', () => {
    const item = mapNewsItem({ id: 'n', tags: ['psl', 5, ''] });
    expect(item.tags).toEqual(['psl', '5']);
    expect(item.tag).toBe('psl');
  });

  it('uses an empty tag list when tags are not an array', () => {
    expect(mapNewsItem({ id: 'n', tags: 'psl' }).tags).toEqual([]);
  });

  it('keeps the source the API returned', () => {
    // `source` was stored by the editor but never mapped here, so it was invisible on
    // the article page no matter what the newsroom typed.
    expect(mapNewsItem({ id: 'n', source: 'PCB' }).source).toBe('PCB');
    expect(mapNewsItem({ id: 'n' }).source).toBe('');
  });

  it('keeps the stored byline even when an author profile supplies the name', () => {
    const item = mapNewsItem({
      id: 'n',
      author: 'Guest Reporter',
      authorId: 'a1',
      authorRef: { id: 'a1', name: 'Ali Khan' },
    });
    expect(item.author).toBe('Ali Khan');
    expect(item.authorByline).toBe('Guest Reporter');
  });

  it('credits the byline when no author profile is linked', () => {
    const item = mapNewsItem({ id: 'n', author: 'Guest Reporter' });
    expect(item.author).toBe('Guest Reporter');
    expect(item.authorByline).toBe('Guest Reporter');
  });

  it('strips html out of the excerpt built from the summary', () => {
    // The stripped copy lands in `excerpt`; the raw `summary` is left alone by
    // the `...item` spread, so consumers must read `excerpt` for plain text.
    const item = mapNewsItem({ id: 'n', summary: '<p>Hello <b>world</b></p>' });
    expect(item.excerpt).toBe('Hello world');
    expect(item.summary).toBe('<p>Hello <b>world</b></p>');
  });

  it('derives an excerpt from the content when there is no summary', () => {
    const item = mapNewsItem({ id: 'n', content: '<p>Body text here</p>' });
    expect(item.excerpt).toBe('Body text here');
  });

  it('truncates a long excerpt to 160 characters with an ellipsis', () => {
    const long = 'x'.repeat(300);
    const item = mapNewsItem({ id: 'n', content: long });
    expect(item.excerpt).toHaveLength(161);
    expect(item.excerpt.endsWith('…')).toBe(true);
  });

  it('reads imageUrl onto image', () => {
    expect(mapNewsItem({ id: 'n', imageUrl: 'https://i.test/a.jpg' }).image).toBe('https://i.test/a.jpg');
  });

  it('defaults the language to en', () => {
    expect(mapNewsItem({ id: 'n' }).language).toBe('en');
    expect(mapNewsItem({ id: 'n', language: 'ur' }).language).toBe('ur');
  });

  it('coerces the id lists to string arrays and drops empties', () => {
    const item = mapNewsItem({ id: 'n', playerIds: [1, 'a', ''], teamIds: 'nope' });
    expect(item.playerIds).toEqual(['1', 'a']);
    expect(item.teamIds).toEqual([]);
  });

  it('prefers publishedAt over createdAt for the date', () => {
    expect(mapNewsItem({ id: 'n', publishedAt: '2026-02-01T00:00:00Z' }).date).toMatch(/Feb 1, 2026/);
    expect(mapNewsItem({ id: 'n', createdAt: '2026-03-05T00:00:00Z' }).date).toMatch(/Mar 5, 2026/);
  });

  it('passes an unparseable date through instead of showing Invalid Date', () => {
    expect(mapNewsItem({ id: 'n', publishedAt: 'not-a-date' }).date).toBe('not-a-date');
  });

  it('estimates one minute for short content and more for long content', () => {
    expect(mapNewsItem({ id: 'n', content: 'A short story.' }).readTime).toBe('1 min read');
    const long = Array.from({ length: 900 }, () => 'word').join(' ');
    expect(mapNewsItem({ id: 'n', content: long }).readTime).toBe('5 min read');
  });

  it('falls back to a two minute read for empty content', () => {
    expect(mapNewsItem({ id: 'n' }).readTime).toBe('2 min read');
  });
});

describe('news service', () => {
  it('maps every row in the list', async () => {
    get.mockResolvedValue(page([{ id: 'n1' }]));
    const out = await fetchNews({ category: 'cricket' });
    expect(get).toHaveBeenCalledWith(
      '/news',
      expect.objectContaining({ category: 'cricket', limit: 50 }),
    );
    expect(out[0].title).toBe('Untitled Story');
  });

  it('defaults the paged variant to 12 per page', async () => {
    get.mockResolvedValue(page([{ id: 'n1' }], 40, 4));
    const res = await fetchNewsPage();
    expect(get).toHaveBeenCalledWith('/news', expect.objectContaining({ page: 1, limit: 12 }));
    expect(res.totalPages).toBe(4);
  });

  it('looks a story up by slug', async () => {
    getOptional.mockResolvedValue({ id: 'n1', title: 'T' } as never);
    await fetchNewsById('pakistan-wins');
    expect(getOptional).toHaveBeenCalledWith('/news/pakistan-wins');
  });

  it('encodes an id that needs escaping', async () => {
    getOptional.mockResolvedValue(null);
    await fetchNewsById('a b/c');
    expect(getOptional).toHaveBeenCalledWith('/news/a%20b%2Fc');
  });

  it('returns null for a missing story', async () => {
    getOptional.mockResolvedValue(null);
    await expect(fetchNewsById('nope')).resolves.toBeNull();
  });

  it('always returns an array for categories', async () => {
    get.mockResolvedValue([{ id: 'c1', name: 'Cricket', slug: 'cricket' }] as never);
    await expect(fetchNewsCategories()).resolves.toHaveLength(1);

    get.mockResolvedValue({ unexpected: true } as never);
    await expect(fetchNewsCategories()).resolves.toEqual([]);
  });
});

describe('editorial service', () => {
  it('lists editorial pages', async () => {
    get.mockResolvedValue([{ slug: 'about', title: 'About' }] as never);
    await expect(fetchEditorialPages()).resolves.toHaveLength(1);
    expect(get).toHaveBeenCalledWith('/editorial-pages');
  });

  it('coerces a non-array list to empty', async () => {
    get.mockResolvedValue(null as never);
    await expect(fetchEditorialPages()).resolves.toEqual([]);
  });

  it('fetches one page by encoded slug', async () => {
    getOptional.mockResolvedValue(null);
    await fetchEditorialPage('about us');
    expect(getOptional).toHaveBeenCalledWith('/editorial-pages/about%20us');
  });

  it('upserts through the admin route', async () => {
    put.mockResolvedValue({} as never);
    await upsertEditorialPage('about', { title: 'About', content: '<p>x</p>' });
    expect(put).toHaveBeenCalledWith(
      '/admin/editorial-pages/about',
      { title: 'About', content: '<p>x</p>' },
      { headers: {} },
    );
  });
});

describe('authors service', () => {
  it('reads a plain array of authors', async () => {
    get.mockResolvedValue([{ id: 'a1', name: 'Ali', slug: 'ali' }] as never);
    const out = await fetchPublicAuthors();
    expect(out[0]).toMatchObject({ id: 'a1', name: 'Ali', slug: 'ali', bio: null });
  });

  it('reads a paginated envelope of authors', async () => {
    get.mockResolvedValue(page([{ id: 'a1', name: 'Ali' }]) as never);
    await expect(fetchPublicAuthors()).resolves.toHaveLength(1);
  });

  it('names an unnamed author rather than rendering a blank byline', async () => {
    get.mockResolvedValue([{}] as never);
    expect((await fetchPublicAuthors())[0].name).toBe('Author');
  });

  it('returns null when the author has no record', async () => {
    getOptional.mockResolvedValue({ articles: page([]) } as never);
    await expect(fetchPublicAuthor('ali')).resolves.toBeNull();
  });

  it('maps the nested articles page and backfills the article count', async () => {
    getOptional.mockResolvedValue({
      author: { id: 'a1', name: 'Ali', slug: 'ali' },
      articles: page([{ id: 'n1', title: 'Story' }], 12, 2),
    } as never);
    const res = await fetchPublicAuthor('ali');
    expect(res?.author.articleCount).toBe(12);
    expect(res?.articles[0].title).toBe('Story');
    expect(res?.totalPages).toBe(2);
  });

  it('prefers an explicit articleCount from the api', async () => {
    getOptional.mockResolvedValue({
      author: { id: 'a1', name: 'Ali', articleCount: 99 },
      articles: page([], 12),
    } as never);
    expect((await fetchPublicAuthor('ali'))?.author.articleCount).toBe(99);
  });

  it('derives a slug from the author name when there is no ref', () => {
    expect(authorSlugFromArticle({ author: 'Ali Raza' } as never)).toBe('ali-raza');
  });

  it('prefers the ref slug over a derived one', () => {
    expect(authorSlugFromArticle({ author: 'Ali Raza', authorRef: { slug: 'ali-raza-writer' } } as never)).toBe(
      'ali-raza-writer',
    );
  });

  it('returns an empty slug for punctuation-only names', () => {
    expect(authorSlugFromArticle({ author: '!!!' } as never)).toBe('');
    expect(authorSlugFromArticle({ author: '' } as never)).toBe('');
  });

  it('reads the avatar off the ref only', () => {
    expect(authorAvatarFromArticle({ authorRef: { avatarUrl: 'https://i.test/a.png' } } as never)).toBe(
      'https://i.test/a.png',
    );
    expect(authorAvatarFromArticle({ author: 'Ali' } as never)).toBeNull();
  });
});

describe('assistant service', () => {
  it('posts the question and slots to the ask route', async () => {
    post.mockResolvedValue({} as never);
    const body = { question: 'Lahore vs Karachi', intent: 'team_head_to_head' as const };
    await askAssistant(body);
    expect(post).toHaveBeenCalledWith('/assistant/ask', body);
  });
});

describe('unused verb guard', () => {
  it('keeps patch and delete imported for the shared mock surface', () => {
    expect(typeof patch).toBe('function');
    expect(typeof del).toBe('function');
  });
});
