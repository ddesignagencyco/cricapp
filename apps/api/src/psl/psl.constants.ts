import { PSL_SEASONS } from '@cricapp/shared-types';

export interface PslSeason {
  id: string;
  name: string;
  year: string;
}

export const PSL_SEASONS_LIST: PslSeason[] = [...PSL_SEASONS];

export const DEFAULT_PSL_SEASON_ID: string = PSL_SEASONS_LIST.reduce((latest, s) =>
  s.year > latest.year ? s : latest,
).id;

const SEASON_BY_ID = new Map(PSL_SEASONS_LIST.map((s) => [s.id, s]));

/**
 * Resolve a requested season identifier to a known season id.
 * Accepts:
 *   - a full season id (sr:season:140552)
 *   - a short season id (140552)
 *   - a year (2026)
 * Falls back to the latest season.
 */
export function resolveSeason(season?: string): PslSeason {
  if (season) {
    const trimmed = season.trim();
    const byYear = PSL_SEASONS_LIST.find((s) => s.year === trimmed);
    const byFullId = SEASON_BY_ID.get(trimmed);
    const byShortId = PSL_SEASONS_LIST.find((s) => s.id.endsWith(`:${trimmed}`));
    const found = byYear ?? byFullId ?? byShortId;
    if (found) return found;
  }
  return SEASON_BY_ID.get(DEFAULT_PSL_SEASON_ID)!;
}
