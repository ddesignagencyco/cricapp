/** Deterministic PSL table / playoff math from stored standings + fixtures (SRS §11). */

export const PSL_PLAYOFF_SPOTS = 4;
export const PSL_POINTS_PER_WIN = 2;

export interface PslStandingInput {
  teamId: string;
  teamName: string;
  teamAbbr: string;
  rank: number;
  played: number;
  points: number;
  netRunRate: number;
}

export interface PslQualificationTeamRow extends PslStandingInput {
  remainingFixtures: number;
  maxPossiblePoints: number;
  inPlayoffPosition: boolean;
  mathematicallyAlive: boolean;
}

export interface PslQualificationVerified {
  seasonId: string;
  seasonName: string;
  playoffSpots: number;
  pointsPerWin: number;
  playoffCutoffRank: number;
  playoffCutoffPoints: number | null;
  playoffCutoffNetRunRate: number | null;
  standings: PslQualificationTeamRow[];
  focusTeam: PslQualificationTeamRow | null;
  pointsGapToCutoff: number | null;
  nrrGapToCutoff: number | null;
}

const COMPLETE_STATUSES = new Set([
  'closed',
  'ended',
  'complete',
  'completed',
  'finished',
]);

export function isPslFixtureComplete(status: string | null | undefined): boolean {
  return COMPLETE_STATUSES.has(String(status ?? '').toLowerCase());
}

export function remainingFixturesByTeam(
  fixtures: Array<{
    status: string | null;
    homeTeamId: string | null;
    awayTeamId: string | null;
  }>,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const f of fixtures) {
    if (isPslFixtureComplete(f.status)) continue;
    if (f.homeTeamId) counts.set(f.homeTeamId, (counts.get(f.homeTeamId) ?? 0) + 1);
    if (f.awayTeamId) counts.set(f.awayTeamId, (counts.get(f.awayTeamId) ?? 0) + 1);
  }
  return counts;
}

export function buildPslQualificationVerified(input: {
  seasonId: string;
  seasonName: string;
  standings: PslStandingInput[];
  remainingByTeam: Map<string, number>;
  focusTeamId?: string;
}): PslQualificationVerified {
  const sorted = [...input.standings].sort((a, b) => a.rank - b.rank);
  const cutoff = sorted[PSL_PLAYOFF_SPOTS - 1];
  const cutoffPoints = cutoff?.points ?? null;
  const cutoffNrr = cutoff?.netRunRate ?? null;

  const standings: PslQualificationTeamRow[] = sorted.map((row) => {
    const remainingFixtures = input.remainingByTeam.get(row.teamId) ?? 0;
    const maxPossiblePoints = row.points + remainingFixtures * PSL_POINTS_PER_WIN;
    const inPlayoffPosition = row.rank <= PSL_PLAYOFF_SPOTS;
    let mathematicallyAlive = inPlayoffPosition;
    if (!mathematicallyAlive && cutoffPoints != null) {
      if (maxPossiblePoints > cutoffPoints) {
        mathematicallyAlive = true;
      } else if (maxPossiblePoints === cutoffPoints && cutoffNrr != null) {
        mathematicallyAlive = row.netRunRate >= cutoffNrr;
      }
    }
    return {
      ...row,
      remainingFixtures,
      maxPossiblePoints,
      inPlayoffPosition,
      mathematicallyAlive,
    };
  });

  const focusTeam = input.focusTeamId
    ? standings.find((t) => t.teamId === input.focusTeamId) ?? null
    : null;

  let pointsGapToCutoff: number | null = null;
  let nrrGapToCutoff: number | null = null;
  if (focusTeam && cutoffPoints != null) {
    pointsGapToCutoff = cutoffPoints - focusTeam.points;
    if (cutoffNrr != null) {
      nrrGapToCutoff = focusTeam.netRunRate - cutoffNrr;
    }
  }

  return {
    seasonId: input.seasonId,
    seasonName: input.seasonName,
    playoffSpots: PSL_PLAYOFF_SPOTS,
    pointsPerWin: PSL_POINTS_PER_WIN,
    playoffCutoffRank: PSL_PLAYOFF_SPOTS,
    playoffCutoffPoints: cutoffPoints,
    playoffCutoffNetRunRate: cutoffNrr,
    standings,
    focusTeam,
    pointsGapToCutoff,
    nrrGapToCutoff,
  };
}
