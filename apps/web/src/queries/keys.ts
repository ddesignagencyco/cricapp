export type QueryParam = string | number | boolean;

export interface GalleryQueryParams {
  [key: string]: string | number | boolean | undefined;
  type?: 'image' | 'short' | 'video';
  page?: number;
  limit?: number;
}

export interface MatchesQueryParams {
  [key: string]: string | number | boolean | undefined;
  q?: string;
  status?: string;
  tournament?: string;
  page?: number;
  limit?: number;
}

export interface PlayersQueryParams {
  [key: string]: string | number | boolean | undefined;
  q?: string;
  team?: string;
  page?: number;
  limit?: number;
  role?: string;
  status?: string;
  sort?: string;
}

export interface TeamsQueryParams {
  [key: string]: string | number | boolean | undefined;
  q?: string;
  page?: number;
  limit?: number;
  country?: string;
  category?: string;
  status?: string;
  sort?: string;
  season?: string;
}

export interface ToursQueryParams {
  [key: string]: string | number | boolean | undefined;
  q?: string;
  search?: string;
  page?: number;
  limit?: number;
  category?: string;
  country?: string;
  status?: string;
  sort?: string;
  season?: string;
}

export interface TournamentsQueryParams {
  [key: string]: string | number | boolean | undefined;
  q?: string;
  page?: number;
  limit?: number;
  country?: string;
  category?: string;
  format?: string;
  type?: string;
  gender?: string;
  status?: string;
  sort?: string;
  season?: string;
}

export function normalizeParams(params: Record<string, unknown> = {}): Record<string, QueryParam> {
  const normalized: Record<string, QueryParam> = {};
  for (const key of Object.keys(params).sort()) {
    const value = params[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) normalized[key] = trimmed;
      continue;
    }
    if (typeof value === 'number' && Number.isFinite(value)) normalized[key] = value;
    if (typeof value === 'boolean') normalized[key] = value;
  }
  return normalized;
}

export function parsePositiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.floor(parsed));
}

export function parseLimit(value: unknown, fallback: number): number {
  return Math.min(100, parsePositiveInt(value, fallback));
}

const galleryLists = () => ['gallery', 'list'] as const;

export const galleryKeys = {
  all: ['gallery'] as const,
  lists: galleryLists,
  list: (params: GalleryQueryParams | Record<string, unknown>) =>
    [...galleryLists(), normalizeParams(params as Record<string, unknown>)] as const,
};

const matchLists = () => ['matches', 'list'] as const;

export const matchKeys = {
  all: ['matches'] as const,
  lists: matchLists,
  list: (params: MatchesQueryParams | Record<string, unknown>) =>
    [...matchLists(), normalizeParams(params as Record<string, unknown>)] as const,
  live: () => [...matchLists(), { live: true }] as const,
};

const playerLists = () => ['players', 'list'] as const;

export const playerKeys = {
  all: ['players'] as const,
  lists: playerLists,
  list: (params: PlayersQueryParams | Record<string, unknown>) =>
    [...playerLists(), normalizeParams(params as Record<string, unknown>)] as const,
};

const teamLists = () => ['teams', 'list'] as const;

export const teamKeys = {
  all: ['teams'] as const,
  lists: teamLists,
  list: (params: TeamsQueryParams | Record<string, unknown>) =>
    [...teamLists(), normalizeParams(params as Record<string, unknown>)] as const,
};

const tourLists = () => ['tours', 'list'] as const;

export const tourKeys = {
  all: ['tours'] as const,
  lists: tourLists,
  list: (params: ToursQueryParams | Record<string, unknown>) =>
    [...tourLists(), normalizeParams(params as Record<string, unknown>)] as const,
};

const tournamentLists = () => ['tournaments', 'list'] as const;

export const tournamentKeys = {
  all: ['tournaments'] as const,
  lists: tournamentLists,
  list: (params: TournamentsQueryParams | Record<string, unknown>) =>
    [...tournamentLists(), normalizeParams(params as Record<string, unknown>)] as const,
};

export const siteSettingsKeys = {
  all: ['site-settings'] as const,
  current: () => ['site-settings', 'current'] as const,
};
