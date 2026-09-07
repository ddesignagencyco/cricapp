import { apiGet } from './api/client';
import { Team, SportEventRecord } from '../types/index';
import { demoTeamSchedule, demoTeamResults } from '../data/demo';

async function asArray(promise: Promise<any>, demo: any[]): Promise<any[]> {
  const data = await promise;
  if (Array.isArray(data) && data.length > 0) return data;
  if (data && Array.isArray(data.value) && data.value.length > 0) return data.value;
  return demo;
}

export function fetchTeams(): Promise<Team[] | null> {
  return apiGet('/teams');
}

export function fetchTeamById(idOrAbbr: string): Promise<Team | null> {
  return apiGet(`/teams/${idOrAbbr}`);
}

export function fetchTeamRoster(idOrAbbr: string): Promise<any> {
  return apiGet(`/teams/${idOrAbbr}/players`);
}

export function fetchTeamSchedule(idOrAbbr: string): Promise<SportEventRecord[]> {
  return asArray(apiGet(`/teams/${idOrAbbr}/schedule`), demoTeamSchedule[idOrAbbr] || []);
}

export function fetchTeamResults(idOrAbbr: string): Promise<SportEventRecord[]> {
  return asArray(apiGet(`/teams/${idOrAbbr}/results`), demoTeamResults[idOrAbbr] || []);
}