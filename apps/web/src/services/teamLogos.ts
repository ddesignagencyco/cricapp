import { apiGet } from './api/client';
import type { TeamLogoMap } from '../components/TeamLogosProvider';

/**
 * The logo lookup for the whole site. A failure must never break a page: without it a team
 * falls back to its initials, exactly as before.
 */
export async function loadTeamLogos(): Promise<TeamLogoMap> {
  try {
    return await apiGet<TeamLogoMap>('/teams/logos', undefined, { revalidate: 300 });
  } catch {
    return {};
  }
}
