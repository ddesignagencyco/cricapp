/** Decode Sportradar ids from route params (handles legacy %3A links). */
export function normalizeOddsMatchId(raw: string): string {
  const trimmed = raw.trim();
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

/** In-app odds page URL — colons kept readable, same as /matches/{id}. */
export function oddsPageHref(matchId: string): string {
  return `/odds/${normalizeOddsMatchId(matchId)}`;
}
