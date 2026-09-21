import { formatCricketOvers, getInitials } from '../utils/helpers';
import type { Match } from '../types';
import type {
  MatchSideLabels,
  PartnershipProjection,
  PredictionChartPoint,
  PredictionRun,
  PredictionScoreRange,
} from '../types/predictions';

export function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

export function finiteNum(value: unknown): number | null {
  if (isNil(value) || value === '') return null;
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
  matchStatus: string;
  parScore: number | null;
  requiredRuns: number | null;
}

export function asPercent(value: number | null | undefined): string {
  if (isNil(value) || Number.isNaN(Number(value))) return '—';
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
  const isObj = !isNil(teams) && typeof teams === 'object' && !Array.isArray(teams);
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

const PRIVATE_COPY = /\b(model|calibration|brier|stored run|logit|resource-v)\b/i;

export function publicNarrative(text?: string | null): string {
  if (!text) return '';
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence && !PRIVATE_COPY.test(sentence))
    .join(' ')
    .trim();
}

export function explanationReasons(explanation: Record<string, unknown> | null | undefined): string[] {
  if (!explanation) return [];
  const raw = explanation.reasons;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => String(item).trim())
    .filter((item) => item.length > 8 && !PRIVATE_COPY.test(item));
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
  const overNum = isNil(row.over) || row.over === '' ? Number.NaN : Number(row.over);
  const momentumNum = isNil(row.momentum) || row.momentum === '' ? Number.NaN : Number(row.momentum);
  const pressureNum = isNil(row.pressureIndex) || row.pressureIndex === '' ? Number.NaN : Number(row.pressureIndex);
  return {
    runId: !isNil(row.runId) ? String(row.runId) : undefined,
    stage: !isNil(row.stage) ? String(row.stage) : undefined,
    modelVersion: !isNil(row.modelVersion) ? String(row.modelVersion) : undefined,
    createdAt: !isNil(row.createdAt) ? String(row.createdAt) : undefined,
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
  const parsedScore = displayScore.match(/^(\d+)\/(\d+)/);
  const scoreRuns = parsedScore ? Number(parsedScore[1]) : null;
  const scoreWkts = parsedScore ? Number(parsedScore[2]) : null;
  const innRuns = finiteNum(inn.runs);
  const innWkts = finiteNum(inn.wickets);
  const innOvers = finiteNum(inn.overs);
  const innEmpty = (innRuns === null || innRuns === 0) && (innWkts === null || innWkts === 0);
  const modelOver = finiteNum(explanation.over);
  const inning = finiteNum(explanation.inning);
  const requiredRuns = finiteNum(explanation.requiredRuns);
  const remainingBalls = finiteNum(explanation.remainingBalls);
  const requiredRunRate = finiteNum(explanation.requiredRunRate ?? rec.requiredRunRate);
  const parScore = finiteNum(explanation.parScore);
  const modelWickets = scoreWkts !== null ? scoreWkts : finiteNum(explanation.wickets);
  const matchStatus = String(rec.matchStatus || rec.status || '').trim();
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
  } else if (!innEmpty && innRuns !== null && innWkts !== null) {
    scoreLine = `${battingName} ${innRuns}/${innWkts}`;
    if (innOvers !== null && innOvers > 0) {
      scoreLine += ` · ${formatCricketOvers(innOvers) || innOvers} overs`;
    }
  }

  const chasing =
    inning === 2 && requiredRuns !== null && requiredRuns > 0 && remainingBalls !== null && remainingBalls > 0;
  const needLine = chasing
    ? `${battingName} need ${requiredRuns} from ${remainingBalls} balls`
    : inning === 2 && requiredRuns !== null && requiredRuns > 0 && remainingBalls === 0
      ? `${battingName} were chasing ${requiredRuns}${scoreRuns !== null ? ` · finished ${scoreRuns}` : ''}`
      : '';

  const inningsLabel = inning === 1 ? '1st innings' : inning === 2 ? '2nd innings' : '';
  const snapshotNote = modelOver !== null
    ? `Score picture at ${modelOver} overs${inningsLabel ? ` · ${inningsLabel}` : ''}`
    : '';

  return {
    scoreLine,
    needLine,
    snapshotNote,
    requiredRunRate,
    wicketsInHand: modelWickets === null ? null : Math.max(0, 10 - modelWickets),
    modelOver,
    inning,
    wicketsLost: modelWickets,
    remainingBalls,
    resourcesLeft: finiteNum(explanation.resourcesLeft),
    projectedTotal: finiteNum(explanation.projectedTotal),
    deltaFromPrevious: finiteNum(explanation.deltaFromPrevious),
    battingLabel: battingName,
    matchStatus,
    parScore,
    requiredRuns,
  };
}

export function matchStatusLabel(status?: string | null): string {
  const raw = String(status || '').trim().toLowerCase();
  if (!raw) return '';
  if (raw.includes('innings_break')) return 'Innings break';
  if (raw.includes('first_innings')) return '1st innings';
  if (raw.includes('second_innings')) return '2nd innings';
  switch (raw) {
    case 'live':
      return 'Live';
    case 'upcoming':
    case 'not_started':
    case 'not started':
      return 'Upcoming';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return raw.replace(/_/g, ' ');
  }
}

export function inningsLooksOver(situation: PredictionSituation): boolean {
  const phase = String(situation.matchStatus || '').toLowerCase();
  if (phase.includes('innings_break')) return true;
  if (situation.remainingBalls === 0) return true;
  if (situation.resourcesLeft === 0) return true;
  if (situation.modelOver !== null && situation.modelOver >= 50) return true;
  return false;
}

export function usefulScoreRange(
  range?: PredictionScoreRange | null,
  currentRuns?: number | null
): boolean {
  if (!range) return false;
  const low = Number(range.low);
  const high = Number(range.high);
  const expected = Number(range.expected);
  const hasPositive = [low, high, expected].some((value) => Number.isFinite(value) && value > 0);
  if (!hasPositive) return false;
  if (currentRuns !== null && currentRuns !== undefined && Number.isFinite(high) && high > 0 && currentRuns > high + 20) {
    return false;
  }
  return true;
}

export function usefulPartnership(partnership?: PartnershipProjection | null): boolean {
  if (!partnership) return false;
  const runs = Number(partnership.expectedAdditionalRuns);
  const balls = Number(partnership.horizonBalls);
  return Number.isFinite(runs) && runs > 0 && (!Number.isFinite(balls) || balls > 0);
}

export function scoreRangeTitle(type?: string | null): string {
  switch ((type || '').toLowerCase().replace(/\s+/g, '_')) {
    case 'chase_total':
      return 'What the chasing side might finish on';
    case 'first_innings_total':
      return 'Likely first-innings total';
    case 'projected_total':
    case 'score_range':
      return 'Likely team total';
    default:
      return 'What might happen next';
  }
}

export function momentumLine(
  momentum: number | null | undefined,
  sides: MatchSideLabels
): string {
  if (isNil(momentum) || momentum === 0) return '';
  const team = momentum > 0 ? sides.homeName : sides.awayName;
  const abs = Math.abs(Number(momentum));
  if (abs >= 1) return `${team} have a clear hold`;
  if (abs >= 0.4) return `${team} have a slight hold`;
  return `Tiny lean toward ${team}`;
}

function stringField(source: Record<string, unknown> | null | undefined, key: string): string {
  if (!source) return '';
  const value = source[key];
  return typeof value === 'string' ? value.trim() : '';
}

function storedText(value: unknown): string {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  if (!text || PRIVATE_COPY.test(text)) return '';
  return text;
}

export function publicTossFact(
  run: PredictionRun | null | undefined,
  match: Match | Record<string, unknown> | null | undefined,
  sides: MatchSideLabels
): string | null {
  const rec = (match || {}) as Record<string, unknown>;
  const explanation = run?.explanation || {};
  const listed = stringField(rec, 'toss') || stringField(rec, 'tossWinner') || stringField(rec, 'tossWonBy');
  const decision = storedText(explanation.tossDecision);
  const adjusted = explanation.tossAdjusted === true;
  if (!adjusted && !listed && !decision) return null;
  const who = listed
    .replace(/\bhome\b/i, sides.homeName)
    .replace(/\baway\b/i, sides.awayName);
  if (adjusted) {
    return ['Toss is already in this chance', who || decision].filter(Boolean).join(' · ');
  }
  return who || (decision ? `Toss: ${decision}` : null);
}

export function publicVenueWeatherFact(
  run: PredictionRun | null | undefined,
  match: Match | Record<string, unknown> | null | undefined
): string | null {
  const rec = (match || {}) as Record<string, unknown>;
  const venue = [stringField(rec, 'venue'), stringField(rec, 'city')].filter(Boolean).join(', ');
  const weather = stringField(rec, 'weather') || stringField(rec, 'weatherInfo');
  const pitch = stringField(rec, 'pitch') || stringField(rec, 'pitchInfo');
  const impact = run?.explanation?.conditionsImpact;
  const reasons: string[] = [];
  if (impact && typeof impact === 'object' && !Array.isArray(impact)) {
    const factors = (impact as { factors?: unknown }).factors;
    if (Array.isArray(factors)) {
      for (const item of factors) {
        if (!item || typeof item !== 'object') continue;
        const reason = storedText((item as { reason?: unknown }).reason);
        if (reason) reasons.push(reason);
      }
    }
  }
  const bits = [venue, weather, pitch, ...reasons].filter(Boolean);
  if (bits.length === 0) return null;
  return bits.join(' · ');
}

export function publicXiSnapshot(
  run: PredictionRun | null | undefined
): { home: string[]; away: string[]; note: string } | null {
  if (!run?.xi || typeof run.xi !== 'object') return null;
  const home = xiNames(run.xi, 'home');
  const away = xiNames(run.xi, 'away');
  if (home.length === 0 && away.length === 0) return null;
  const reliability = storedText(run.xi.reliability);
  const method = storedText(run.xi.method);
  if (method === 'unavailable') return null;
  const note = reliability === 'high' ? 'Confirmed listing' : 'Listed XI from the saved snapshot';
  return { home, away, note };
}

export function namedPlayerPicks(
  picks?: Array<{ playerName?: string; name?: string; probability?: number | null; [key: string]: unknown }> | null
): Array<{ name: string; chance: string | null }> {
  if (!Array.isArray(picks)) return [];
  return picks
    .map((player) => {
      const name = String(player.playerName || player.name || '').trim();
      if (!name || PRIVATE_COPY.test(name)) return null;
      const chance = isNil(player.probability) || !Number.isFinite(Number(player.probability))
        ? null
        : asPercent(Number(player.probability));
      return { name, chance };
    })
    .filter((row): row is { name: string; chance: string | null } => row !== null)
    .slice(0, 5);
}

export function publicWhyChanged(
  run: PredictionRun | null | undefined,
  sides: MatchSideLabels
): string | null {
  if (!run) return null;
  const explanation = run.explanation || {};
  const reasons = explanationReasons(explanation);
  const delta = finiteNum(explanation.deltaFromPrevious);
  const bits: string[] = [];
  if (delta !== null && delta !== 0) {
    const team = delta > 0 ? sides.homeName : sides.awayName;
    bits.push(`${team} chance moved ${delta > 0 ? '+' : ''}${asPercent(Math.abs(delta))} since the last update`);
  }
  if (reasons.length > 0) bits.push(reasons.join(' · '));
  return bits.length > 0 ? bits.join('. ') : null;
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
