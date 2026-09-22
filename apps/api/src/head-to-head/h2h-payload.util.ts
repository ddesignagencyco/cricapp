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
