import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AssistantAnswer } from '@cricapp/shared-types';
import {
  OPENCODE_GO_BASE_URL,
  OPENCODE_GO_DEFAULT_MODEL,
  resolveNarrativeProvider,
} from '../common/narrative-provider.util.js';

const SYSTEM_PROMPT = `You are CricApp's cricket assistant — warm, knowledgeable, and brief, like a friend who knows the stats desk.

Rules:
- Answer the user's actual question in natural spoken English (2–5 sentences).
- Use ONLY numbers and facts from "verified", "templateSummary", and "unavailable". Never invent stats.
- You may rephrase, add a short opener ("Good question —"), and one helpful follow-up line.
- If "unavailable" is non-empty, say honestly what is missing and how to rephrase.
- Do not use markdown headers or JSON. Light emphasis is OK.
- Do not mention OpenAI, OpenCode, APIs, or "verified payload".`;

export interface NarrativeEnhanceResult {
  answer: AssistantAnswer;
  /** True when the LLM replaced answerText for this turn. */
  applied: boolean;
}

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

  async maybeEnhance(answer: AssistantAnswer, userQuestion: string): Promise<NarrativeEnhanceResult> {
    if (!this.enabled) {
      return { answer, applied: false };
    }
    try {
      const text = await this.callLlm(answer, userQuestion);
      if (!text?.trim()) {
        return { answer, applied: false };
      }
      return {
        answer: { ...answer, answerText: text.trim() },
        applied: true,
      };
    } catch (err) {
      this.logger.warn(`Assistant LLM narrative skipped: ${(err as Error).message}`);
      return { answer, applied: false };
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

  private async callLlm(answer: AssistantAnswer, userQuestion: string): Promise<string> {
    const provider = this.resolveProvider();
    const payload = {
      intent: answer.intent,
      verified: answer.verified,
      sources: answer.sources,
      unavailable: answer.unavailable,
      templateSummary: answer.answerText,
    };

    const userContent = [
      `User question: ${userQuestion.trim()}`,
      '',
      'Factual summary our database already produced (keep all numbers consistent with this):',
      answer.answerText,
      '',
      'Structured data (reference only):',
      JSON.stringify(payload),
    ].join('\n');

    const sessionKey = answer.sessionId?.trim() || 'default';

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
          sessionId: `cricapp-assistant:${sessionKey}`,
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
        temperature: 0.45,
        max_tokens: 320,
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
