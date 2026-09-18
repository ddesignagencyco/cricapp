import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  NARRATIVE_SOURCE,
  OPENCODE_GO_BASE_URL,
  OPENCODE_GO_DEFAULT_MODEL,
  buildNarrativeBrief,
  llmPrompt,
  narrativePercentsAreAllowed,
  allowedPercentValues,
  resolveNarrativeProvider,
  templateNarrative,
  type NarrativeProvider,
  type NarrativeSource,
  type StoredPredictionCopy,
} from './narrative.util.js';

export interface PredictionNarrativeView {
  text: string;
  source: NarrativeSource;
}

@Injectable()
export class PredictionNarrativeService {
  private readonly logger = new Logger(PredictionNarrativeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async forStoredRun(runId: string, stored: StoredPredictionCopy): Promise<PredictionNarrativeView> {
    const existing = await this.prisma.predictionNarrative.findUnique({ where: { runId } });
    if (existing) {
      return { text: existing.text, source: this.asSource(existing.source) };
    }
    const generated = await this.generate(runId, stored);
    try {
      await this.prisma.predictionNarrative.create({
        data: {
          runId,
          text: generated.text,
          source: generated.source,
          model: generated.model ?? null,
        },
      });
      return { text: generated.text, source: generated.source };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const raced = await this.prisma.predictionNarrative.findUnique({ where: { runId } });
        if (raced) return { text: raced.text, source: this.asSource(raced.source) };
      }
      throw err;
    }
  }

  private opencodeKey(): string | undefined {
    return (
      this.config.get<string>('OPENCODE_API_KEY') ||
      this.config.get<string>('OPENCODE_GO_API_KEY') ||
      undefined
    );
  }

  private provider(): NarrativeProvider {
    return resolveNarrativeProvider({
      provider: this.config.get<string>('PREDICTION_NARRATIVE_PROVIDER'),
      openaiKey: this.config.get<string>('OPENAI_API_KEY'),
      opencodeKey: this.opencodeKey(),
    });
  }

  private asSource(value: string): NarrativeSource {
    if (value === NARRATIVE_SOURCE.LLM) return NARRATIVE_SOURCE.LLM;
    return NARRATIVE_SOURCE.TEMPLATE;
  }

  private async generate(
    runId: string,
    stored: StoredPredictionCopy,
  ): Promise<PredictionNarrativeView & { model?: string }> {
    const brief = buildNarrativeBrief(stored);
    const fallback = { text: templateNarrative(brief), source: NARRATIVE_SOURCE.TEMPLATE };
    const provider = this.provider();
    switch (provider) {
      case 'template':
        return fallback;
      case 'openai': {
        const apiKey = this.config.get<string>('OPENAI_API_KEY');
        if (!apiKey) return fallback;
        const llm = await this.generateFromLlm({
          brief,
          apiKey,
          baseUrl: this.config.get<string>('OPENAI_BASE_URL') ?? 'https://api.openai.com/v1',
          model: this.config.get<string>('PREDICTION_NARRATIVE_MODEL') ?? 'gpt-4o-mini',
          sessionId: runId,
        });
        return llm ?? fallback;
      }
      case 'opencode': {
        const apiKey = this.opencodeKey();
        if (!apiKey) return fallback;
        const llm = await this.generateFromLlm({
          brief,
          apiKey,
          baseUrl: this.config.get<string>('OPENCODE_BASE_URL') ?? OPENCODE_GO_BASE_URL,
          model: this.config.get<string>('PREDICTION_NARRATIVE_MODEL') ?? OPENCODE_GO_DEFAULT_MODEL,
          sessionId: `cricapp-prediction-narrative:${runId}`,
        });
        return llm ?? fallback;
      }
      default: {
        const unexpected: never = provider;
        throw new Error(`Unhandled narrative provider: ${String(unexpected)}`);
      }
    }
  }

  private async generateFromLlm(input: {
    brief: ReturnType<typeof buildNarrativeBrief>;
    apiKey: string;
    baseUrl: string;
    model: string;
    sessionId: string;
  }): Promise<(PredictionNarrativeView & { model?: string }) | null> {
    const baseUrl = input.baseUrl.replace(/\/$/, '');
    const { system, user } = llmPrompt(input.brief);
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'CricApp-prediction-narrative/1.0',
          'x-opencode-session': input.sessionId,
        },
        body: JSON.stringify({
          model: input.model,
          temperature: 0.2,
          max_tokens: 220,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) {
        const detail = await response.text();
        this.logger.warn(`Narrative LLM HTTP ${response.status}: ${detail.slice(0, 300)}`);
        return null;
      }
      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = payload.choices?.[0]?.message?.content?.trim();
      if (!text) return null;
      if (!narrativePercentsAreAllowed(text, allowedPercentValues(input.brief))) {
        this.logger.warn('Narrative LLM invented percentages; using template');
        return null;
      }
      return { text, source: NARRATIVE_SOURCE.LLM, model: input.model };
    } catch (err) {
      this.logger.warn(
        `Narrative LLM failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }
}
