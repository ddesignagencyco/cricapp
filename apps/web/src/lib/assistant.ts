import type { AssistantAskBody, AssistantIntent, AssistantSource } from '../services/assistant';
import { decodeEntityId, encodeEntityId } from '../utils/entityId';

const SESSION_KEY = 'pcz-assistant-session';

export function assistantSessionId(): string {
  if (typeof window === 'undefined') return '';
  const existing = window.sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  window.sessionStorage.setItem(SESSION_KEY, id);
  return id;
}

export function sourceHref(source: AssistantSource): string | null {
  switch (source.type) {
    case 'match': {
      const id = source.matchId || source.id;
      return id ? `/matches/${encodeEntityId(id)}` : null;
    }
    case 'team':
      return source.id ? `/teams/${encodeEntityId(source.id)}` : null;
    case 'player':
      return source.id ? `/players/${encodeEntityId(source.id)}` : null;
    case 'head_to_head': {
      if (!source.teamAId || !source.teamBId) return '/teams';
      return `/teams?a=${encodeEntityId(source.teamAId)}&b=${encodeEntityId(source.teamBId)}`;
    }
    case 'prediction_run': {
      const id = source.matchId || source.id;
      return id ? `/predictions/${encodeEntityId(id)}` : '/predictions';
    }
    case 'psl_standings':
      return source.id ? `/psl?season=${encodeURIComponent(source.id)}` : '/psl';
    default: {
      const _never: never = source.type;
      return _never;
    }
  }
}

export function sourceChipLabel(source: AssistantSource): string {
  switch (source.type) {
    case 'match':
      return 'Match';
    case 'team':
      return 'Team';
    case 'player':
      return 'Player';
    case 'head_to_head':
      return 'Head to head';
    case 'prediction_run':
      return 'Prediction';
    case 'psl_standings':
      return /^\d{4}$/.test(String(source.id || '')) ? `PSL ${source.id}` : 'PSL standings';
    default: {
      const _never: never = source.type;
      return _never;
    }
  }
}

export type AssistantPageContext = {
  slots: Omit<AssistantAskBody, 'question' | 'sessionId'>;
  starters: AssistantStarter[];
};

/**
 * A suggested question.
 *
 * There is deliberately no separate `label`: the chip renders the question
 * itself. A short label like "Explain the live %" hides the phrasing that makes
 * the answer work, which is the whole point of showing an example. The questions
 * are written to read as questions a person would actually type.
 */
export type AssistantStarter = {
  question: string;
  intent?: AssistantIntent;
};

/**
 * Every starter here maps to an intent the API classifies today. A chip that
 * silently falls through to "could not classify" is worse than no chip at all,
 * so the list is deliberately restricted to the six supported intents.
 */
const GLOBAL_STARTERS: AssistantStarter[] = [
  { question: 'What is the PSL 2026 playoff cutoff?' },
  { question: 'Lahore Qalandars vs Karachi Kings head to head?', intent: 'team_head_to_head' },
  { question: 'Compare players Babar Azam vs Mohammad Rizwan?', intent: 'player_compare' },
  { question: 'How has Babar Azam been in PSL 2026?', intent: 'player_recent_form' },
];

function pathId(pathname: string, prefix: string): string {
  if (!pathname.startsWith(prefix) || pathname === prefix.slice(0, -1)) return '';
  const rest = pathname.slice(prefix.length);
  const id = rest.split('/')[0] || '';
  return decodeEntityId(decodeURIComponent(id));
}

export function assistantContextFromLocation(pathname: string, search = ''): AssistantPageContext {
  const query = new URLSearchParams(search);
  const matchId = pathId(pathname, '/matches/') || pathId(pathname, '/predictions/');
  const playerId = pathId(pathname, '/players/');
  const teamId = pathId(pathname, '/teams/');
  const season = query.get('season') || '';
  const teamAId = decodeEntityId(query.get('a'));
  const teamBId = decodeEntityId(query.get('b'));
  const onPsl = pathname === '/psl' || pathname.startsWith('/psl/');

  if (matchId && pathname.startsWith('/predictions/')) {
    return {
      slots: { matchId, intent: 'match_prediction_summary' },
      starters: [
        { question: 'What is the latest win probability for this match?', intent: 'match_prediction_summary' },
        { question: 'Why did the win probability change for this match?', intent: 'live_win_prob_explain' },
      ],
    };
  }

  if (matchId) {
    return {
      slots: { matchId },
      // Only the two intents a match id can actually answer. Anything needing two
      // named teams would classify as "unknown" here, because this page supplies
      // no team names.
      starters: [
        { question: 'What is the latest win probability for this match?' },
        { question: 'Why did the win probability change for this match?' },
      ],
    };
  }

  if (playerId) {
    return {
      slots: { playerId, season: season || '2026' },
      starters: [
        { question: 'How has this player been in PSL 2026?', intent: 'player_recent_form' },
        { question: 'Compare this player vs Mohammad Rizwan?', intent: 'player_compare' },
        { question: 'What is the PSL 2026 playoff cutoff?', intent: 'standings_qualification' },
      ],
    };
  }

  if (teamAId && teamBId) {
    return {
      slots: { teamAId, teamBId, intent: 'team_head_to_head' },
      starters: [
        { question: 'What is the head to head between these two teams?', intent: 'team_head_to_head' },
        { question: 'What is the PSL 2026 playoff cutoff?', intent: 'standings_qualification' },
      ],
    };
  }

  if (teamId) {
    return {
      slots: { teamId, season: season || '2026' },
      starters: [
        { question: 'Can this team make the PSL 2026 playoffs?', intent: 'standings_qualification' },
        { question: 'What is the PSL 2026 playoff cutoff?', intent: 'standings_qualification' },
        { question: 'Compare players Babar Azam vs Mohammad Rizwan?', intent: 'player_compare' },
      ],
    };
  }

  if (onPsl) {
    return {
      slots: { season: season || '2026' },
      starters: [
        { question: 'What is the PSL 2026 playoff cutoff?' },
        { question: 'What is the PSL 2026 standings and playoff cutoff?', intent: 'standings_qualification' },
        { question: 'Lahore Qalandars vs Karachi Kings head to head?', intent: 'team_head_to_head' },
      ],
    };
  }

  if (pathname === '/news' || pathname.startsWith('/news/')) {
    return {
      slots: {},
      starters: [
        { question: 'Compare players Babar Azam vs Mohammad Rizwan?', intent: 'player_compare' },
        { question: 'Lahore Qalandars vs Karachi Kings head to head?', intent: 'team_head_to_head' },
        { question: 'What is the PSL 2026 playoff cutoff?' },
      ],
    };
  }

  if (pathname === '/tools' || pathname.startsWith('/tools/')) {
    return {
      slots: {},
      starters: [
        { question: 'What is the PSL 2026 playoff cutoff?' },
        { question: 'How has Babar Azam been in PSL 2026?', intent: 'player_recent_form' },
      ],
    };
  }

  return { slots: {}, starters: GLOBAL_STARTERS };
}

const GREETING_RE = /^(hi|hello|hey|yo|salaam|salam|thanks|thank you|ok|okay|bye)[\s!.]*$/i;

export function localAssistantReply(raw: string): string | null {
  if (!GREETING_RE.test(raw.trim())) return null;
  return 'Hi — I only answer from stored stats. Try Lahore vs Karachi, or Compare players Babar Azam vs Mohammad Rizwan.';
}

/** Light cleanup only. The API now classifies player vs team `vs` itself. */
export function normalizeAssistantQuestion(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s+(?:bs|v\/s|verses)\s+/i, ' vs ');
}

export function assistantRequestSlots(
  slots: Omit<AssistantAskBody, 'question' | 'sessionId'>,
  extra: Pick<AssistantAskBody, 'intent'> | undefined,
  question: string,
): Omit<AssistantAskBody, 'question' | 'sessionId'> {
  const lower = question.toLowerCase();
  const namesTwoSides = /\s+(?:vs\.?|versus)\s+/i.test(question);
  const aboutPlayers = /\bcompare\b/.test(lower) && /\bplayers?\b/.test(lower);
  const aboutTeams =
    !aboutPlayers && (/\bhead[\s-]*to[\s-]*head\b/.test(lower) || /\bh2h\b/.test(lower));
  const aboutThisMatch =
    /\bthis match\b/.test(lower) || /\bwin probability\b/.test(lower) || /\bprediction\b/.test(lower);
  const aboutThisPlayer = /\bthis player\b/.test(lower) || /\brecent form\b/.test(lower) || /\bhow has\b/.test(lower);
  const aboutCutoff =
    /\bplayoff/.test(lower) || /\bcutoff\b/.test(lower) || /\bstandings\b/.test(lower) || /\bqualif/.test(lower);

  const out: Omit<AssistantAskBody, 'question' | 'sessionId'> = {};
  if (aboutThisMatch && slots.matchId) out.matchId = slots.matchId;
  if (aboutThisPlayer && slots.playerId) out.playerId = slots.playerId;
  if (aboutCutoff && slots.teamId) out.teamId = slots.teamId;
  if ((aboutCutoff || aboutThisPlayer) && slots.season) out.season = slots.season;
  if (aboutTeams && !namesTwoSides && slots.teamAId && slots.teamBId) {
    out.teamAId = slots.teamAId;
    out.teamBId = slots.teamBId;
  }

  const intent = extra?.intent;
  if (!intent || intent === 'unknown') return out;

  const keep =
    (intent === 'team_head_to_head' && Boolean(out.teamAId && out.teamBId)) ||
    (intent === 'player_recent_form' && Boolean(out.playerId)) ||
    ((intent === 'match_prediction_summary' || intent === 'live_win_prob_explain') && Boolean(out.matchId)) ||
    intent === 'standings_qualification';
  if (keep) out.intent = intent;
  return out;
}

export function isScopeUnavailable(field: string): boolean {
  return field === 'scope';
}

/**
 * Plain-text version of one answer, for the copy button. Includes the source
 * links so a pasted answer keeps its provenance.
 */
export function assistantClipboardText(input: {
  question?: string;
  answerText: string;
  sources: AssistantSource[];
}): string {
  const lines: string[] = [];
  if (input.question) lines.push(`Q: ${input.question}`);
  lines.push(`A: ${input.answerText.trim()}`);

  const links = input.sources
    .map((source) => {
      const href = sourceHref(source);
      return href ? `${sourceChipLabel(source)}: ${typeof window === 'undefined' ? href : new URL(href, window.location.origin).toString()}` : null;
    })
    .filter((line): line is string => Boolean(line));

  if (links.length) lines.push('', 'Sources:', ...links);
  return lines.join('\n');
}

/**
 * Copy to clipboard with a graceful fallback. `navigator.clipboard` is missing
 * on http origins and in older browsers, so the legacy path stays available.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the textarea path below.
  }

  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
