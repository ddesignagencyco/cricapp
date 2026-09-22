/** Shared LLM narrative routing (predictions + assistant). OpenAI-compatible chat/completions. */

export const OPENCODE_GO_BASE_URL = 'https://opencode.ai/zen/go/v1';
export const OPENCODE_GO_DEFAULT_MODEL = 'glm-5.3-flash';

export type NarrativeProvider = 'template' | 'openai' | 'opencode';

export function resolveNarrativeProvider(env: {
  provider?: string | null;
  openaiKey?: string | null;
  opencodeKey?: string | null;
}): NarrativeProvider {
  const configured = env.provider?.trim().toLowerCase();
  if (configured === 'template' || configured === 'openai' || configured === 'opencode') {
    return configured;
  }
  if (env.opencodeKey) return 'opencode';
  if (env.openaiKey) return 'openai';
  return 'template';
}
