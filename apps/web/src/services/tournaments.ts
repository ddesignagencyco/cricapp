import { apiGet } from './api/client';
import { TournamentApi, TournamentSeason, SportEventRecord } from '../types/index';
import { demoTournaments, demoSeasons, demoResults, demoMatchById } from '../data/demo';

async function asArray<T>(promise: Promise<any>, demo: T[]): Promise<T[]> {
  const data = await promise;
  if (Array.isArray(data) && data.length > 0) return data;
  if (data && Array.isArray(data.value) && data.value.length > 0) return data.value;
  return demo;
}

export async function fetchTournamentsList(): Promise<TournamentApi[] | null> {
  const data = await apiGet('/tournaments');
  if (Array.isArray(data) && data.length > 0) return data;
  return demoTournaments as TournamentApi[];
}

export async function fetchTournamentById(
  tournamentId: string
): Promise<TournamentApi | null> {
  const data = await apiGet(`/tournaments/${tournamentId}`);
  if (data) return data;
  return (demoTournaments as any[]).find((t) => t.id === tournamentId) || null;
}

export function fetchTournamentSeasons(
  tournamentId: string
): Promise<TournamentSeason[]> {
  return asArray<TournamentSeason>(
    apiGet(`/tournaments/${tournamentId}/seasons`),
    (demoSeasons[tournamentId] || []) as TournamentSeason[]
  );
}

export function fetchTournamentResults(
  tournamentOrSeasonId: string
): Promise<SportEventRecord[]> {
  return asArray<SportEventRecord>(
    apiGet(`/tournaments/${tournamentOrSeasonId}/results`),
    ((demoResults[tournamentOrSeasonId] as any) ||
      demoResults['sr:tournament:demo:psl'] ||
      []) as SportEventRecord[]
  );
}

export function getDemoMatchById(matchId: string) {
  return demoMatchById[matchId] || null;
}