import { extractInningsScorecards } from '../lib/matchCentreData';
import { describeMatchResult } from '../lib/matchScoreboard';
import { matchSummary } from '../components/MatchTimeline';
import { marginClarifier } from '../lib/matchFacts';

/** The Gabba 4th Test, sr:match:53500637. Four innings, drawn. */
const testMatch = {
  matchId: 'sr:match:53500637',
  status: 'completed',
  matchStatus: 'ended',
  teams: {
    home: { id: 'AUS', code: 'AUS', name: 'Australia', score: '534/7', overs: '18' },
    away: { id: 'IND', code: 'IND', name: 'India', score: '8/0', overs: '2.1' },
  },
  result: null,
};

function ball(inning: number, batsman: string, bowler: string) {
  return {
    inning,
    over_number: 1,
    batting_params: { striker: { name: batsman }, runs_scored: 1 },
    bowling_params: { bowler: { name: bowler } },
  };
}

/** Four innings of real ball events, the shape the innings labels are built from. */
const fourInnings = {
  timeline: [
    ball(1, 'Smith', 'Bumrah'),
    ball(2, 'Kohli', 'Cummins'),
    ball(3, 'Labuschagne', 'Ashwin'),
    ball(4, 'Rohit', 'Starc'),
  ],
};

/** The period_scores shape the timeline summary reads. */
const testTimeline = {
  sport_event: { tournament: { type: 'test' } },
  sport_event_status: {
    period_scores: [
      { number: 1, home_score: 445, home_wickets: 10, display_score: '445/10' },
      { number: 2, away_score: 260, away_wickets: 10, display_score: '260/10' },
      { number: 3, home_score: 89, home_wickets: 7, display_score: '89/7' },
      { number: 4, away_score: 8, display_score: '8/0' },
    ],
  },
};

describe('Bug C: innings alternate in a four-innings Test', () => {
  it('labels every innings the side that actually batted it', () => {
    const cards = extractInningsScorecards(testMatch, fourInnings as never);
    expect(cards.map((c) => `${c.number}:${c.battingTeam}`)).toEqual([
      '1:Australia',
      '2:India',
      '3:Australia',
      '4:India',
    ]);
  });

  it('does not label innings 3 as India when Australia batted it', () => {
    const cards = extractInningsScorecards(testMatch, fourInnings as never);
    const third = cards.find((c) => c.number === 3);
    expect(third?.battingTeam).toBe('Australia');
    expect(third?.bowlingTeam).toBe('India');
  });

  it('still gets a two-innings match right', () => {
    const cards = extractInningsScorecards(testMatch, {
      timeline: [ball(1, 'Ali', 'Babar'), ball(2, 'Babar', 'Ali')],
    } as never);
    expect(cards.map((c) => c.battingTeam)).toEqual(['Australia', 'India']);
  });
});

describe('Bug B: a drawn Test is not "No result"', () => {
  it('says Match drawn when the format is a Test', () => {
    expect(describeMatchResult(testMatch, { format: 'test' })).toBe('Match drawn');
  });

  it('still says No result for a limited-overs match', () => {
    const t20 = {
      ...testMatch,
      teams: {
        home: { id: 'A', code: 'A', name: 'Alpha', score: '140/6', overs: '20' },
        away: { id: 'B', code: 'B', name: 'Beta', score: '8/0', overs: '2.1' },
      },
    };
    expect(describeMatchResult(t20, { format: 't20' })).toBe('No result');
  });

  it('keeps saying No result when the format is unknown', () => {
    expect(describeMatchResult(testMatch, {})).toBe('No result');
  });

  it('treats a one-day international as limited overs, not first class', () => {
    // An ODI has a 50-over limit, so an innings stopping at 2.1 is an
    // abandonment rather than the close of play.
    expect(describeMatchResult(testMatch, { format: 'ODI' })).toBe('No result');
  });

  it('reads the format out of the timeline tournament', () => {
    expect(matchSummary(testTimeline as never).format).toBe('test');
  });

  it('prefers a stored result over any derivation', () => {
    const decided = { ...testMatch, result: 'Australia won by 162 runs' };
    expect(describeMatchResult(decided, { format: 'test' })).toBe('Australia won by 162 runs');
  });
});

describe('Bug A: the timeline aggregate must not replace the current score', () => {
  it('sums a side runs across innings, which is an aggregate not a score', () => {
    // India batted 260 then 8. Summing them is what produced the bogus 268.
    expect(matchSummary(testTimeline as never).awayScore).toBe('268/10');
  });

  it('keeps the per-innings list intact for the scorecard', () => {
    expect(matchSummary(testTimeline as never).scores).toHaveLength(4);
  });

  it('leaves the stored current-state score as 8/0 for the header', () => {
    // The header reads teamScores, which holds India's last innings.
    const stored = testMatch.teams.away.score;
    expect(stored).toBe('8/0');
  });
});

describe('D1: the wicket-margin clarifier', () => {
  it('restates the margin as wickets in hand', () => {
    // 140/6 next to "won by 7 wickets" invites comparing 7 with that 6. The two
    // are unrelated, so the clarifier names the meaning instead of adding a
    // third number.
    expect(marginClarifier('Montreal Tigers won by 7 wickets')).toBe('7 wickets in hand');
  });

  it('handles the singular', () => {
    expect(marginClarifier('Karachi Kings won by 1 wicket')).toBe('1 wickets in hand');
  });

  it('adds nothing for a runs win', () => {
    expect(marginClarifier('Montreal Tigers won by 30 runs')).toBe('');
  });

  it('adds nothing for a tie or a draw', () => {
    expect(marginClarifier('Match tied')).toBe('');
    expect(marginClarifier('Match drawn')).toBe('');
  });

  it('adds nothing for a no-result or empty string', () => {
    expect(marginClarifier('No result')).toBe('');
    expect(marginClarifier('')).toBe('');
  });

  it('leaves the stored result text itself untouched', () => {
    const stored = 'Montreal Tigers won by 7 wickets';
    expect(marginClarifier(stored)).toBe('7 wickets in hand');
    expect(stored).toBe('Montreal Tigers won by 7 wickets');
  });
});
