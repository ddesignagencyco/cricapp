import type { AssistantIntent } from '@cricapp/shared-types';
import { looksLikePlayerVersusQuery } from './assistant-team-resolve.util.js';

const MATCH_ID_RE = /\bsr:match:[\w-]+\b/i;
const VS_SPLIT_RE = /\s+(?:vs\.?|versus)\s+/i;

export interface ResolvedAssistantIntent {
  intent: AssistantIntent;
  matchId?: string;
  teamAQuery?: string;
  teamBQuery?: string;
  playerAQuery?: string;
  playerBQuery?: string;
  season?: string;
  teamQuery?: string;
  /** Set when the question is out of DB scope (e.g. historical trivia). */
  outOfScopeReason?: string;
}

const SEASON_YEAR_RE = /\b(20(?:2[4-9]|3\d))\b/;

export function detectAssistantIntent(input: {
  question: string;
  intent?: AssistantIntent;
  matchId?: string;
  teamAId?: string;
  teamBId?: string;
  playerAId?: string;
  playerBId?: string;
  season?: string;
  teamId?: string;
  playerId?: string;
}): ResolvedAssistantIntent {
  const season = input.season ?? parseSeasonYearFromQuestion(input.question);

  if (input.intent && input.intent !== 'unknown') {
    return {
      intent: input.intent,
      matchId: input.matchId,
      teamAQuery: input.teamAId,
      teamBQuery: input.teamBId,
      playerAQuery: input.playerId ?? input.playerAId,
      playerBQuery: input.playerBId,
      season,
      teamQuery: input.teamId,
    };
  }

  const q = input.question.trim();
  const lower = q.toLowerCase();
  const matchId = input.matchId ?? MATCH_ID_RE.exec(q)?.[0];

  if (/\bcompare\b/.test(lower) && /\bplayers?\b/.test(lower)) {
    const pair = parseTeamPairFromQuestion(
      q.replace(/\bcompare\s+players?\b/gi, ' ').trim(),
    );
    return {
      intent: 'player_compare',
      playerAQuery: input.playerAId ?? pair?.teamAQuery,
      playerBQuery: input.playerBId ?? pair?.teamBQuery,
      season,
    };
  }

  if (
    matchId &&
    (/\bwhy\b/.test(lower) || /\bchange[ds]?\b/.test(lower) || /\bshift(ed)?\b/.test(lower)) &&
    (/\b(win|probability|prob|chance|odds)\b/.test(lower) || /\bprediction\b/.test(lower))
  ) {
    return { intent: 'live_win_prob_explain', matchId };
  }

  if (
    matchId &&
    (/\bprediction\b/.test(lower) ||
      /\bwin probability\b/.test(lower) ||
      /\bwho will win\b/.test(lower) ||
      /\bwin chance\b/.test(lower))
  ) {
    return { intent: 'match_prediction_summary', matchId };
  }

  if (
    /\bhead[\s-]?to[\s-]?head\b/.test(lower) ||
    /\bh2h\b/.test(lower) ||
    (VS_SPLIT_RE.test(q) && !matchId && !/\bplayers?\b/.test(lower))
  ) {
    const pair = parseTeamPairFromQuestion(q);
    if (pair && looksLikePlayerVersusQuery(pair.teamAQuery, pair.teamBQuery)) {
      return {
        intent: 'player_compare',
        playerAQuery: input.playerAId ?? pair.teamAQuery,
        playerBQuery: input.playerBId ?? pair.teamBQuery,
        season,
      };
    }
    return {
      intent: 'team_head_to_head',
      teamAQuery: input.teamAId ?? pair?.teamAQuery,
      teamBQuery: input.teamBId ?? pair?.teamBQuery,
    };
  }

  if (
    /\brecent form\b/.test(lower) ||
    (/\blast\b/.test(lower) && /\bmatches?\b/.test(lower)) ||
    /\bhow has\s+.+\s+been\b/i.test(q)
  ) {
    return {
      intent: 'player_recent_form',
      season,
      playerAQuery: input.playerId ?? input.playerAId ?? parsePlayerFromRecentFormQuestion(q),
    };
  }

  if (
    /\bqualif(y|ication)\b/.test(lower) ||
    /\bplayoffs?\b/.test(lower) ||
    (/\bstandings\b/.test(lower) && /\bpsl\b/.test(lower)) ||
    (/\bnrr\b/.test(lower) && /\bpsl\b/.test(lower))
  ) {
    return {
      intent: 'standings_qualification',
      season,
      teamQuery: input.teamId ?? parseQualificationTeamQuery(q),
    };
  }

  const outOfScopeReason = detectOutOfScopeReason(q);
  return { intent: 'unknown', season, outOfScopeReason };
}

export function detectOutOfScopeReason(question: string): string | undefined {
  const lower = question.toLowerCase();
  if (/\bworld cup\b/.test(lower) && /\b(19|20)\d{2}\b/.test(lower)) {
    return (
      'Historical World Cup and general trivia are not in our database — ' +
      'I only answer from ingested Sportradar stats (PSL, tours, live matches).'
    );
  }
  if (/\b(19|20)\d{2}\b/.test(lower) && /\b(won|winner|champion)\b/.test(lower) && !/\bpsl\b/.test(lower)) {
    return (
      'Pre-2024 or non-PSL historical results are not stored here. ' +
      'Try PSL standings, head-to-head, player compare, or a specific sr:match id.'
    );
  }
  return undefined;
}

/** True when parsed text looks like a real team name, not "2026 standings" or cutoff phrasing. */
export function isPlausibleQualificationTeamFocus(candidate: string): boolean {
  const t = candidate.replace(/\bpsl\b/gi, '').trim();
  if (!t || t.length > 35) return false;
  const lower = t.toLowerCase();
  if (/^\d{4}(\s|$)/.test(lower)) return false;
  if (/\bstandings\b|\bcutoff\b|\bplayoff spot\b|\btop\s+\d+\b|\bnrr\b|\bpoints table\b/.test(lower)) {
    return false;
  }
  return true;
}

export function parseSeasonYearFromQuestion(question: string): string | undefined {
  return SEASON_YEAR_RE.exec(question)?.[1];
}

export function parsePlayerFromRecentFormQuestion(question: string): string | undefined {
  const patterns = [
    /\brecent form of\s+(.+?)(?:\?|$)/i,
    /\bhow has\s+(.+?)\s+been\b/i,
    /\bhow has\s+(.+?)\s+been in\b/i,
    /^(.+?)\s+recent form\b/i,
    /^(.+?)\s+last\s+\d+\s+matches?\b/i,
    /\bform of\s+(.+?)(?:\?|$)/i,
  ];
  for (const re of patterns) {
    const m = re.exec(question.trim());
    if (m?.[1]) {
      return m[1]
        .replace(/\blast\s+\d+\s+matches?\b/gi, '')
        .replace(/\brecent form\b/gi, '')
        .replace(/\bin\s+psl\b.*$/i, '')
        .replace(/\b20(?:2[4-9]|3\d)\b/g, '')
        .trim();
    }
  }
  return undefined;
}

function scrubQualificationTeamFragment(raw: string): string {
  return raw
    .replace(/\bpsl\b/gi, '')
    .replace(/\bstill\b/gi, '')
    .replace(/\b20(?:2[4-9]|3\d)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseQualificationTeamQuery(question: string): string | undefined {
  const lower = question.toLowerCase();
  if (
    (/\b(cutoff|playoff spot|top\s+\d+)\b/.test(lower) || /\bstandings\b.*\bplayoff/.test(lower)) &&
    !/\bcan\s+\w/.test(lower)
  ) {
    return undefined;
  }

  if (/^\s*can\s+/i.test(question)) {
    const canTeam = /\bcan\s+(.+?)\s+(?:qualif\w*|make\b|reach\b|get into\b)/i.exec(question);
    if (canTeam?.[1]) {
      const team = scrubQualificationTeamFragment(canTeam[1]);
      return isPlausibleQualificationTeamFocus(team) ? team : undefined;
    }
    return undefined;
  }

  const beforePlayoffs = /\b(.+?)\s+playoffs?\b/i.exec(question);
  if (beforePlayoffs?.[1]) {
    const team = scrubQualificationTeamFragment(beforePlayoffs[1]);
    return isPlausibleQualificationTeamFocus(team) ? team : undefined;
  }
  return undefined;
}

export function parseTeamPairFromQuestion(question: string): {
  teamAQuery: string;
  teamBQuery: string;
} | null {
  const withoutH2h = question
    .replace(/\bhead[\s-]?to[\s-]?head\b/gi, ' ')
    .replace(/\bh2h\b/gi, ' ')
    .replace(/\?/g, ' ')
    .trim();
  const parts = withoutH2h.split(VS_SPLIT_RE).map((s) => s.trim()).filter(Boolean);
  if (parts.length !== 2) return null;
  return { teamAQuery: parts[0]!, teamBQuery: parts[1]! };
}
