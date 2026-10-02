import { parseH2H, formatH2HDate, isUpcomingMeeting, tallyH2H } from '../lib/headToHead';

const competitors = [
  { id: 'sr:competitor:1', name: 'Lahore', abbreviation: 'LHR' },
  { id: 'sr:competitor:2', name: 'Islamabad', abbreviation: 'ISB' },
];

function closedMeeting(id: string, winnerId: string, scheduled: string) {
  return {
    sport_event: {
      id,
      scheduled,
      competitors,
      tournament: { name: 'PSL' },
      venue: { name: 'Gaddafi Stadium' },
    },
    sport_event_status: {
      winner_id: winnerId,
      display_score: '180/3 vs 150/6',
      match_result_text: 'Lahore won by 30 runs',
      status: 'closed',
    },
  };
}

describe('parseH2H', () => {
  it('returns empty teams and no meetings for null data', () => {
    expect(parseH2H(null)).toEqual({
      meetings: [],
      teamA: { id: '', name: '', abbr: '' },
      teamB: { id: '', name: '', abbr: '' },
    });
  });

  it('returns the empty shape when the payload is missing', () => {
    expect(parseH2H({ teamAId: 'a', teamBId: 'b' } as never).meetings).toEqual([]);
  });

  it('resolves the two named teams from the competitor list', () => {
    const out = parseH2H({
      teamAId: 'sr:competitor:1',
      teamBId: 'sr:competitor:2',
      payload: { competitors },
    } as never);
    expect(out.teamA).toEqual({ id: 'sr:competitor:1', name: 'Lahore', abbr: 'LHR' });
    expect(out.teamB).toEqual({ id: 'sr:competitor:2', name: 'Islamabad', abbr: 'ISB' });
  });

  it('parses a closed meeting with its result and venue', () => {
    const out = parseH2H({
      teamAId: 'sr:competitor:1',
      teamBId: 'sr:competitor:2',
      payload: {
        competitors,
        last_meetings: [closedMeeting('e1', 'sr:competitor:1', '2026-02-01T10:00:00Z')],
      },
    } as never);

    expect(out.meetings).toHaveLength(1);
    expect(out.meetings[0]).toMatchObject({
      matchId: 'e1',
      tournament: 'PSL',
      venue: 'Gaddafi Stadium',
      winnerId: 'sr:competitor:1',
      displayScore: '180/3 vs 150/6',
      resultText: 'Lahore won by 30 runs',
      status: 'closed',
    });
  });

  it('separates the home and away competitors by qualifier', () => {
    const event = {
      sport_event: {
        id: 'e2',
        competitors: [
          { id: 'x', name: 'Away Team', qualifier: 'away' },
          { id: 'y', name: 'Home Team', qualifier: 'home' },
        ],
      },
      sport_event_status: { status: 'closed' },
    };
    const out = parseH2H({ teamAId: 'a', teamBId: 'b', payload: { competitors, last_meetings: [event] } } as never);
    expect(out.meetings[0].teams).toMatchObject({ homeId: 'y', homeName: 'Home Team', awayId: 'x', awayName: 'Away Team' });
  });

  it('falls back to the last three characters of the id for an abbreviation', () => {
    const event = {
      sport_event: { id: 'e3', competitors: [{ id: 'sr:competitor:999', name: 'Nine Nine Nine' }] },
    };
    const out = parseH2H({ teamAId: 'a', teamBId: 'b', payload: { competitors, last_meetings: [event] } } as never);
    expect(out.meetings[0].teams.homeAbbr).toBe('999');
  });

  it('parses an upcoming meeting with no result block', () => {
    const out = parseH2H({
      teamAId: 'sr:competitor:1',
      teamBId: 'sr:competitor:2',
      payload: {
        competitors,
        next_meetings: [{ id: 'e4', scheduled: '2026-06-01T10:00:00Z', competitors, status: 'not_started' }],
      },
    } as never);
    expect(out.meetings[0]).toMatchObject({ matchId: 'e4', status: 'not_started' });
    expect(out.meetings[0].winnerId).toBeUndefined();
  });

  it('defaults a next meeting with no status to not_started', () => {
    const out = parseH2H({
      teamAId: 'a',
      teamBId: 'b',
      payload: { competitors, next_meetings: [{ id: 'e5', competitors }] },
    } as never);
    expect(out.meetings[0].status).toBe('not_started');
  });

  it('sorts meetings newest first', () => {
    const out = parseH2H({
      teamAId: 'a',
      teamBId: 'b',
      payload: {
        competitors,
        last_meetings: [
          closedMeeting('old', 'sr:competitor:1', '2024-01-01T00:00:00Z'),
          closedMeeting('new', 'sr:competitor:2', '2026-01-01T00:00:00Z'),
        ],
      },
    } as never);
    expect(out.meetings.map((m) => m.matchId)).toEqual(['new', 'old']);
  });

  it('accepts a meeting row that is not nested under sport_event', () => {
    const out = parseH2H({
      teamAId: 'a',
      teamBId: 'b',
      payload: { competitors, last_meetings: [{ id: 'flat', competitors, status: 'closed' }] },
    } as never);
    expect(out.meetings[0].matchId).toBe('flat');
  });

  it('tolerates a null entry in the meetings array', () => {
    const out = parseH2H({
      teamAId: 'a',
      teamBId: 'b',
      payload: { competitors, last_meetings: [null] },
    } as never);
    expect(out.meetings[0].matchId).toBe('');
  });

  it('names an unresolvable team "Team A" rather than leaving it blank', () => {
    const out = parseH2H({ teamAId: '', teamBId: '', payload: {} } as never);
    expect(out.teamA.name).toBe('Team A');
    expect(out.teamB.name).toBe('Team B');
  });
});

describe('formatH2HDate', () => {
  it('formats a valid date', () => {
    expect(formatH2HDate('2026-02-01T10:00:00Z')).toMatch(/Feb 1, 2026/);
  });

  it('returns an empty string for no input', () => {
    expect(formatH2HDate(undefined)).toBe('');
    expect(formatH2HDate('')).toBe('');
  });

  it('returns an empty string for an unparseable date', () => {
    expect(formatH2HDate('not-a-date')).toBe('');
  });
});

describe('isUpcomingMeeting', () => {
  it('is true for not_started', () => {
    expect(isUpcomingMeeting({ status: 'not_started' } as never)).toBe(true);
  });

  it('is true for a blank status', () => {
    expect(isUpcomingMeeting({ status: '' } as never)).toBe(true);
  });

  it('is false for a closed match', () => {
    expect(isUpcomingMeeting({ status: 'closed' } as never)).toBe(false);
  });
});

describe('tallyH2H', () => {
  const A = 'sr:competitor:1';
  const B = 'sr:competitor:2';

  it('counts wins for each side', () => {
    const rows = [
      { winnerId: A },
      { winnerId: A },
      { winnerId: B },
    ] as never;
    expect(tallyH2H(rows, A, B)).toEqual({ aWins: 2, bWins: 1, draws: 0, total: 3 });
  });

  it('counts a missing winner as a draw', () => {
    expect(tallyH2H([{ winnerId: undefined }] as never, A, B)).toEqual({
      aWins: 0,
      bWins: 0,
      draws: 1,
      total: 1,
    });
  });

  it('counts an unrelated winner id as a draw rather than dropping the match', () => {
    const rows = [{ winnerId: 'sr:competitor:99' }] as never;
    expect(tallyH2H(rows, A, B).draws).toBe(1);
  });

  it('returns zeroes for no meetings', () => {
    expect(tallyH2H([], A, B)).toEqual({ aWins: 0, bWins: 0, draws: 0, total: 0 });
  });
});
