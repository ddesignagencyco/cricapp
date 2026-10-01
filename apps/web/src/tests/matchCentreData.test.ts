import { extractInningsScorecards, extractSquads } from '../lib/matchCentreData';

function ball(opts: {
  inning?: number;
  over: number;
  striker?: string;
  bowler?: string;
  runs?: number;
  extras?: number;
  extraType?: string;
  type?: string;
  dismissal?: string;
  dismissed?: string;
}) {
  return {
    // parseTimelineEvents reads the event name from `type` and the dismissal
    // kind from dismissal_params.dismissal_details.type — a bare
    // dismissal_params.type is ignored, so the nesting has to be exact.
    type: opts.type ?? 'delivery',
    inning: opts.inning ?? 1,
    over_number: opts.over,
    batting_params: opts.striker
      ? { striker: { name: opts.striker }, runs_scored: opts.runs ?? 0 }
      : undefined,
    bowling_params: {
      bowler: { name: opts.bowler ?? 'Bowler' },
      extra_runs_conceded: opts.extras ?? 0,
      ...(opts.extraType ? { extra_runs_type: opts.extraType } : {}),
    },
    ...(opts.dismissal || opts.dismissed
      ? {
          dismissal_params: {
            dismissal_details: { type: opts.dismissal ?? 'bowled' },
            ...(opts.dismissed ? { player: { name: opts.dismissed } } : {}),
          },
        }
      : {}),
  };
}

const match = {
  teams: { home: { name: 'Lahore', score: '180/3' }, away: { name: 'Islamabad', score: '0/0' } },
  matchStatus: 'first_innings_home',
};

describe('extractInningsScorecards', () => {
  it('returns an empty list when there is no timeline and no stored card', () => {
    expect(extractInningsScorecards(match, null)).toEqual([]);
  });

  it('builds a batting row with runs, balls, fours and sixes', () => {
    const timeline = {
      timeline: [
        ball({ over: 1, striker: 'Ali', bowler: 'Babar', runs: 4 }),
        ball({ over: 2, striker: 'Ali', bowler: 'Babar', runs: 6 }),
        ball({ over: 3, striker: 'Ali', bowler: 'Babar', runs: 1 }),
      ],
    };
    const [inn] = extractInningsScorecards(match, timeline);
    const ali = inn.batting.find((r) => r.name === 'Ali');

    expect(ali).toMatchObject({ runs: 11, balls: 3, fours: 1, sixes: 1 });
    expect(ali?.sr).toBeCloseTo(366.67, 1);
  });

  it('does not count a wide as a ball faced', () => {
    const timeline = {
      timeline: [
        ball({ over: 1, striker: 'Ali', bowler: 'Babar', runs: 0 }),
        ball({ over: 1, striker: 'Ali', bowler: 'Babar', extras: 1, extraType: 'wide' }),
      ],
    };
    const [inn] = extractInningsScorecards(match, timeline);
    expect(inn.batting.find((r) => r.name === 'Ali')?.balls).toBe(1);
  });

  it('does not count a no-ball as a ball faced', () => {
    const timeline = {
      timeline: [
        ball({ over: 1, striker: 'Ali', bowler: 'Babar', runs: 0 }),
        // The feed's `runs_scored` is the *total* on the ball, so a no-ball where the batter
        // also hit a run reports the penalty inside it. This is the real delivery: a single
        // off the bat plus the no-ball, written as 2.
        ball({ over: 1, striker: 'Ali', bowler: 'Babar', runs: 2, extras: 1, extraType: 'no_ball' }),
      ],
    };
    const [inn] = extractInningsScorecards(match, timeline);
    const ali = inn.batting.find((r) => r.name === 'Ali');
    expect(ali?.balls).toBe(1);
    // The single off the bat is the batter's; the penalty is the team's, not his.
    expect(ali?.runs).toBe(1);
  });

  it('charges a bowler for a no-ball they also conceded a run off of', () => {
    // Same delivery as above: the bowler is charged the penalty *and* the run off the bat,
    // which is 2. Charging only the penalty lost a run per no-ball and the innings figures
    // stopped adding up to the team's score.
    const timeline = {
      timeline: [ball({ over: 1, striker: 'Ali', bowler: 'Babar', runs: 2, extras: 1, extraType: 'no_ball' })],
    };
    const [inn] = extractInningsScorecards(match, timeline);
    expect(inn.bowling.find((r) => r.name === 'Babar')?.runs).toBe(2);
  });

  it('gives a batter nothing for a bye or a leg bye, and a bowler nothing either', () => {
    const timeline = {
      timeline: [
        ball({ over: 1, striker: 'Ali', bowler: 'Babar', runs: 1, extras: 1, extraType: 'bye' }),
        ball({ over: 1, striker: 'Ali', bowler: 'Babar', runs: 1, extras: 1, extraType: 'leg_bye' }),
      ],
    };
    const [inn] = extractInningsScorecards(match, timeline);
    // The run belongs to the team. Charging it to the batter is what the over card was
    // showing: a batter credited with a run off a bye.
    expect(inn.batting.find((r) => r.name === 'Ali')?.runs).toBe(0);
    expect(inn.bowling.find((r) => r.name === 'Babar')?.runs).toBe(0);
  });

  it('credits extras to the bowler but not to the batter', () => {
    const timeline = {
      timeline: [ball({ over: 1, striker: 'Ali', bowler: 'Babar', extras: 2, extraType: 'wide' })],
    };
    const [inn] = extractInningsScorecards(match, timeline);
    const bowling = inn.bowling.find((r) => r.name === 'Babar');
    expect(bowling?.runs).toBe(2);
    expect(inn.batting.find((r) => r.name === 'Ali')?.runs).toBe(0);
  });

  it('counts a maiden when six legal balls are bowled without a run', () => {
    const balls = Array.from({ length: 6 }, (_, i) =>
      ball({ over: i + 1, striker: 'Ali', bowler: 'Babar', runs: 0 }),
    );
    const [inn] = extractInningsScorecards(match, { timeline: balls });
    expect(inn.bowling.find((r) => r.name === 'Babar')?.maidens).toBe(1);
  });

  it('does not award a maiden when a run is scored in the over', () => {
    const balls = Array.from({ length: 6 }, (_, i) =>
      ball({ over: i + 1, striker: 'Ali', bowler: 'Babar', runs: i === 5 ? 1 : 0 }),
    );
    const [inn] = extractInningsScorecards(match, { timeline: balls });
    expect(inn.bowling.find((r) => r.name === 'Babar')?.maidens).toBe(0);
  });

  it('formats the bowler overs from the ball count', () => {
    const balls = Array.from({ length: 8 }, (_, i) =>
      ball({ over: i + 1, striker: 'Ali', bowler: 'Babar', runs: 1 }),
    );
    const [inn] = extractInningsScorecards(match, { timeline: balls });
    expect(inn.bowling.find((r) => r.name === 'Babar')?.overs).toBe('1.2');
  });

  it('marks the striker out when the dismissal names them', () => {
    const timeline = {
      timeline: [
        ball({
          over: 1,
          type: 'wicket',
          striker: 'Ali',
          bowler: 'Babar',
          dismissal: 'bowled',
          dismissed: 'Ali',
        }),
      ],
    };
    const [inn] = extractInningsScorecards(match, timeline);
    expect(inn.batting.find((r) => r.name === 'Ali')?.out).toBe(true);
  });

  it('credits the wicket to the bowler', () => {
    const timeline = {
      timeline: [
        ball({ over: 1, type: 'wicket', striker: 'Ali', bowler: 'Babar', dismissal: 'bowled' }),
      ],
    };
    const [inn] = extractInningsScorecards(match, timeline);
    expect(inn.bowling.find((r) => r.name === 'Babar')?.wickets).toBe(1);
  });

  it('does not mark a different player out when the dismissal names someone else', () => {
    const timeline = {
      timeline: [
        ball({
          over: 1,
          type: 'wicket',
          striker: 'Ali',
          bowler: 'Babar',
          dismissal: 'run out',
          dismissed: 'Hasan',
        }),
      ],
    };
    const [inn] = extractInningsScorecards(match, timeline);
    expect(inn.batting.find((r) => r.name === 'Ali')?.out).toBe(false);
  });

  it('separates the two innings and labels the sides', () => {
    const timeline = {
      timeline: [
        ball({ inning: 1, over: 1, striker: 'Ali', bowler: 'Babar', runs: 1 }),
        ball({ inning: 2, over: 1, striker: 'Hasan', bowler: 'Kamran', runs: 2 }),
      ],
    };
    const cards = extractInningsScorecards(match, timeline);
    expect(cards).toHaveLength(2);
    expect(cards[0]).toMatchObject({
      number: 1,
      battingTeam: 'Lahore',
      bowlingTeam: 'Islamabad',
    });
    expect(cards[1]).toMatchObject({
      number: 2,
      battingTeam: 'Islamabad',
      bowlingTeam: 'Lahore',
    });
  });

  it('falls back to stored scorecards when the timeline is empty', () => {
    const withStored = {
      ...match,
      inningsScorecards: [
        {
          number: 1,
          label: 'x',
          battingTeam: 'Lahore',
          bowlingTeam: 'Islamabad',
          batting: [{ name: 'Ali', out: false, runs: 10, balls: 5, fours: 1, sixes: 0, sr: 200 }],
          bowling: [{ name: 'Babar', overs: '1', maidens: 0, runs: 10, wickets: 0, econ: 6 }],
        },
      ],
    };
    const cards = extractInningsScorecards(withStored, null);
    expect(cards).toHaveLength(1);
    expect(cards[0].batting[0].name).toBe('Ali');
  });

  it('prefers live timeline batting over unreadable sr:player placeholders', () => {
    // The stored card has synthetic ids; the timeline has real names.
    const withStored = {
      ...match,
      inningsScorecards: [
        {
          number: 1,
          batting: [
            {
              name: 'sr:player:1',
              out: false,
              runs: 1,
              balls: 1,
              fours: 0,
              sixes: 0,
              sr: 100,
            },
          ],
          bowling: [],
        },
      ],
    };
    const timeline = { timeline: [ball({ over: 1, striker: 'Ali', bowler: 'Babar', runs: 1 })] };
    const [card] = extractInningsScorecards(withStored, timeline);
    expect(card.batting[0].name).toBe('Ali');
  });

  it('always returns a label containing the innings number', () => {
    const timeline = { timeline: [ball({ over: 1, striker: 'Ali', bowler: 'Babar', runs: 1 })] };
    const [card] = extractInningsScorecards(match, timeline);
    expect(card.label).toContain('Innings 1');
  });
});

/**
 * Squad entries carry the player's id so the squad list can link to the player page. The
 * name-only assertions below read through `names()` so each test stays about which players
 * were found, not about the shape of the row.
 */
const names = (rows: { name: string }[]) => rows.map((row) => row.name);

describe('extractSquads', () => {
  it('reads players straight off the teams object', () => {
    const full = {
      teams: {
        home: { name: 'Lahore', players: ['Ali', 'Hasan'] },
        away: { name: 'Islamabad', players: ['Babar'] },
      },
    };
    expect(names(extractSquads(full, null).home)).toEqual(['Ali', 'Hasan']);
    expect(names(extractSquads(full, null).away)).toEqual(['Babar']);
  });

  it('carries the player id through when the payload has one', () => {
    const full = {
      teams: {
        home: { players: [{ id: 'sr:player:1', name: 'Ali' }] },
        away: { players: [{ name: 'Babar' }] },
      },
    };
    const squads = extractSquads(full, null);
    expect(squads.home[0]).toEqual({ name: 'Ali', id: 'sr:player:1' });
    // A name with no id must stay empty rather than be guessed at, so the squad list can
    // render it as plain text instead of linking to a dead URL.
    expect(squads.away[0]).toEqual({ name: 'Babar', id: '' });
  });

  it('accepts an array of name strings', () => {
    const full = { teams: { home: { players: ['Ali'] }, away: { lineup: ['Babar'] } } };
    expect(names(extractSquads(full, null).home)).toEqual(['Ali']);
    expect(names(extractSquads(full, null).away)).toEqual(['Babar']);
  });

  it('maps player objects down to their names', () => {
    const full = {
      teams: { home: { squad: [{ name: 'Ali' }, { name: '' }] }, away: { xi: ['Babar'] } },
    };
    expect(names(extractSquads(full, null).home)).toEqual(['Ali']);
    expect(names(extractSquads(full, null).away)).toEqual(['Babar']);
  });

  it('falls back to timeline lineups when the teams object has no players', () => {
    const bare = { teams: { home: { name: 'Lahore' }, away: { name: 'Islamabad' } } };
    const timeline = {
      lineups: [
        { team: 'home', starting_lineup: [{ name: 'Ali' }] },
        { team: 'away', starting_lineup: [{ name: 'Babar' }] },
      ],
    };
    expect(names(extractSquads(bare, timeline).home)).toEqual(['Ali']);
    expect(names(extractSquads(bare, timeline).away)).toEqual(['Babar']);
  });

  it('derives the squads from the scorecard when nothing else is available', () => {
    // Neither side has a score and there is no matchStatus, so inningsSides
    // treats the away side as batting first: the striker lands in `away` and
    // the bowler in `home`.
    const bare = { teams: { home: { name: 'Lahore' }, away: { name: 'Islamabad' } } };
    const timeline = { timeline: [ball({ over: 1, striker: 'Ali', bowler: 'Babar', runs: 1 })] };
    const squads = extractSquads(bare, timeline);
    expect(names(squads.away)).toContain('Ali');
    expect(names(squads.home)).toContain('Babar');
  });

  it('assigns scorecard names to the correct side when home bats first', () => {
    const homeFirst = {
      teams: { home: { name: 'Lahore', score: '180/3' }, away: { name: 'Islamabad' } },
      matchStatus: 'first_innings_home',
    };
    const timeline = { timeline: [ball({ over: 1, striker: 'Ali', bowler: 'Babar', runs: 1 })] };
    const squads = extractSquads(homeFirst, timeline);
    // Home bat first, so the striker is a home player and the bowler is away.
    expect(names(squads.home)).toContain('Ali');
    expect(names(squads.away)).toContain('Babar');
  });

  it('does not duplicate a player who appears in both innings', () => {
    const bare = { teams: { home: { name: 'Lahore' }, away: { name: 'Islamabad' } } };
    const timeline = {
      timeline: [
        ball({ inning: 1, over: 1, striker: 'Ali', bowler: 'Babar', runs: 1 }),
        ball({ inning: 2, over: 1, striker: 'Babar', bowler: 'Ali', runs: 1 }),
      ],
    };
    const squads = extractSquads(bare, timeline);
    const all = [...squads.home, ...squads.away];
    // Each name is collected once even though both players appear in both cards.
    expect(names(all).sort()).toEqual(['Ali', 'Babar']);
  });

  it('returns empty sides rather than throwing when there is nothing to read', () => {
    expect(extractSquads({}, null)).toEqual({ home: [], away: [] });
  });
});
