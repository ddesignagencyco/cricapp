import { describe, it, expect } from '@jest/globals';
import { buildFollowUpPrompts } from './assistant-followups.util.js';

describe('assistant-followups.util', () => {
  it('suggests PSL prompts after player compare', () => {
    const prompts = buildFollowUpPrompts({
      intent: 'player_compare',
      verified: {},
      unavailable: [],
    });
    expect(prompts.length).toBeGreaterThan(0);
    expect(prompts.some((p) => /playoff|H2H|form/i.test(p))).toBe(true);
  });
});
