import { authors, players, series, teams, venues } from './mock/entities';
import type { Author, Player, Series, Team, Venue } from './types';

/*
 * Synchronous entity lookups. The real API will embed these in responses;
 * until then screens resolve ids here so they never block on a fetch.
 */

const index = <T extends { id: string }>(list: T[]) =>
  Object.fromEntries(list.map(item => [item.id, item])) as Record<string, T>;

const teamIndex = index(teams);
const playerIndex = index(players);
const seriesIndex = index(series);
const venueIndex = index(venues);
const authorIndex = index(authors);

const unknownTeam: Team = { id: '?', name: 'TBC', short: 'TBC', color: '#3B68FC', kind: 'international', slug: 'tbc' };

export const team = (id: string): Team => teamIndex[id] ?? unknownTeam;
export const player = (id: string): Player | undefined => playerIndex[id];
export const playerName = (id: string) => playerIndex[id]?.name ?? id;
export const playerShort = (id: string) => playerIndex[id]?.short ?? id;
export const seriesOf = (id: string): Series | undefined => seriesIndex[id];
export const venue = (id: string): Venue | undefined => venueIndex[id];
export const author = (id: string): Author | undefined => authorIndex[id];

export const allTeams = teams;
export const allPlayers = players;
export const allSeries = series;
