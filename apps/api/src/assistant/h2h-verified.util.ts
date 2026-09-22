/** Minimal H2H summary from stored Sportradar payload (aligned with web tally rules). */

export interface H2HVerifiedMeeting {
  matchId: string;
  scheduled: string | null;
  winnerId: string | null;
  displayScore: string | null;
  resultText: string | null;
}

export interface H2HVerifiedSummary {
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  teamAWins: number;
  teamBWins: number;
  draws: number;
  totalMeetings: number;
  recentMeetings: H2HVerifiedMeeting[];
  upcomingCount: number;
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

function parseMeeting(row: unknown): H2HVerifiedMeeting | null {
  if (!row || typeof row !== 'object') return null;
  const record = row as Record<string, unknown>;
  const event = (record.sport_event as Record<string, unknown> | undefined) ?? record;
  const statusBlock =
    (record.sport_event_status as Record<string, unknown> | undefined) ?? {};
  const matchId = String(event.id ?? '');
  if (!matchId) return null;
  const comps = (event.competitors as Array<Record<string, unknown>> | undefined) ?? [];
  const winnerFromComp = comps.find((c) => c.winner === true)?.id;
  const winnerId = String(statusBlock.winner_id ?? winnerFromComp ?? '') || null;
  return {
    matchId,
    scheduled: event.start_time ? String(event.start_time) : null,
    winnerId,
    displayScore: statusBlock.home_score || statusBlock.away_score
      ? `${statusBlock.home_score ?? ''}-${statusBlock.away_score ?? ''}`.replace(/^-|-$/g, '') || null
      : null,
    resultText: statusBlock.match_result_text
      ? String(statusBlock.match_result_text)
      : statusBlock.result
        ? String(statusBlock.result)
        : null,
  };
}

export function summarizeHeadToHeadPayload(
  teamAId: string,
  teamBId: string,
  payload: Record<string, unknown>,
): H2HVerifiedSummary {
  const comps = (payload.competitors as Array<Record<string, unknown>> | undefined) ?? [];
  const teamA = comps.find((c) => c.id === teamAId) ?? comps[0] ?? {};
  const teamB = comps.find((c) => c.id === teamBId) ?? comps[1] ?? {};

  const last = unwrapMeetings(payload.last_meetings)
    .map(parseMeeting)
    .filter((m): m is H2HVerifiedMeeting => m !== null);
  const next = unwrapMeetings(payload.next_meetings);

  let teamAWins = 0;
  let teamBWins = 0;
  let draws = 0;
  for (const m of last) {
    if (!m.winnerId) {
      draws += 1;
    } else if (m.winnerId === teamAId) {
      teamAWins += 1;
    } else if (m.winnerId === teamBId) {
      teamBWins += 1;
    } else {
      draws += 1;
    }
  }

  const recentMeetings = [...last].sort((a, b) => {
    const ta = a.scheduled ? new Date(a.scheduled).getTime() : 0;
    const tb = b.scheduled ? new Date(b.scheduled).getTime() : 0;
    return tb - ta;
  }).slice(0, 5);

  return {
    teamAId,
    teamBId,
    teamAName: String(teamA.name ?? 'Team A'),
    teamBName: String(teamB.name ?? 'Team B'),
    teamAWins,
    teamBWins,
    draws,
    totalMeetings: last.length,
    recentMeetings,
    upcomingCount: next.length,
  };
}
