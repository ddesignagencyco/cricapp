'use client';

import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

/** `id:` / `abbr:` / `name:` (lowercase) → logo URL, from `GET /teams/logos`. */
export type TeamLogoMap = Record<string, string>;

const TeamLogosContext = createContext<TeamLogoMap>({});

export function TeamLogosProvider({ logos, children }: { logos: TeamLogoMap; children: ReactNode }) {
  return <TeamLogosContext.Provider value={logos}>{children}</TeamLogosContext.Provider>;
}

export function useTeamLogos(): TeamLogoMap {
  return useContext(TeamLogosContext);
}

/**
 * Find a team's logo from whatever a component happens to know. An id is the most precise
 * key, then the abbreviation, then the name, since many cards only carry a code and a name.
 */
export function lookupTeamLogo(
  logos: TeamLogoMap,
  ref: { teamId?: string; code?: string; name?: string },
): string | null {
  const id = ref.teamId?.trim().toLowerCase();
  const code = ref.code?.trim().toLowerCase();
  const name = ref.name?.trim().toLowerCase();
  return (
    (id && logos[`id:${id}`]) ||
    (code && logos[`abbr:${code}`]) ||
    (name && logos[`name:${name}`]) ||
    null
  );
}
