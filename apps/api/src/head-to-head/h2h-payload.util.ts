/**
 * Sportradar team-versus-team responses nest meetings under objects such as
 * `{ last_meetings: { results: [...] } }`. The web client expects arrays.
 */
export function normalizeHeadToHeadPayload(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...raw,
    last_meetings: unwrapMeetings(raw.last_meetings),
    next_meetings: unwrapMeetings(raw.next_meetings),
  };
}

function unwrapMeetings(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const key of ['results', 'sport_events', 'meetings']) {
      const nested = obj[key];
      if (Array.isArray(nested)) return nested;
    }
  }
  return [];
}

const norm = (v: unknown): string =>
  String(v ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9()& ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * The competitor named as the winner in a result line ("Alpha Kings won by 10 runs"), or
 * undefined for ties, no results and abandonments. Same rule as `winnerFromResultText` in
 * packages/shared-types (the team must be the subject of "won" / "beat"); kept here because
 * Jest cannot load that package's re-exports, which would leave this untestable.
 */
export function winnerIdFromResultText(
  resultText: unknown,
  competitors: Array<{ id?: unknown; name?: unknown; abbreviation?: unknown }>,
): string | undefined {
  const text = norm(resultText);
  if (!text || !/\b(won|beat|win)\b/.test(text)) return undefined;
  if (/\b(tied|no result|abandoned|drawn|draw)\b/.test(text) && !/\bwon\b/.test(text)) return undefined;
  let best: { id: string; len: number } | null = null;
  for (const c of competitors) {
    for (const label of [c.name, c.abbreviation]) {
      const name = norm(label);
      if (!name) continue;
      const re = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s*\\([^)]*\\))?\\s+(won|beat|win)\\b`);
      if (re.test(text) && (!best || name.length > best.len)) best = { id: String(c.id), len: name.length };
    }
  }
  return best?.id;
}
