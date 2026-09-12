import type { MetadataRoute } from 'next';
import { fetchMatches } from '../services/matches';
import { fetchTeams } from '../services/teams';
import { fetchPlayers } from '../services/players';
import { fetchNews } from '../services/news';
import { fetchTournaments } from '../services/tournaments';

const baseUrl = 'https://pakcriczone.com';

const staticRoutes = [
  '',
  '/matches',
  '/schedules',
  '/psl',
  '/teams',
  '/players',
  '/stats',
  '/news',
  '/streams',
  '/tours',
  '/tournaments',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();
  const [matches, teams, players, news, tournaments] = await Promise.all([
    fetchMatches().catch(() => []),
    fetchTeams().catch(() => []),
    fetchPlayers().catch(() => []),
    fetchNews().catch(() => []),
    fetchTournaments().catch(() => []),
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
    url: `${baseUrl}/news/${article.slug || article.id}`,
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

  return [...entries, ...matchEntries, ...teamEntries, ...playerEntries, ...newsEntries, ...tournamentEntries];
}
