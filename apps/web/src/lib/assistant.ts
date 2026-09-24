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
  starters: Array<{ label: string; question: string; intent?: AssistantIntent }>;
};

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
        { label: 'Win probability', question: 'Latest win probability for this match', intent: 'match_prediction_summary' },
        { label: 'Why it moved', question: 'Why did the win probability change for this match?', intent: 'live_win_prob_explain' },
      ],
    };
  }

  if (matchId) {
    return {
      slots: { matchId },
      starters: [
        { label: 'Who is favoured?', question: 'Latest win probability for this match' },
        { label: 'Explain the live %', question: 'Why did the win probability change for this match?' },
      ],
    };
  }

  if (playerId) {
    return {
      slots: { playerId, season: season || '2026' },
      starters: [
        { label: 'Recent form', question: 'How has this player been in PSL 2026?', intent: 'player_recent_form' },
        { label: 'PSL cutoff', question: 'What is the PSL 2026 playoff cutoff?', intent: 'standings_qualification' },
      ],
    };
  }

  if (teamAId && teamBId) {
    return {
      slots: { teamAId, teamBId, intent: 'team_head_to_head' },
      starters: [
        { label: 'Head to head', question: 'What is the head to head between these two teams?', intent: 'team_head_to_head' },
      ],
    };
  }

  if (teamId) {
    return {
      slots: { teamId, season: season || '2026' },
      starters: [
        { label: 'Can they qualify?', question: 'Can this team make the PSL 2026 playoffs?', intent: 'standings_qualification' },
        { label: 'Playoff cutoff', question: 'What is the PSL 2026 playoff cutoff?', intent: 'standings_qualification' },
      ],
    };
  }

  if (onPsl) {
    return {
      slots: { season: season || '2026' },
      starters: [
        { label: 'Playoff cutoff', question: 'What is the PSL 2026 playoff cutoff?' },
        { label: 'Babar vs Rizwan', question: 'Compare players Babar Azam vs Mohammad Rizwan' },
        { label: 'Lahore vs Karachi', question: 'Lahore Qalandars vs Karachi Kings head to head' },
      ],
    };
  }

  return {
    slots: {},
    starters: [
      { label: 'PSL cutoff', question: 'What is the PSL 2026 playoff cutoff?' },
      { label: 'Babar vs Rizwan', question: 'Compare players Babar Azam vs Mohammad Rizwan' },
      { label: 'Lahore vs Karachi', question: 'Lahore Qalandars vs Karachi Kings head to head' },
    ],
  };
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
