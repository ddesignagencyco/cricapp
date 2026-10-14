import type { MetadataRoute } from 'next';
import { fetchMatches } from '../services/matches';
import { fetchTeams } from '../services/teams';
import { fetchPlayers } from '../services/players';
import { fetchNews } from '../services/news';
import { newsHref } from '../utils/newsConstraints';
import { fetchTournaments } from '../services/tournaments';
import { fetchPublicAuthors } from '../services/authors';
import { fetchStories, type StoriesPageResult } from '../services/stories';

const baseUrl = 'https://pakcriczone.com';

const staticRoutes = [
  '',
  '/matches',
  '/predictions',
  '/schedules',
  '/psl',
  '/teams',
  '/players',
  '/news',
  '/gallery',
  '/stories',
  '/streams',
  '/tours',
  '/tournaments',
  '/about',
  '/authors',
  '/contact',
  '/privacy',
  '/terms',
];

/** Deep-linked stories are only discoverable from a crawl if they are listed. */
const STORY_LIMIT = 100;

/** Keeps the fallback the same shape as the real result, so no cast is needed below. */
const NO_STORIES: StoriesPageResult = { items: [], total: 0, totalPages: 1 };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();
  const [matches, teams, players, news, tournaments, authors, stories] = await Promise.all([
    fetchMatches().catch(() => []),
    fetchTeams().catch(() => []),
    fetchPlayers().catch(() => []),
    fetchNews().catch(() => []),
    fetchTournaments().catch(() => []),
    fetchPublicAuthors().catch(() => []),
    fetchStories({ page: 1, limit: STORY_LIMIT }).catch(() => NO_STORIES),
  ]);

  const entries = staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: (route === '' ? 'hourly' : 'daily') as MetadataRoute.Sitemap[number]['changeFrequency'],
    priority: route === '' ? 1 : 0.8,
  }));

  const matchEntries = (matches || []).map((m) => ({
    url: `${baseUrl}/matches/${m.matchId}`,
    lastModified: now,
    changeFrequency: 'hourly' as MetadataRoute.Sitemap[number]['changeFrequency'],
    priority: 0.7,
  }));

  const teamEntries = (teams || []).map((t) => ({
    url: `${baseUrl}/teams/${t.id}`,
    lastModified: now,
    changeFrequency: 'weekly' as MetadataRoute.Sitemap[number]['changeFrequency'],
    priority: 0.6,
  }));

  const playerEntries = (players || []).map((p) => ({
    url: `${baseUrl}/players/${p.id}`,
    lastModified: now,
    changeFrequency: 'weekly' as MetadataRoute.Sitemap[number]['changeFrequency'],
    priority: 0.6,
  }));

  const newsEntries = (news || []).map((article) => ({
    url: `${baseUrl}${newsHref(article)}`,
    lastModified: now,
    changeFrequency: 'weekly' as MetadataRoute.Sitemap[number]['changeFrequency'],
    priority: 0.6,
  }));

  const tournamentEntries = (tournaments || []).map((tournament) => ({
    url: `${baseUrl}/tournaments/${tournament.id}`,
    lastModified: now,
    changeFrequency: 'weekly' as MetadataRoute.Sitemap[number]['changeFrequency'],
    priority: 0.6,
  }));

  const authorEntries = (authors || []).map((author) => ({
    url: `${baseUrl}/authors/${author.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as MetadataRoute.Sitemap[number]['changeFrequency'],
    priority: 0.5,
  }));

  const storyEntries = stories.items.map((story) => ({
    url: `${baseUrl}${story.shareUrl}`,
    lastModified: story.publishedAt || now,
    changeFrequency: 'weekly' as MetadataRoute.Sitemap[number]['changeFrequency'],
    priority: 0.6,
  }));

  return [
    ...entries,
    ...matchEntries,
    ...teamEntries,
    ...playerEntries,
    ...newsEntries,
    ...tournamentEntries,
    ...authorEntries,
    ...storyEntries,
  ];
}
