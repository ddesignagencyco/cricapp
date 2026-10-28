/**
 * Match winner resolution shared by ingestion and prediction.
 *
 * Sportradar omits `winner_id` on a large share of finished matches (about 60% of
 * stored results) but still sends `match_result_text`, e.g. "Sydney Sixers won by
 * 15 runs". The winner is then read from that text by matching the competitors'
 * names. The longest matching name wins, so "Pakistan Women won …" never resolves
 * to a "Pakistan" competitor.
 */

/** Competitor list across the payload shapes we store. */
export function competitorsOf(payload) {
  if (!payload || typeof payload !== "object") return [];
  const event = payload.sport_event ?? payload;
  const list = event.competitors ?? payload.competitors;
  return Array.isArray(list) ? list.filter((c) => c && typeof c === "object" && c.id) : [];
}

function normalize(text) {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The competitor id named as the winner in a result line, or null for ties, no
 * results, abandonments and text that names nobody. Matches "<team> won …" and
 * "<team> beat …" at the start of the line, by full name or abbreviation.
 */
export function winnerFromResultText(resultText, competitors) {
  const text = normalize(resultText);
  if (!text || !/\b(won|beat|win)\b/.test(text)) return null;
  if (/\b(tied|no result|abandoned|drawn|draw)\b/.test(text) && !/\bwon\b/.test(text)) return null;
  let best = null;
  for (const c of competitors ?? []) {
    for (const label of [c.name, c.abbreviation]) {
      const name = normalize(label);
      if (!name) continue;
      // The team must be the subject: "<name> won" / "<name> beat" / "<name> (…) won".
      const re = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s*\\([^)]*\\))?\\s+(won|beat|win)\\b`);
      if (re.test(text) && (!best || name.length > best.len)) best = { id: c.id, len: name.length };
    }
  }
  return best?.id ?? null;
}

/** Winner id from a stored payload: `winner_id` when present, else from the result text. */
export function resolveWinnerId(payload) {
  if (!payload || typeof payload !== "object") return null;
  const event = payload.sport_event ?? payload;
  const status = payload.sport_event_status ?? event.sport_event_status ?? {};
  const direct = status.winner_id ?? payload.winner_id ?? event.winner_id ?? null;
  if (direct) return direct;
  const text = status.match_result_text ?? status.result ?? payload.match_result_text ?? null;
  return winnerFromResultText(text, competitorsOf(payload));
}
