import { apiGet } from './api/client';
import { Team } from '../types/index';

export function fetchTeams(): Promise<Team[] | null> {
  return apiGet('/teams');
}

export function fetchTeamById(idOrAbbr: string): Promise<Team | null> {
  return apiGet(`/teams/${idOrAbbr}`);
}

export function fetchTeamRoster(idOrAbbr: string): Promise<any> {
  return apiGet(`/teams/${idOrAbbr}/players`);
}
