/**
 * Normalizers for the extended Sportradar endpoints (reference/statistics data)
 * that the API serves via the read models. Some payloads are deeply nested and
 * stored as-is (timeline, head-to-head, player profile, tournament results);
 * others are reduced into indexed columns for cheap filtering.
 */

/**
 * Normalize the Tour List payload `{ tours: [...] }`.
 */
export function normalizeTours(raw) {
  return (raw?.tours ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category ?? null,
    sport: t.sport ?? null,
  }));
}

/**
 * Normalize the Tournament List payload `{ tournaments: [...] }`.
 */
export function normalizeTournaments(raw) {
  return (raw?.tournaments ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    type: t.type ?? null,
    gender: t.gender ?? null,
    category: t.category ?? null,
    currentSeason: t.current_season ?? null,
    sport: t.sport ?? null,
    tourId: t.tour_id ?? null,
    parentId: t.parent_id ?? null,
  }));
}

/**
 * Normalize a sport_event into the indexed row shape used by
 * sport_event_records. `kind` identifies the collection (daily_schedule,
 * team_results, tournament_results, ...) and `scopeKey` the partition
 * (a date, season/tournament id, or team id). Accepts either a bare
 * sport_event or the `{ sport_event, sport_event_status }` result wrapper.
 */
export function normalizeSportEvent({ kind, scopeKey, sportEvent }) {
  const event = sportEvent?.sport_event ?? sportEvent ?? {};
  const statusBlock =
    sportEvent?.sport_event_status ??
    event.sport_event_status ??
    {};
  const competitors = event.competitors ?? [];
  return {
    kind,
    scopeKey,
    eventId: event?.id,
    status:
      event?.status ??
      statusBlock.status ??
      statusBlock.match_status ??
      null,
    scheduled: event?.scheduled ?? null,
    payload: sportEvent ?? {},
    home: competitors.find((c) => c.qualifier === 'home') ?? null,
    away: competitors.find((c) => c.qualifier === 'away') ?? null,
  };
}

/**
 * Normalize Daily Schedule payload `{ sport_events: [...] }`.
 */
export function normalizeDailySchedule(date, raw) {
  return (raw?.sport_events ?? []).map((se) =>
    normalizeSportEvent({ kind: 'daily_schedule', scopeKey: date, sportEvent: se }),
  );
}

/**
 * Normalize Daily Results payload `{ results: [...] }` where each entry is
 * `{ sport_event, sport_event_status }`.
 */
export function normalizeDailyResults(date, raw) {
  return (raw?.results ?? []).map((r) =>
    normalizeSportEvent({ kind: 'daily_results', scopeKey: date, sportEvent: r }),
  );
}

/**
 * Normalize Team Schedule payload `{ sport_events: [...] }`.
 */
export function normalizeTeamSchedule(teamId, raw) {
  return (raw?.sport_events ?? []).map((se) =>
    normalizeSportEvent({ kind: 'team_schedule', scopeKey: teamId, sportEvent: se }),
  );
}

/**
 * Normalize Team Results payload `{ results: [...] }`.
 */
export function normalizeTeamResults(teamId, raw) {
  return (raw?.results ?? []).map((r) =>
    normalizeSportEvent({ kind: 'team_results', scopeKey: teamId, sportEvent: r }),
  );
}

/**
 * Normalize Tournament Results payload `{ results: [...], tournament }`.
 */
export function normalizeTournamentResults(tournamentOrSeasonId, raw) {
  return {
    tournament: raw?.tournament ?? null,
    rows: (raw?.results ?? []).map((r) =>
      normalizeSportEvent({
        kind: 'tournament_results',
        scopeKey: tournamentOrSeasonId,
        sportEvent: r,
      }),
    ),
  };
}

/**
 * Stable per-event identifier for a Sportradar timeline entry. Prefers the
 * provider's own event id, falling back to the ball-by-ball sequence number.
 * Returns null when no stable identifier is present (entry is kept but never
 * deduplicated).
 */
function timelineEventId(entry) {
  const e = entry && typeof entry === 'object' ? entry : {};
  return e.id ?? e.event_id ?? e.uuid ?? e.sequence ?? null;
}

/** Locate the timeline event array across all accepted payload shapes. */
function timelineEntries(payload) {
  const nested = payload?.sport_event_timeline;
  const arr = payload?.timeline ?? nested?.timeline ?? payload?.sport_event?.timeline;
  return Array.isArray(arr) ? arr : null;
}

/**
 * Dedupe ball-by-ball timeline entries by a stable event identifier
 * (id / sequence), keeping the earliest occurrence so ordering stays intact.
 * Any non-timeline fields of the payload pass through untouched.
 */
export function dedupeTimelineEvents(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const entries = timelineEntries(raw);
  if (!entries || entries.length === 0) return raw;

  const seen = new Set();
  const out = [];
  for (const entry of entries) {
    const id = timelineEventId(entry);
    if (id != null) {
      if (seen.has(String(id))) continue;
      seen.add(String(id));
    }
    out.push(entry);
  }
  if (out.length === entries.length) return raw;

  const copy = { ...raw };
  const nested = raw.sport_event_timeline;
  if (Array.isArray(raw.timeline)) {
    copy.timeline = out;
  } else if (nested && typeof nested === 'object' && Array.isArray(nested.timeline)) {
    copy.sport_event_timeline = { ...nested, timeline: out };
  } else if (
    raw.sport_event &&
    typeof raw.sport_event === 'object' &&
    Array.isArray(raw.sport_event.timeline)
  ) {
    copy.sport_event = { ...raw.sport_event, timeline: out };
  }
  return copy;
}

/**
 * Normalize Match Timeline payload. Timeline and delta share the same shape;
 * both are stored as-is under the match id (deduplicated by event id).
 */
export function normalizeMatchTimeline(matchId, raw) {
  return { matchId, payload: dedupeTimelineEvents(raw) };
}

/**
 * Normalize the Team Versus Team payload. Stored under a deterministic pair key.
 */
export function normalizeHeadToHead(teamAId, teamBId, raw) {
  const [a, b] = [teamAId, teamBId].sort();
  return { teamAId: a, teamBId: b, payload: raw };
}

/**
 * Normalize Team Profile payload into extended team fields + manager.
 */
export function normalizeTeamProfile(teamId, raw) {
  return {
    teamId,
    manager: raw?.manager ?? null,
    teamInfo: raw ?? null,
  };
}

/**
 * Normalize Player Profile payload. Stored as-is under the player id.
 */
export function normalizePlayerProfile(playerId, raw) {
  return { playerId, payload: raw };
}

/**
 * Normalize the Tournament Seasons payload into rows. Accepts either the raw
 * `{ seasons: [...] }` envelope or an already-unwrapped array, since
 * `fetchTournamentSeasons` unwraps the envelope itself.
 */
export function normalizeTournamentSeasons(tournamentId, raw) {
  const seasons = Array.isArray(raw) ? raw : (raw?.seasons ?? []);
  return seasons.map((s) => ({
    id: s.id,
    tournamentId,
    name: s.name ?? null,
    year: s.year ?? null,
    startDate: s.start_date ?? null,
    endDate: s.end_date ?? null,
  }));
}