import { apiGet } from './api/client';
import { TournamentApi, TournamentSeason, SportEventRecord } from '../types/index';

export function fetchTournaments(): Promise<TournamentApi[]> {
  return apiGet('/tournaments');
}

export function fetchTournamentById(tournamentId: string): Promise<TournamentApi | null> {
  return apiGet(`/tournaments/${tournamentId}`);
}

export function fetchTournamentSeasons(tournamentId: string): Promise<TournamentSeason[]> {
  return apiGet(`/tournaments/${tournamentId}/seasons`);
}

export function fetchTournamentResults(tournamentOrSeasonId: string): Promise<SportEventRecord[]> {
  return apiGet(`/tournaments/${tournamentOrSeasonId}/results`);
}
