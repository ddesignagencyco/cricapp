import { apiGet, apiGetOptional, extractPage } from './api/client';
import type { Team, Player, SportEventRecord } from '../types/index';
import { entityIdPath } from '../utils/entityId';

export async function fetchTeams(
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<Team[]> {
  const res = await apiGet('/teams', params);
  return extractPage<Team>(res).items;
}

export async function fetchTeamsPage(
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<{ items: Team[]; total: number; totalPages: number }> {
  const res = await apiGet('/teams', params);
  const { items, meta } = extractPage<Team>(res);
  return { items, total: meta.total, totalPages: meta.totalPages };
}

export async function fetchTeamById(idOrAbbr: string): Promise<Team | null> {
  return apiGetOptional(`/teams/${entityIdPath(idOrAbbr)}`);
}

export async function fetchTeamRosterPage(
  idOrAbbr: string,
  params: { page?: number; limit?: number } = {}
): Promise<{ items: Player[]; total: number; totalPages: number }> {
  const res = await apiGet(`/teams/${entityIdPath(idOrAbbr)}/players`, { page: 1, limit: 40, ...params });
  const { items, meta } = extractPage<Player>(res);
  return { items, total: meta.total, totalPages: meta.totalPages };
}

export async function fetchTeamRoster(idOrAbbr: string, params: { page?: number; limit?: number } = {}): Promise<Player[]> {
  const res = await fetchTeamRosterPage(idOrAbbr, { page: 1, limit: 100, ...params });
  return res.items;
}

export async function fetchTeamSchedule(
  idOrAbbr: string,
  params: { page?: number; limit?: number } = {}
): Promise<SportEventRecord[]> {
  const res = await apiGet(`/teams/${entityIdPath(idOrAbbr)}/schedule`, { page: 1, limit: 50, ...params });
  return extractPage<SportEventRecord>(res).items;
}

export async function fetchTeamResults(
  idOrAbbr: string,
  params: { page?: number; limit?: number } = {}
): Promise<SportEventRecord[]> {
  const res = await apiGet(`/teams/${entityIdPath(idOrAbbr)}/results`, { page: 1, limit: 50, ...params });
  return extractPage<SportEventRecord>(res).items;
}

/** One in-flight catalog fetch for compare / team pickers (avoids duplicate pagination storms). */
let teamsCatalogPromise: Promise<Team[]> | null = null;

export async function fetchTeamsCatalog(maxPages = 4): Promise<Team[]> {
  if (teamsCatalogPromise) return teamsCatalogPromise;

  teamsCatalogPromise = (async () => {
    const first = await fetchTeamsPage({ limit: 100, page: 1 });
    const extraPages = Math.min(Math.max(first.totalPages - 1, 0), maxPages - 1);
    const rest =
      extraPages > 0
        ? await Promise.all(
            Array.from({ length: extraPages }, (_, i) => fetchTeamsPage({ limit: 100, page: i + 2 })),
          )
        : [];
    const seen = new Set<string>();
    const all: Team[] = [];
    for (const team of [...first.items, ...rest.flatMap((page) => page.items)]) {
      if (!team.id || seen.has(team.id)) continue;
      seen.add(team.id);
      all.push(team);
    }
    return all.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  })().catch((err) => {
    teamsCatalogPromise = null;
    throw err;
  });

  return teamsCatalogPromise;
}
