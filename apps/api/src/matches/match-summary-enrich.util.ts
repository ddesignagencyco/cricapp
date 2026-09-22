import type { TeamScores } from '@cricapp/shared-types';

type PeriodScore = {
  home_score?: number;
  away_score?: number;
  home_wickets?: number;
  away_wickets?: number;
  display_overs?: number | string;
};

function sideTotal(periodScores: PeriodScore[], side: 'home' | 'away') {
  let runs = 0;
  let wickets: number | null = null;
  let overs = '';
  let recorded = false;
  for (const inning of periodScores) {
    const value = Number(inning[`${side}_score`]);
    const w = Number(inning[`${side}_wickets`]);
    if (!Number.isNaN(value) || !Number.isNaN(w)) {
      if (!Number.isNaN(value)) runs += value;
      recorded = true;
      if (!Number.isNaN(w)) wickets = w;
      if (inning.display_overs != null) overs = String(inning.display_overs);
    }
  }
  if (!recorded) return { score: '', overs: '' };
  return { score: wickets !== null ? `${runs}/${wickets}` : String(runs), overs };
}

export function teamScoresFromSportEventPayload(
  payload: Record<string, unknown> | null | undefined,
): TeamScores | null {
  if (!payload) return null;
  const event = (payload.sport_event ?? payload) as Record<string, unknown>;
  const status = (payload.sport_event_status ?? event.sport_event_status) as
    | Record<string, unknown>
    | undefined;
  const competitors = (event.competitors as Array<Record<string, unknown>>) ?? [];
  const homeComp = competitors.find((c) => c.qualifier === 'home') ?? competitors[0];
  const awayComp = competitors.find((c) => c.qualifier === 'away') ?? competitors[1];
  const periods = (status?.period_scores as PeriodScore[]) ?? [];
  if (!periods.length) return null;

  const homeTotals = sideTotal(periods, 'home');
  const awayTotals = sideTotal(periods, 'away');
  return {
    home: {
      code: String(homeComp?.abbreviation ?? ''),
      name: String(homeComp?.name ?? ''),
      score: homeTotals.score,
      overs: homeTotals.overs,
    },
    away: {
      code: String(awayComp?.abbreviation ?? ''),
      name: String(awayComp?.name ?? ''),
      score: awayTotals.score,
      overs: awayTotals.overs,
    },
  };
}

export function resultTextFromPayload(payload: Record<string, unknown> | null | undefined): string | null {
  if (!payload) return null;
  const event = (payload.sport_event ?? payload) as Record<string, unknown>;
  const status = (payload.sport_event_status ?? event.sport_event_status) as
    | Record<string, unknown>
    | undefined;
  const text = status?.match_result_text ?? status?.result;
  return typeof text === 'string' && text.trim() ? text.trim() : null;
}
