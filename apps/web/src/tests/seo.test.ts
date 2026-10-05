import robots from '../app/robots';
import manifest from '../app/manifest';
import sitemap from '../app/sitemap';

jest.mock('../services/matches', () => ({ fetchMatches: jest.fn() }));
jest.mock('../services/teams', () => ({ fetchTeams: jest.fn() }));
jest.mock('../services/players', () => ({ fetchPlayers: jest.fn() }));
jest.mock('../services/tournaments', () => ({ fetchTournaments: jest.fn() }));
jest.mock('../services/news', () => ({ fetchNews: jest.fn() }));
jest.mock('../services/authors', () => ({ fetchPublicAuthors: jest.fn() }));
jest.mock('../services/stories', () => ({ fetchStories: jest.fn() }));

import { fetchMatches } from '../services/matches';
import { fetchTeams } from '../services/teams';
import { fetchPlayers } from '../services/players';
import { fetchTournaments } from '../services/tournaments';
import { fetchNews } from '../services/news';
import { fetchPublicAuthors } from '../services/authors';
import { fetchStories } from '../services/stories';

const matches = fetchMatches as jest.MockedFunction<typeof fetchMatches>;
const teams = fetchTeams as jest.MockedFunction<typeof fetchTeams>;
const players = fetchPlayers as jest.MockedFunction<typeof fetchPlayers>;
const tournaments = fetchTournaments as jest.MockedFunction<typeof fetchTournaments>;
const news = fetchNews as jest.MockedFunction<typeof fetchNews>;
const authors = fetchPublicAuthors as jest.MockedFunction<typeof fetchPublicAuthors>;
const stories = fetchStories as jest.MockedFunction<typeof fetchStories>;

const BASE = 'https://pakcriczone.com';

const noStories = { items: [], total: 0, totalPages: 1 };

beforeEach(() => {
  jest.resetAllMocks();
  matches.mockResolvedValue([]);
  teams.mockResolvedValue([]);
  players.mockResolvedValue([]);
  tournaments.mockResolvedValue([]);
  news.mockResolvedValue([]);
  authors.mockResolvedValue([]);
  stories.mockResolvedValue(noStories);
});

describe('robots', () => {
  const rules = robots();

  it('allows crawling the whole site', () => {
    expect(rules.rules).toMatchObject({ userAgent: '*', allow: '/' });
  });

  it('keeps the api, the admin panel and the account pages out of the index', () => {
    const disallow = (rules.rules as { disallow: string[] }).disallow;
    ['/api/', '/_next/', '/admin/', '/login', '/register', '/favorites', '/profile', '/settings/'].forEach(
      (path) => expect(disallow).toContain(path),
    );
  });

  it('advertises the sitemap so crawlers can find it', () => {
    expect(rules.sitemap).toBe(`${BASE}/sitemap.xml`);
  });
});

describe('manifest', () => {
  const m = manifest();

  it('keeps name and short_name within the pwa length limits', () => {
    expect(m.name.length).toBeLessThanOrEqual(30);
    expect(String(m.short_name).length).toBeLessThanOrEqual(12);
  });

  it('has a description for the install prompt', () => {
    expect(String(m.description).trim().length).toBeGreaterThan(0);
  });

  it('starts at the home route in standalone display', () => {
    expect(m.start_url).toBe('/');
    expect(m.display).toBe('standalone');
  });

  it('sets both colours to the same dark brand hex so there is no flash', () => {
    expect(m.background_color).toBe(m.theme_color);
    expect(m.theme_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('ships an icon', () => {
    expect(m.icons?.length).toBeGreaterThan(0);
  });
});

describe('sitemap', () => {
  it('lists the static routes even when every data source is empty', async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    // The home entry is built from the '' route, so it carries no trailing slash.
    expect(urls).toContain(BASE);
    expect(urls).toContain(`${BASE}/matches`);
    expect(urls).toContain(`${BASE}/news`);
    expect(urls).toContain(`${BASE}/stories`);
    expect(urls).toContain(`${BASE}/privacy`);
  });

  it('gives the home page the highest priority and an hourly refresh', async () => {
    const entries = await sitemap();
    const home = entries.find((e) => e.url === BASE);
    expect(home?.priority).toBe(1);
    expect(home?.changeFrequency).toBe('hourly');
  });

  it('appends one entry per match, team, player and tournament', async () => {
    matches.mockResolvedValue([{ matchId: 'm1' }, { matchId: 'm2' }] as never);
    teams.mockResolvedValue([{ id: 't1' }] as never);
    players.mockResolvedValue([{ id: 'p1' }] as never);
    tournaments.mockResolvedValue([{ id: 'tour1' }] as never);
    authors.mockResolvedValue([{ id: 'a1', name: 'Ali', slug: 'ali', bio: null, avatarUrl: null }] as never);

    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain(`${BASE}/matches/m1`);
    expect(urls).toContain(`${BASE}/matches/m2`);
    expect(urls).toContain(`${BASE}/teams/t1`);
    expect(urls).toContain(`${BASE}/players/p1`);
    expect(urls).toContain(`${BASE}/tournaments/tour1`);
    expect(urls).toContain(`${BASE}/authors/ali`);
  });

  it('uses the public news href so urdu articles land on the right prefix', async () => {
    news.mockResolvedValue([
      { id: 'n1', slug: 'pakistan-wins', language: 'en' },
      { id: 'n2', slug: 'pakistan-jata', language: 'ur' },
    ] as never);
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain(`${BASE}/cricket-news/pakistan-wins`);
    expect(urls).toContain(`${BASE}/ur/news/pakistan-jata`);
  });

  it('appends one entry per published story so deep links are crawlable', async () => {
    stories.mockResolvedValue({
      items: [
        { id: 's1', shareUrl: '/stories/s1', publishedAt: '2026-10-01T00:00:00.000Z' },
        { id: 's2', shareUrl: '/stories/s2', publishedAt: null },
      ],
      total: 2,
      totalPages: 1,
    } as never);

    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain(`${BASE}/stories/s1`);
    expect(urls).toContain(`${BASE}/stories/s2`);
    // An undated story still has to produce a parseable lastModified.
    const undated = entries.find((e) => e.url === `${BASE}/stories/s2`);
    expect(Number.isNaN(Date.parse(String(undated?.lastModified)))).toBe(false);
  });

  it('never emits a relative url', async () => {
    matches.mockResolvedValue([{ matchId: 'm1' }] as never);
    const urls = (await sitemap()).map((e) => e.url);
    urls.forEach((url) => expect(url.startsWith('https://')).toBe(true));
  });

  it('never emits a duplicate url', async () => {
    matches.mockResolvedValue([{ matchId: 'm1' }] as never);
    teams.mockResolvedValue([{ id: 't1' }] as never);
    const urls = (await sitemap()).map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('still renders the static routes when one data source fails', async () => {
    // A dead API must not take the whole sitemap down, or the pages would drop
    // out of the index until the next successful crawl.
    matches.mockRejectedValue(new Error('api down'));
    news.mockRejectedValue(new Error('api down'));
    const entries = await sitemap();
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.map((e) => e.url)).toContain(`${BASE}/matches`);
  });

  it('stamps every entry with a lastModified date', async () => {
    const entries = await sitemap();
    entries.forEach((e) => expect(Number.isNaN(Date.parse(String(e.lastModified)))).toBe(false));
  });
});
