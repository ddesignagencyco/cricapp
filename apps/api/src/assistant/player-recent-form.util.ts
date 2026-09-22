/** Per-match player slices from stored Sportradar match_summary or timeline payloads. */

export interface PlayerBattingSlice {
  runs: number | null;
  balls: number | null;
  fours: number | null;
  sixes: number | null;
  strikeRate: number | null;
  dismissal: string | null;
  notOut: boolean;
}

export interface PlayerBowlingSlice {
  wickets: number | null;
  runsConceded: number | null;
  overs: number | null;
  economy: number | null;
}

export interface PlayerMatchFormRow {
  matchId: string;
  scheduled: string | null;
  tournament: string | null;
  opponentLabel: string | null;
  dataSource: 'match_summary' | 'timeline';
  batting: PlayerBattingSlice | null;
  bowling: PlayerBowlingSlice | null;
}

export interface PlayerRecentFormVerified {
  playerId: string;
  playerName: string;
  matchLimit: number;
  recentMatches: PlayerMatchFormRow[];
  totals: {
    matchesWithData: number;
    runs: number;
    wickets: number;
  };
}

export const RECENT_FORM_DISPLAY_LIMIT = 5;
export const RECENT_FORM_SCAN_LIMIT = 30;

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function formatSportradarName(name: string): string {
  if (name.includes(',')) {
    const [last, first] = name.split(',').map((p) => p.trim());
    if (first && last) return `${first} ${last}`;
  }
  return name;
}

export function playerRecordMatches(
  record: Record<string, unknown>,
  playerId: string,
  playerName: string,
): boolean {
  const id = String(record.id ?? record.player_id ?? '');
  if (id && id === playerId) return true;
  const name = String(record.name ?? record.full_name ?? record.short_name ?? '');
  if (!name) return false;
  return normalizeName(formatSportradarName(name)) === normalizeName(playerName);
}

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  return null;
}

function battingSlice(record: Record<string, unknown>): PlayerBattingSlice {
  const runs = num(record.runs ?? record.runs_scored);
  const balls = num(record.balls ?? record.balls_faced);
  const dismissal = record.dismissal ?? record.out_description ?? record.how_out;
  const dismissed = dismissal != null && String(dismissal).toLowerCase() !== 'not out';
  return {
    runs,
    balls,
    fours: num(record.fours ?? record.four_x),
    sixes: num(record.sixes ?? record.six_x),
    strikeRate: num(record.strike_rate ?? record.strikeRate),
    dismissal: dismissal != null ? String(dismissal) : null,
    notOut: !dismissed,
  };
}

function bowlingSlice(record: Record<string, unknown>): PlayerBowlingSlice {
  return {
    wickets: num(record.wickets ?? record.wickets_taken),
    runsConceded: num(record.runs_conceded ?? record.conceded),
    overs: num(record.overs ?? record.overs_bowled),
    economy: num(record.economy ?? record.economy_rate),
  };
}

function sidePlayers(side: unknown): Record<string, unknown>[] {
  if (!side || typeof side !== 'object') return [];
  const obj = side as Record<string, unknown>;
  const players = obj.players;
  return Array.isArray(players) ? players.filter((p): p is Record<string, unknown> => !!p && typeof p === 'object') : [];
}

export function extractPlayerStatsFromMatchSummary(
  payload: Record<string, unknown>,
  playerId: string,
  playerName: string,
): { batting: PlayerBattingSlice | null; bowling: PlayerBowlingSlice | null } {
  const stats = payload.statistics as Record<string, unknown> | undefined;
  const innings = (stats?.innings as unknown[]) ?? [];
  let batting: PlayerBattingSlice | null = null;
  let bowling: PlayerBowlingSlice | null = null;

  for (const inn of innings) {
    if (!inn || typeof inn !== 'object') continue;
    const teams = ((inn as Record<string, unknown>).teams as unknown[]) ?? [];
    for (const team of teams) {
      if (!team || typeof team !== 'object') continue;
      const teamStats = (team as Record<string, unknown>).statistics as Record<string, unknown> | undefined;
      if (!teamStats) continue;
      const batHit = sidePlayers(teamStats.batting).find((p) => playerRecordMatches(p, playerId, playerName));
      const bowlHit = sidePlayers(teamStats.bowling).find((p) => playerRecordMatches(p, playerId, playerName));
      if (batHit) {
        batting = battingSlice(batHit);
      }
      if (bowlHit) {
        bowling = bowlingSlice(bowlHit);
      }
    }
  }

  return { batting, bowling };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function pickPlayerRef(value: unknown): { id?: string; name?: string } | null {
  if (typeof value === 'string') return { name: formatSportradarName(value) };
  const rec = asRecord(value);
  if (!rec) return null;
  const name = rec.name ?? rec.full_name ?? rec.short_name;
  return {
    id: rec.id != null ? String(rec.id) : undefined,
    name: typeof name === 'string' ? formatSportradarName(name) : undefined,
  };
}

function refMatches(ref: { id?: string; name?: string } | null, playerId: string, playerName: string): boolean {
  if (!ref) return false;
  if (ref.id && ref.id === playerId) return true;
  if (ref.name && normalizeName(ref.name) === normalizeName(playerName)) return true;
  return false;
}

function timelineEntries(payload: Record<string, unknown>): Record<string, unknown>[] {
  const nested = asRecord(payload.sport_event_timeline);
  const lists = [
    payload.timeline,
    nested?.timeline,
    asRecord(payload.sport_event)?.timeline,
  ];
  const raw = lists.find((item) => Array.isArray(item) && item.length) as unknown[] | undefined;
  if (!raw) return [];
  return raw.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
}

function isDeliveryEvent(rec: Record<string, unknown>): boolean {
  const type = String(rec.type ?? rec.event_type ?? '').toLowerCase();
  if (type === 'period_start' || type === 'period_end' || type === 'match_started' || type === 'match_ended') {
    return false;
  }
  return Boolean(rec.over_number ?? rec.over ?? rec.ball_number ?? rec.ball) || /ball|wicket|boundary|four|six/.test(type);
}

export function aggregatePlayerStatsFromTimeline(
  payload: Record<string, unknown>,
  playerId: string,
  playerName: string,
): { batting: PlayerBattingSlice | null; bowling: PlayerBowlingSlice | null } {
  let runs = 0;
  let balls = 0;
  let fours = 0;
  let sixes = 0;
  let wickets = 0;
  let runsConceded = 0;
  let legalDeliveries = 0;
  let batted = false;
  let bowled = false;
  let dismissed = false;
  let dismissalText: string | null = null;

  for (const rec of timelineEntries(payload)) {
    if (!isDeliveryEvent(rec)) continue;
    const batting = asRecord(rec.batting_params);
    const bowling = asRecord(rec.bowling_params);
    const dismissal = asRecord(rec.dismissal_params);
    const striker = pickPlayerRef(batting?.striker ?? rec.batsman ?? rec.striker);
    const bowler = pickPlayerRef(bowling?.bowler ?? rec.bowler);
    const eventRuns = num(batting?.runs_scored ?? rec.runs ?? batting?.runs) ?? 0;

    if (refMatches(striker, playerId, playerName)) {
      batted = true;
      runs += eventRuns;
      balls += 1;
      const type = String(rec.type ?? '').toLowerCase();
      if (eventRuns === 4 || type.includes('four') || type === 'boundary') fours += 1;
      if (eventRuns === 6 || type.includes('six')) sixes += 1;
    }

    if (refMatches(bowler, playerId, playerName)) {
      bowled = true;
      runsConceded += eventRuns;
      legalDeliveries += 1;
    }

    const dismissedPlayer = pickPlayerRef(dismissal?.player);
    if (refMatches(dismissedPlayer, playerId, playerName)) {
      dismissed = true;
      const details = asRecord(dismissal?.dismissal_details);
      dismissalText = details?.type != null ? String(details.type) : 'out';
    }

    const type = String(rec.type ?? '').toLowerCase();
    if (type.includes('wicket') && refMatches(bowler, playerId, playerName)) {
      wickets += 1;
    }
  }

  const batting: PlayerBattingSlice | null = batted
    ? {
        runs,
        balls,
        fours: fours || null,
        sixes: sixes || null,
        strikeRate: balls > 0 ? Math.round((runs / balls) * 1000) / 10 : null,
        dismissal: dismissed ? dismissalText : null,
        notOut: !dismissed,
      }
    : null;

  const overs = legalDeliveries > 0 ? Math.round((legalDeliveries / 6) * 10) / 10 : null;
  const bowling: PlayerBowlingSlice | null = bowled
    ? {
        wickets: wickets || null,
        runsConceded: runsConceded || null,
        overs,
        economy:
          overs && overs > 0 && runsConceded > 0 ? Math.round((runsConceded / overs) * 100) / 100 : null,
      }
    : null;

  return { batting, bowling };
}

export function buildRecentFormVerified(input: {
  playerId: string;
  playerName: string;
  rows: PlayerMatchFormRow[];
  matchLimit: number;
}): PlayerRecentFormVerified {
  const recentMatches = input.rows.slice(0, input.matchLimit);
  let runs = 0;
  let wickets = 0;
  for (const row of recentMatches) {
    if (row.batting?.runs != null) runs += row.batting.runs;
    if (row.bowling?.wickets != null) wickets += row.bowling.wickets;
  }
  return {
    playerId: input.playerId,
    playerName: input.playerName,
    matchLimit: input.matchLimit,
    recentMatches,
    totals: {
      matchesWithData: recentMatches.length,
      runs,
      wickets,
    },
  };
}

export interface RecentMatchCandidate {
  matchId: string;
  scheduled: string | null;
  tournament: string | null;
  teamNames: string[];
  teamAbbrs: string[];
  playerTeamAbbr: string | null;
}

export function opponentLabelFromMatch(
  teamNames: string[],
  teamAbbrs: string[],
  playerTeamAbbr: string | null,
): string | null {
  if (!playerTeamAbbr || teamAbbrs.length < 2) {
    return teamNames.find((n) => n) ?? null;
  }
  const idx = teamAbbrs.findIndex((a) => a === playerTeamAbbr);
  if (idx === 0) return teamNames[1] ?? teamAbbrs[1] ?? null;
  if (idx === 1) return teamNames[0] ?? teamAbbrs[0] ?? null;
  return teamNames.join(' vs ');
}

export function sortRecentMatchCandidates(rows: RecentMatchCandidate[]): RecentMatchCandidate[] {
  return [...rows].sort((a, b) => {
    const ta = a.scheduled ? Date.parse(a.scheduled) : 0;
    const tb = b.scheduled ? Date.parse(b.scheduled) : 0;
    if (tb !== ta) return tb - ta;
    return b.matchId.localeCompare(a.matchId);
  });
}
