import { Injectable } from '@nestjs/common';
import type { AssistantAnswer } from '@cricapp/shared-types';
import { AssistantNarrativeService } from './assistant-narrative.service.js';
import { AssistantQueryService } from './assistant-query.service.js';
import { detectAssistantIntent } from './assistant-intent.util.js';
import type { AssistantAskDto } from './dto/assistant-ask.dto.js';

@Injectable()
export class AssistantService {
  constructor(
    private readonly query: AssistantQueryService,
    private readonly narrative: AssistantNarrativeService,
  ) {}

  async ask(dto: AssistantAskDto): Promise<AssistantAnswer & { llmNarrative: boolean }> {
    const resolved = detectAssistantIntent({
      question: dto.question,
      intent: dto.intent,
      matchId: dto.matchId,
      teamAId: dto.teamAId,
      teamBId: dto.teamBId,
      playerAId: dto.playerAId,
      playerBId: dto.playerBId,
      playerId: dto.playerId,
      season: dto.season,
      teamId: dto.teamId,
    });

    let answer = await this.query.buildAnswer(resolved);
    if (dto.sessionId) {
      answer = { ...answer, sessionId: dto.sessionId };
    }

    const llmNarrative = this.narrative.enabled;
    answer = await this.narrative.maybeEnhance(answer);

    return { ...answer, llmNarrative };
  }
}
