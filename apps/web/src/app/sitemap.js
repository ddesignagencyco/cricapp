import { matches, teams, players, news } from '../services/cricketApi.js';

const baseUrl = 'https://pakcriczone.com';

const staticRoutes = [
  '',
  '/live',
  '/matches',
  '/psl',
  '/teams',
  '/players',
  '/points-table',
  '/stats',
  '/news',
  '/streams',
  '/favorites',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
];

export default function sitemap() {
  const now = new Date().toISOString();
  const entries = staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route === '' ? 'hourly' : 'daily',
    priority: route === '' ? 1 : 0.8,
  }));

  const matchEntries = matches.map((m) => ({
    url: `${baseUrl}/matches/${m.id}`,
    lastModified: now,
    changeFrequency: 'hourly',
    priority: 0.7,
  }));

  const teamEntries = teams.map((t) => ({
    url: `${baseUrl}/teams/${t.id}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const playerEntries = players.map((p) => ({
    url: `${baseUrl}/players/${p.id}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const otherEntries = news.length > 0
    ? [{ url: `${baseUrl}/news`, lastModified: now, changeFrequency: 'daily', priority: 0.6 }]
    : [];

  return [...entries, ...matchEntries, ...teamEntries, ...playerEntries, ...otherEntries];
}