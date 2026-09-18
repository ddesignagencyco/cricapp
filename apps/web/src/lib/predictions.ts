import { formatCricketOvers, getInitials } from '../utils/helpers';
import type { Match } from '../types';
import type { MatchSideLabels, PredictionChartPoint, PredictionRun } from '../types/predictions';

export function finiteNum(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export interface PredictionSituation {
  scoreLine: string;
  needLine: string;
  snapshotNote: string;
  requiredRunRate: number | null;
  wicketsInHand: number | null;
  modelOver: number | null;
  inning: number | null;
  wicketsLost: number | null;
  remainingBalls: number | null;
  resourcesLeft: number | null;
  projectedTotal: number | null;
  deltaFromPrevious: number | null;
  battingLabel: string;
}

export function asPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const pct = Number(value) * 100;
  const tenths = Math.round(pct * 10) / 10;
  return Number.isInteger(tenths) ? `${tenths}%` : `${tenths.toFixed(1)}%`;
}

export function bandTone(band?: string | null): string {
  switch ((band || '').toLowerCase()) {
    case 'high':
      return 'success';
    case 'medium':
      return 'warning';
    case 'low':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function stageLabel(stage?: string | null): string {
  switch (stage) {
    case 'pre_match':
      return 'Pre-match';
    case 'live':
      return 'Live';
    default:
      return stage ? stage.replace(/_/g, ' ') : 'Prediction';
  }
}

export function matchSides(match: Match | Record<string, unknown> | null | undefined): MatchSideLabels {
  const record = (match || {}) as Record<string, unknown>;
  const teams = record.teams;
  const teamNames = Array.isArray(record.teamNames) ? record.teamNames.map(String) : [];
  const isObj = teams != null && typeof teams === 'object' && !Array.isArray(teams);
  const obj = isObj ? (teams as { home?: Record<string, unknown>; away?: Record<string, unknown> }) : null;
  const arr = Array.isArray(teams) ? teams.map(String) : [];

  const homeName = String(obj?.home?.name || teamNames[0] || '').replace(/^sr:competitor:/, '') || 'Home';
  const awayName = String(obj?.away?.name || teamNames[1] || '').replace(/^sr:competitor:/, '') || 'Away';
  const homeRaw = String(obj?.home?.code || obj?.home?.abbr || arr[0] || '').replace(/^sr:competitor:/, '');
  const awayRaw = String(obj?.away?.code || obj?.away?.abbr || arr[1] || '').replace(/^sr:competitor:/, '');
  const bad = (code: string) => !code || /^sr:/.test(code) || code.length > 5;

  return {
    homeName,
    awayName,
    homeCode: bad(homeRaw) ? getInitials(homeName) : homeRaw.toUpperCase(),
    awayCode: bad(awayRaw) ? getInitials(awayName) : awayRaw.toUpperCase(),
  };
}

export function favoriteLabel(run: PredictionRun | null | undefined, sides: MatchSideLabels): string {
  if (!run) return 'Even';
  if (run.homeWinProb === run.awayWinProb) return 'Even';
  return run.homeWinProb > run.awayWinProb ? sides.homeName : sides.awayName;
}

export function explanationReasons(explanation: Record<string, unknown> | null | undefined): string[] {
  if (!explanation) return [];
  const raw = explanation.reasons;
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item)).filter(Boolean);
  }
  const attributions = explanation.factorAttributions;
  if (!Array.isArray(attributions)) return [];
  return factorAttributions(explanation);
}

export function factorAttributions(explanation: Record<string, unknown> | null | undefined): string[] {
  const attributions = explanation?.factorAttributions;
  if (!Array.isArray(attributions)) return [];
  return attributions
    .map((item) => {
      if (!item || typeof item !== 'object') return '';
      const row = item as { factor?: string; contribution?: number; impact?: number };
      const value = Number(row.contribution ?? row.impact ?? 0);
      if (!Number.isFinite(value) || !row.factor) return '';
      const sign = value > 0 ? '+' : '';
      return `${String(row.factor).replace(/_/g, ' ')} ${sign}${value.toFixed(3)}`.trim();
    })
    .filter(Boolean);
}

export function xiNames(xi: Record<string, unknown> | null | undefined, side: 'home' | 'away'): string[] {
  if (!xi) return [];
  const raw = xi[side];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const row = item as { playerName?: string; name?: string };
        return String(row.playerName || row.name || '');
      }
      return '';
    })
    .filter(Boolean);
}

export function featuredRun(predictions: { live?: PredictionRun | null; preMatch?: PredictionRun | null } | null | undefined): PredictionRun | null {
  return predictions?.live || predictions?.preMatch || null;
}

export function normalizeChartPoint(raw: PredictionChartPoint | Record<string, unknown> | null | undefined): PredictionChartPoint | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const homeWinProb = Number(row.homeWinProb);
  const awayWinProb = Number(row.awayWinProb);
  if (!Number.isFinite(homeWinProb) || !Number.isFinite(awayWinProb)) return null;
  const overNum = row.over == null || row.over === '' ? Number.NaN : Number(row.over);
  const momentumNum = row.momentum == null || row.momentum === '' ? Number.NaN : Number(row.momentum);
  const pressureNum = row.pressureIndex == null || row.pressureIndex === '' ? Number.NaN : Number(row.pressureIndex);
  return {
    runId: row.runId != null ? String(row.runId) : undefined,
    stage: row.stage != null ? String(row.stage) : undefined,
    modelVersion: row.modelVersion != null ? String(row.modelVersion) : undefined,
    createdAt: row.createdAt != null ? String(row.createdAt) : undefined,
    over: Number.isFinite(overNum) ? overNum : null,
    homeWinProb,
    awayWinProb,
    momentum: Number.isFinite(momentumNum) ? momentumNum : null,
    pressureIndex: Number.isFinite(pressureNum) ? pressureNum : null,
    reasons: Array.isArray(row.reasons) ? row.reasons.map((item) => String(item)).filter(Boolean) : [],
  };
}

export function chartPointsFromRuns(runs: PredictionRun[] | null | undefined): PredictionChartPoint[] {
  if (!runs?.length) return [];
  return runs
    .map((run) => {
      const explanation = run.explanation || {};
      const reasons = Array.isArray(explanation.reasons) ? explanation.reasons.map((item) => String(item)) : [];
      return normalizeChartPoint({
        runId: run.runId,
        stage: run.stage,
        modelVersion: run.modelVersion,
        createdAt: run.createdAt,
        over: run.stage === 'pre_match' ? 0 : explanation.over,
        homeWinProb: run.homeWinProb,
        awayWinProb: run.awayWinProb,
        momentum: run.momentum,
        pressureIndex: run.pressureIndex,
        reasons,
      });
    })
    .filter((point): point is PredictionChartPoint => point !== null);
}

export function mergeChartPoints(
  points: PredictionChartPoint[] | null | undefined,
  runs: PredictionRun[] | null | undefined
): PredictionChartPoint[] {
  const fromApi = (points || []).map((point) => normalizeChartPoint(point)).filter((point): point is PredictionChartPoint => point !== null);
  const fromRuns = chartPointsFromRuns(runs);
  const byId = new Map<string, PredictionChartPoint>();
  for (const point of [...fromRuns, ...fromApi]) {
    const key = point.runId || `${point.stage}-${point.createdAt}-${point.over}`;
    byId.set(key, { ...byId.get(key), ...point });
  }
  return [...byId.values()].sort((a, b) => {
    const ao = a.stage === 'pre_match' ? -1 : Number(a.over ?? 0);
    const bo = b.stage === 'pre_match' ? -1 : Number(b.over ?? 0);
    if (ao !== bo) return ao - bo;
    return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
  });
}

export function predictionSituation(
  match: Match | Record<string, unknown> | null | undefined,
  run: PredictionRun | null | undefined,
  sides: MatchSideLabels
): PredictionSituation {
  const rec = (match || {}) as Record<string, unknown>;
  const inn = rec.currentInnings && typeof rec.currentInnings === 'object'
    ? (rec.currentInnings as Record<string, unknown>)
    : {};
  const explanation = run?.explanation || {};
  const display = String(rec.displayScore || '').trim();
  const displayScore = /^\d+\s*\/\s*\d+/.test(display) ? display.replace(/\s+/g, '') : '';
  const innRuns = finiteNum(inn.runs);
  const innWkts = finiteNum(inn.wickets);
  const innOvers = finiteNum(inn.overs);
  const innEmpty = (innRuns == null || innRuns === 0) && (innWkts == null || innWkts === 0);
  const modelOver = finiteNum(explanation.over);
  const inning = finiteNum(explanation.inning);
  const requiredRuns = finiteNum(explanation.requiredRuns);
  const remainingBalls = finiteNum(explanation.remainingBalls);
  const requiredRunRate = finiteNum(explanation.requiredRunRate ?? rec.requiredRunRate);
  const modelWickets = finiteNum(explanation.wickets);
  const battingCode = String(inn.battingTeam || '').toUpperCase();
  const battingName =
    battingCode && battingCode === sides.homeCode
      ? sides.homeName
      : battingCode && battingCode === sides.awayCode
        ? sides.awayName
        : explanation.battingIsHome === false
          ? sides.awayName
          : sides.homeName;

  let scoreLine = '';
  if (displayScore) {
    scoreLine = `${battingName} ${displayScore}`;
  } else if (!innEmpty && innRuns != null && innWkts != null) {
    scoreLine = `${battingName} ${innRuns}/${innWkts}`;
    if (innOvers != null && innOvers > 0) {
      scoreLine += ` · ${formatCricketOvers(innOvers) || innOvers} overs`;
    }
  }

  const chasing =
    inning === 2 && requiredRuns != null && requiredRuns > 0 && remainingBalls != null && remainingBalls > 0;
  const needLine = chasing ? `${battingName} need ${requiredRuns} from ${remainingBalls} balls` : '';

  const inningsLabel = inning === 1 ? '1st innings' : inning === 2 ? '2nd innings' : '';
  const snapshotNote = modelOver != null
    ? `Model snapshot at ${modelOver} ov${inningsLabel ? ` · ${inningsLabel}` : ''}`
    : '';

  return {
    scoreLine,
    needLine,
    snapshotNote,
    requiredRunRate,
    wicketsInHand: modelWickets == null ? null : Math.max(0, 10 - modelWickets),
    modelOver,
    inning,
    wicketsLost: modelWickets,
    remainingBalls,
    resourcesLeft: finiteNum(explanation.resourcesLeft),
    projectedTotal: finiteNum(explanation.projectedTotal),
    deltaFromPrevious: finiteNum(explanation.deltaFromPrevious),
    battingLabel: battingName,
  };
}

export function timeAgo(iso?: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return '—';
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return `${sec} sec ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
