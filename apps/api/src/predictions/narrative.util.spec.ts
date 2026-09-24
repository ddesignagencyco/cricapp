import { describe, expect, it } from '@jest/globals';
import {
  allowedPercentValues,
  buildNarrativeBrief,
  formatPct,
  narrativePercentsAreAllowed,
  resolveNarrativeProvider,
  templateNarrative,
} from './narrative.util.js';

describe('narrative.util', () => {
  const stored = {
    stage: 'pre_match',
    homeWinProb: 0.62,
    awayWinProb: 0.38,
    confidence: 0.7,
    calibrationBand: 'medium',
    explanation: {
      factorAttributions: [
        { factor: 'form', contribution: 0.2 },
        { factor: 'table', contribution: -0.1 },
      ],
      tossAdjusted: true,
    },
    scoreRange: { type: 'first_innings', low: 145, expected: 160, high: 175 },
    snapshot: { homeName: 'Lahore Qalandars', awayName: 'Karachi Kings' },
  };

  it('formats stored probabilities for copy', () => {
    expect(formatPct(0.62)).toBe('62');
    expect(formatPct(0.625)).toBe('62.5');
  });

  it('builds template copy from the stored run only', () => {
    const brief = buildNarrativeBrief(stored);
    const text = templateNarrative(brief);
    expect(text).toContain('Lahore Qalandars 62%');
    expect(text).toContain('Karachi Kings 38%');
    expect(text).toContain('form (favours home)');
    expect(text).toContain('not a new forecast');
  });

  it('rejects LLM copy that invents a percentage', () => {
    const brief = buildNarrativeBrief(stored);
    const allowed = allowedPercentValues(brief);
    expect(narrativePercentsAreAllowed('Home 62%, away 38%.', allowed)).toBe(true);
    expect(narrativePercentsAreAllowed('Home are 91% likely.', allowed)).toBe(false);
  });

  it('prefers OpenCode Go when an OpenCode API key is present', () => {
    expect(
      resolveNarrativeProvider({
        opencodeKey: 'sk-go',
        openaiKey: 'sk-openai',
      }),
    ).toBe('opencode');
    expect(resolveNarrativeProvider({ provider: 'template', opencodeKey: 'sk-go' })).toBe(
      'template',
    );
  });
});
