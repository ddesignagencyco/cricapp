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
 * Normalize Match Timeline payload. Timeline and delta share the same shape;
 * both are stored as-is under the match id.
 */
export function normalizeMatchTimeline(matchId, raw) {
  return { matchId, payload: raw };
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
    teamInfo: raw?.team ?? null,
  };
}

/**
 * Normalize Player Profile payload. Stored as-is under the player id.
 */
export function normalizePlayerProfile(playerId, raw) {
  return { playerId, payload: raw };
}

/**
 * Normalize the Tournament Seasons payload `{ seasons: [...] }` into rows.
 */
export function normalizeTournamentSeasons(tournamentId, raw) {
  return (raw?.seasons ?? []).map((s) => ({
    id: s.id,
    tournamentId,
    name: s.name ?? null,
    year: s.year ?? null,
    startDate: s.start_date ?? null,
    endDate: s.end_date ?? null,
  }));
}