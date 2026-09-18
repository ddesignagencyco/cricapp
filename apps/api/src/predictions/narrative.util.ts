export const NARRATIVE_SOURCE = Object.freeze({
  TEMPLATE: 'template',
  LLM: 'llm',
});

export type NarrativeSource = (typeof NARRATIVE_SOURCE)[keyof typeof NARRATIVE_SOURCE];

export interface NarrativeBrief {
  stage: string;
  homeName: string;
  awayName: string;
  homeWinPct: string;
  awayWinPct: string;
  confidencePct: string;
  calibrationBand: string;
  factors: string[];
  scoreLine: string | null;
  liveLine: string | null;
  disclaimer: string;
}

export interface StoredPredictionCopy {
  stage: string;
  homeWinProb: number;
  awayWinProb: number;
  confidence: number;
  calibrationBand: string;
  explanation: Record<string, unknown>;
  scoreRange: unknown;
  snapshot: Record<string, unknown> | null;
  previousHomeWinProb?: number | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function formatPct(probability: number): string {
  const pct = Math.round(probability * 1000) / 10;
  return Number.isInteger(pct) ? String(pct) : pct.toFixed(1);
}

function teamLabel(snapshot: Record<string, unknown> | null, key: 'homeName' | 'awayName', fallback: string): string {
  const value = snapshot?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function topContributions(explanation: Record<string, unknown>, limit = 3): string[] {
  const raw = explanation.factorAttributions;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((item) => {
      const factor = String(item.factor ?? 'factor');
      const value = Number(item.contribution ?? item.impact ?? 0);
      if (!Number.isFinite(value) || value === 0) return null;
      const direction = value > 0 ? 'favours home' : 'favours away';
      return `${factor.replaceAll('_', ' ')} (${direction})`;
    })
    .filter((line): line is string => Boolean(line))
    .slice(0, limit);
}

function scoreLine(scoreRange: unknown): string | null {
  const range = asRecord(scoreRange);
  if (!range) return null;
  const expected = Number(range.expected);
  const low = Number(range.low);
  const high = Number(range.high);
  if (![expected, low, high].every(Number.isFinite)) return null;
  const type = typeof range.type === 'string' ? range.type.replaceAll('_', ' ') : 'score';
  return `Stored ${type} band ${low}–${high} (expected ${expected}).`;
}

function liveLine(explanation: Record<string, unknown>, previousHomeWinProb?: number | null): string | null {
  const bits: string[] = [];
  if (typeof explanation.over === 'number') bits.push(`over ${explanation.over}`);
  if (typeof explanation.wickets === 'number') bits.push(`${explanation.wickets} wickets down`);
  if (typeof explanation.resourcesLeft === 'number') {
    bits.push(`resources left ${formatPct(explanation.resourcesLeft)}% of a full innings`);
  }
  const reasons = Array.isArray(explanation.reasons)
    ? explanation.reasons.filter((reason): reason is string => typeof reason === 'string')
    : [];
  if (reasons.length > 0) bits.push(`last stored trigger: ${reasons.join(', ')}`);
  if (typeof previousHomeWinProb === 'number') {
    const delta = Number(explanation.deltaFromPrevious);
    if (Number.isFinite(delta) && delta !== 0) {
      bits.push(`home probability moved ${delta > 0 ? '+' : ''}${formatPct(delta)} points vs the previous stored live run`);
    }
  }
  return bits.length ? bits.join('; ') : null;
}

export function buildNarrativeBrief(input: StoredPredictionCopy): NarrativeBrief {
  const snapshot = input.snapshot;
  const homeName = teamLabel(snapshot, 'homeName', 'Home');
  const awayName = teamLabel(snapshot, 'awayName', 'Away');
  const factors = topContributions(input.explanation);
  if (input.explanation.tossAdjusted === true) factors.push('toss already included in the stored run');
  return {
    stage: input.stage,
    homeName,
    awayName,
    homeWinPct: formatPct(input.homeWinProb),
    awayWinPct: formatPct(input.awayWinProb),
    confidencePct: formatPct(input.confidence),
    calibrationBand: input.calibrationBand,
    factors,
    scoreLine: scoreLine(input.scoreRange),
    liveLine: input.stage === 'live' ? liveLine(input.explanation, input.previousHomeWinProb) : null,
    disclaimer: 'This text explains the stored statistical run; it is not a new forecast.',
  };
}

export function templateNarrative(brief: NarrativeBrief): string {
  const lead =
    brief.stage === 'live'
      ? `Live stored run: ${brief.homeName} ${brief.homeWinPct}%, ${brief.awayName} ${brief.awayWinPct}%.`
      : `Pre-match stored run: ${brief.homeName} ${brief.homeWinPct}%, ${brief.awayName} ${brief.awayWinPct}%.`;
  const confidence = `Model confidence ${brief.confidencePct}% (${brief.calibrationBand} band).`;
  const factorLine =
    brief.factors.length > 0 ? `Main stored factors: ${brief.factors.join('; ')}.` : null;
  return [lead, confidence, factorLine, brief.scoreLine, brief.liveLine, brief.disclaimer]
    .filter(Boolean)
    .join(' ');
}

export function allowedPercentValues(brief: NarrativeBrief): number[] {
  const values = [Number(brief.homeWinPct), Number(brief.awayWinPct), Number(brief.confidencePct)];
  const extras = brief.liveLine?.match(/(\d+(?:\.\d+)?)%/g) ?? [];
  for (const token of extras) values.push(Number(token.slice(0, -1)));
  return values.filter(Number.isFinite);
}

export function narrativePercentsAreAllowed(text: string, allowed: number[]): boolean {
  const mentioned = [...text.matchAll(/(\d+(?:\.\d+)?)%/g)].map((match) => Number(match[1]));
  return mentioned.every((value) =>
    allowed.some((allowedValue) => Math.abs(allowedValue - value) < 0.15),
  );
}

export const OPENCODE_GO_BASE_URL = 'https://opencode.ai/zen/go/v1';
export const OPENCODE_GO_DEFAULT_MODEL = 'glm-5.3-flash';

export type NarrativeProvider = 'template' | 'openai' | 'opencode';

export function resolveNarrativeProvider(env: {
  provider?: string | null;
  openaiKey?: string | null;
  opencodeKey?: string | null;
}): NarrativeProvider {
  const configured = (env.provider ?? '').trim().toLowerCase();
  if (configured === 'template' || configured === 'openai' || configured === 'opencode') {
    return configured;
  }
  if (env.opencodeKey) return 'opencode';
  if (env.openaiKey) return 'openai';
  return 'template';
}

export function llmPrompt(brief: NarrativeBrief): { system: string; user: string } {
  return {
    system:
      'You explain an existing cricket prediction for a UI. You must not invent probabilities, scores, wickets, or player stats. Use only the JSON facts. Mention the home and away win percentages exactly as given. 2-4 short sentences. No markdown.',
    user: JSON.stringify(brief),
  };
}
