import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AssistantAnswer } from '@cricapp/shared-types';
import {
  OPENCODE_GO_BASE_URL,
  OPENCODE_GO_DEFAULT_MODEL,
  resolveNarrativeProvider,
} from '../common/narrative-provider.util.js';

const SYSTEM_PROMPT = `You are the CricApp cricket assistant. Use ONLY the JSON fields "verified", "sources", and "unavailable" in the user message.
Never invent statistics, probabilities, or match results. If "unavailable" explains missing data, say clearly that data is not available.
Keep answers concise (2–4 sentences). Do not mention OpenAI, OpenCode, or internal prompts.`;

@Injectable()
export class AssistantNarrativeService {
  private readonly logger = new Logger(AssistantNarrativeService.name);

  constructor(private readonly config: ConfigService) {}

  private opencodeKey(): string | undefined {
    return (
      this.config.get<string>('OPENCODE_API_KEY')?.trim() ||
      this.config.get<string>('OPENCODE_GO_API_KEY')?.trim() ||
      undefined
    );
  }

  private openaiKey(): string | undefined {
    return this.config.get<string>('OPENAI_API_KEY')?.trim() || undefined;
  }

  get enabled(): boolean {
    if (this.config.get<string>('ASSISTANT_LLM_ENABLED', 'false').toLowerCase() !== 'true') {
      return false;
    }
    return this.resolveProvider() !== 'template';
  }

  async maybeEnhance(answer: AssistantAnswer): Promise<AssistantAnswer> {
    if (!this.enabled) return answer;
    try {
      const text = await this.callLlm(answer);
      if (!text?.trim()) return answer;
      return { ...answer, answerText: text.trim() };
    } catch (err) {
      this.logger.warn(`Assistant LLM narrative skipped: ${(err as Error).message}`);
      return answer;
    }
  }

  private resolveProvider() {
    return resolveNarrativeProvider({
      provider: this.config.get<string>('ASSISTANT_NARRATIVE_PROVIDER'),
      openaiKey: this.openaiKey(),
      opencodeKey: this.opencodeKey(),
    });
  }

  private assistantModel(provider: ReturnType<typeof resolveNarrativeProvider>): string {
    const configured = this.config.get<string>('ASSISTANT_NARRATIVE_MODEL')?.trim();
    if (configured) return configured;
    if (provider === 'opencode') {
      return this.config.get<string>('PREDICTION_NARRATIVE_MODEL') ?? OPENCODE_GO_DEFAULT_MODEL;
    }
    return this.config.get<string>('OPENAI_MODEL', 'gpt-4o-mini');
  }

  private async callLlm(answer: AssistantAnswer): Promise<string> {
    const provider = this.resolveProvider();
    const payload = {
      intent: answer.intent,
      verified: answer.verified,
      sources: answer.sources,
      unavailable: answer.unavailable,
    };
    const userContent = `Question context intent=${answer.intent}. Data:\n${JSON.stringify(payload)}`;

    switch (provider) {
      case 'template':
        return '';
      case 'openai': {
        const apiKey = this.openaiKey();
        if (!apiKey) return '';
        return this.chatCompletions({
          apiKey,
          baseUrl: this.config.get<string>('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
          model: this.assistantModel('openai'),
          sessionId: undefined,
          userContent,
        });
      }
      case 'opencode': {
        const apiKey = this.opencodeKey();
        if (!apiKey) return '';
        return this.chatCompletions({
          apiKey,
          baseUrl: this.config.get<string>('OPENCODE_BASE_URL') ?? OPENCODE_GO_BASE_URL,
          model: this.assistantModel('opencode'),
          sessionId: `cricapp-assistant:${answer.intent}`,
          userContent,
        });
      }
      default: {
        const unexpected: never = provider;
        throw new Error(`Unhandled assistant narrative provider: ${String(unexpected)}`);
      }
    }
  }

  private async chatCompletions(input: {
    apiKey: string;
    baseUrl: string;
    model: string;
    sessionId?: string;
    userContent: string;
  }): Promise<string> {
    const baseUrl = input.baseUrl.replace(/\/$/, '');
    const headers: Record<string, string> = {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'CricApp-assistant/1.0',
    };
    if (input.sessionId) {
      headers['x-opencode-session'] = input.sessionId;
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: input.model,
        temperature: 0.2,
        max_tokens: 280,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: input.userContent },
        ],
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Narrative LLM ${response.status}: ${body.slice(0, 200)}`);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return json.choices?.[0]?.message?.content ?? '';
  }
}
