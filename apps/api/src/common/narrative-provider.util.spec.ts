import { describe, it, expect } from '@jest/globals';
import { resolveNarrativeProvider } from './narrative-provider.util.js';

describe('narrative-provider.util', () => {
  it('prefers OpenCode when key is present and provider is not forced to template', () => {
    expect(
      resolveNarrativeProvider({
        opencodeKey: 'sk-go',
      }),
    ).toBe('opencode');
    expect(resolveNarrativeProvider({ provider: 'template', opencodeKey: 'sk-go' })).toBe(
      'template',
    );
  });
});
