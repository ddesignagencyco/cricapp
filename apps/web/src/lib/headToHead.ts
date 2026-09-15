import type { HeadToHead } from '../types/index';

export type H2HTeam = { id: string; name: string; abbr: string };

export type ParsedMeeting = {
  matchId: string;
  teams: {
    homeId: string;
    homeName: string;
    homeAbbr: string;
    awayId: string;
    awayName: string;
    awayAbbr: string;
  };
  scheduled?: string;
  tournament?: string;
  venue?: string;
  winnerId?: string;
  displayScore?: string;
  resultText?: string;
  status: string;
};

export type H2HTally = {
  aWins: number;
  bWins: number;
  draws: number;
  total: number;
};

function getEventTeams(event: Record<string, unknown>): ParsedMeeting['teams'] {
  const comps = (event?.competitors as Array<Record<string, unknown>> | undefined) || [];
  const home = comps.find((c) => c.qualifier === 'home') || comps[0] || {};
  const away = comps.find((c) => c.qualifier === 'away') || comps[1] || {};
  const homeId = String(home.id || '');
  const awayId = String(away.id || '');
  return {
    homeId,
    homeName: String(home.name || 'TBD'),
    homeAbbr: String(home.abbreviation || homeId.slice(-3) || '??'),
    awayId,
    awayName: String(away.name || 'TBD'),
    awayAbbr: String(away.abbreviation || awayId.slice(-3) || '??'),
  };
}

export function formatH2HDate(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function parseH2H(data: HeadToHead | null): {
  meetings: ParsedMeeting[];
  teamA: H2HTeam;
  teamB: H2HTeam;
} {
  const empty = {
    meetings: [] as ParsedMeeting[],
    teamA: { id: '', name: '', abbr: '' },
    teamB: { id: '', name: '', abbr: '' },
  };
  if (!data || !data.payload) return empty;

  const payload = data.payload as Record<string, unknown>;
  const comps: Array<Record<string, unknown>> = (payload.competitors as Array<Record<string, unknown>>) || [];
  const teamA = comps.find((c) => c.id === data.teamAId) || comps[0] || {};
  const teamB = comps.find((c) => c.id === data.teamBId) || comps[1] || {};

  const meetings: ParsedMeeting[] = [];

  const last = (payload.last_meetings as unknown[]) || [];
  for (const item of last) {
    const row = (item || {}) as Record<string, unknown>;
    const event = (row.sport_event as Record<string, unknown>) || row;
    const statusBlock = (row.sport_event_status as Record<string, unknown>) || {};
    meetings.push({
      matchId: String(event.id || ''),
      teams: getEventTeams(event),
      scheduled: event.scheduled as string | undefined,
      tournament: (event.tournament as { name?: string } | undefined)?.name,
      venue: (event.venue as { name?: string } | undefined)?.name,
      winnerId: statusBlock.winner_id as string | undefined,
      displayScore: statusBlock.display_score as string | undefined,
      resultText: statusBlock.match_result_text as string | undefined,
      status: String(statusBlock.status || event.status || 'closed'),
    });
  }

  const next = (payload.next_meetings as unknown[]) || [];
  for (const item of next) {
    const event = (item || {}) as Record<string, unknown>;
    meetings.push({
      matchId: String(event.id || ''),
      teams: getEventTeams(event),
      scheduled: event.scheduled as string | undefined,
      tournament: (event.tournament as { name?: string } | undefined)?.name,
      venue: (event.venue as { name?: string } | undefined)?.name,
      status: String(event.status || 'not_started'),
    });
  }

  meetings.sort((a, b) => {
    const ta = a.scheduled ? new Date(a.scheduled).getTime() : 0;
    const tb = b.scheduled ? new Date(b.scheduled).getTime() : 0;
    return tb - ta;
  });

  const teamAId = String(teamA.id || data.teamAId || '');
  const teamBId = String(teamB.id || data.teamBId || '');

  return {
    meetings,
    teamA: {
      id: teamAId,
      name: String(teamA.name || 'Team A'),
      abbr: String(teamA.abbreviation || teamAId.slice(-3) || 'A'),
    },
    teamB: {
      id: teamBId,
      name: String(teamB.name || 'Team B'),
      abbr: String(teamB.abbreviation || teamBId.slice(-3) || 'B'),
    },
  };
}

export function isUpcomingMeeting(meeting: ParsedMeeting): boolean {
  return !meeting.status || meeting.status === 'not_started';
}

export function tallyH2H(previous: ParsedMeeting[], teamAId: string, teamBId: string): H2HTally {
  let aWins = 0;
  let bWins = 0;
  let draws = 0;
  previous.forEach((m) => {
    if (!m.winnerId) {
      draws += 1;
    } else if (m.winnerId === teamAId) {
      aWins += 1;
    } else if (m.winnerId === teamBId) {
      bWins += 1;
    } else {
      draws += 1;
    }
  });
  return { aWins, bWins, draws, total: previous.length };
}
