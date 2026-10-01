/**
 * The match centre's data layer, checked against payloads captured from the live API.
 *
 * The fixtures are real responses, trimmed only where noted. That matters: several
 * of these assertions are about a specific contradiction the real data contains, and
 * a hand-written stub would happily agree with whatever the code does.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildMatchInnings, latestInningsFor, readCompetitors, readToss } from '../lib/matchInnings';
import { oversToBalls } from '../lib/cricketMath';
import { buildMatchViewModel } from '../lib/matchViewModel';
import {
  dismissalOvers,
  readFallOfWickets,
  readProviderInningsCards,
  readSquads,
} from '../lib/matchScorecardData';
import { extractInningsScorecards, extractSquads } from '../lib/matchCentreData';
import { aggregateBatters, aggregateBowlers, topBatter, topBowler, playerOfTheMatch } from '../lib/matchPerformers';

type Fixture = {
  matchId: string;
  match: Record<string, unknown>;
  timeline: Record<string, unknown>;
};

const bgt = JSON.parse(
  readFileSync(join(__dirname, 'fixtures', 'bgtTestMatch.json'), 'utf8'),
) as Fixture;

/** The 4-innings Border-Gavaskar Test, the match that exposed the aggregate bug. */
const testMatch = bgt.match;
const testTimeline = bgt.timeline;

/** A completed limited-overs match, two innings. */
const odi = {
  matchId: 'sr:match:56789849',
  status: 'completed',
  matchStatus: 'ended',
  tournament: 'ICC Champions Trophy',
  venue: 'National Stadium',
  scheduled: '2025-02-19T09:00:00+00:00',
  result: 'New Zealand won by 60 runs',
  teams: {
    home: { code: 'PAK', name: 'Pakistan', score: '260/10', overs: '50' },
    away: { code: 'NZ', name: 'New Zealand', score: '320/5', overs: '50' },
  },
  teamNames: ['Pakistan', 'New Zealand'],
  currentInnings: { battingTeam: 'PAK', runs: 260, wickets: 10, overs: 50, runRate: 5.2 },
  displayScore: null,
  displayOvers: null,
  periodScores: [
    { type: 'inning', number: 1, away_score: 320, home_score: 0, away_wickets: 5, display_overs: 50 },
    { type: 'inning', number: 2, away_score: 0, home_score: 260, home_wickets: 10, display_overs: 50 },
  ],
  lastEvent: { over: 50, runs: 0, type: 'none' },
  winnerId: null,
  tossWonBy: null,
  tossDecision: null,
  currentInning: null,
} as unknown as Record<string, unknown>;

const odiTimeline = {
  sport_event: {
    id: 'sr:match:56789849',
    season: { id: 'sr:season:127467', name: 'ICC Champions Trophy 2025', year: '2025' },
    scheduled: '2025-02-19T09:00:00+00:00',
    tournament: { id: 'sr:tournament:15331', name: 'ICC Champions Trophy', type: 'odi' },
    competitors: [
      { id: 'sr:competitor:142704', name: 'Pakistan', abbreviation: 'PAK', qualifier: 'home' },
      { id: 'sr:competitor:142702', name: 'New Zealand', abbreviation: 'NZ', qualifier: 'away' },
    ],
    venue: { name: 'National Stadium', city_name: 'Karachi', country_name: 'Pakistan', timezone: 'Asia/Karachi' },
    sport_event_conditions: { type: 'odi' },
    tournament_round: { type: 'group', number: 1, competition_sport_event_number: 1 },
  },
  sport_event_status: {
    match_status: 'ended',
    status: 'closed',
    allotted_overs: 50,
    match_result_text: 'New Zealand won by 60 runs',
    period_scores: [
      { home_score: 0, away_score: 320, type: 'inning', number: 1, display_overs: 50, away_wickets: 5 },
      { home_score: 260, away_score: 0, type: 'inning', number: 2, display_overs: 50, home_wickets: 10 },
    ],
  },
  statistics: {
    innings: [
      {
        number: 1,
        batting_team: 'sr:competitor:142702',
        bowling_team: 'sr:competitor:142704',
        teams: [
          {
            id: 'sr:competitor:142702',
            name: 'New Zealand',
            abbreviation: 'NZ',
            statistics: {
              batting: {
                players: [
                  {
                    id: 'sr:player:1',
                    name: 'Chapman, Devon',
                    statistics: { runs: 100, balls_faced: 80, fours: 14, sixes: 1, strike_rate: 125, order: 1 },
                  },
                  {
                    id: 'sr:player:2',
                    name: 'Neesham, Jimmy',
                    statistics: {
                      runs: 40,
                      balls_faced: 20,
                      fours: 4,
                      sixes: 0,
                      strike_rate: 200,
                      order: 2,
                      dismissal: { type: 'caught', over_number: 30, ball_number: 2 },
                    },
                  },
                ],
              },
            },
          },
          {
            id: 'sr:competitor:142704',
            name: 'Pakistan',
            abbreviation: 'PAK',
            statistics: {
              bowling: {
                players: [
                  {
                    id: 'sr:player:3',
                    name: 'Riaz, Shaheen',
                    statistics: { overs_bowled: '10', maidens: 1, conceded_runs: 55, wickets: 1, economy_rate: 5.5 },
                  },
                ],
              },
            },
          },
        ],
      },
    ],
  },
  timeline: [],
} as unknown as Record<string, unknown>;

/* ─── Competitor identity ────────────────────────────────────── */

describe('reading the two sides by stable id', () => {
  it('uses the provider qualifiers, not array order', () => {
    const competitors = readCompetitors(testTimeline);
    expect(competitors.home).toMatchObject({ id: 'sr:competitor:142690', name: 'Australia' });
    expect(competitors.away).toMatchObject({ id: 'sr:competitor:107203', name: 'India' });
  });

  it('never swaps home and away on a match row that lists them the other way round', () => {
    // The fixture's teamScores object is stored away-first. Side identity must come
    // from the qualifier, so Australia is still home.
    const model = buildMatchViewModel({ match: testMatch, timeline: testTimeline });
    expect(model.home.name).toBe('Australia');
    expect(model.away.name).toBe('India');
  });
});

/* ─── The aggregate bug ──────────────────────────────────────── */

describe('a Test side total is not one innings', () => {
  const innings = buildMatchInnings({ match: testMatch, timeline: testTimeline });

  it('keeps all four innings', () => {
    expect(innings.map((i) => i.number)).toEqual([1, 2, 3, 4]);
  });

  it('reads each innings score from its own period, not the summed side total', () => {
    // `teams.home.score` is "342/10" — 104 + 238 across two innings. The innings
    // list must show the two separate scores that make it up.
    expect(innings.map((i) => i.score)).toEqual(['150/10', '104/10', '487/6', '238/10']);
    const teams = testMatch.teams as { home: { score: string }; away: { score: string } };
    expect(teams.home.score).toBe('342/10');
    expect(teams.away.score).toBe('637/6');
  });

  it('maps every innings to the side that batted it, by competitor id', () => {
    expect(innings.map((i) => i.side)).toEqual(['away', 'home', 'away', 'home']);
    // India won the toss and chose to bat, so India opened.
    expect(innings[0].sideSource).toBe('competitor-ids');
  });

  it('preserves delivery-aware overs and never rounds 49.4 up to 50', () => {
    expect(innings.map((i) => i.oversLabel)).toEqual(['49.4', '51.2', '134.3', '58.4']);
  });

  it('derives the run rate from the runs and overs it prints beside it', () => {
    // Run rate is per *decimal* overs, so 49.4 cricket overs (298 balls) is
    // 298/6 = 49.667 decimal overs, not 49.4.
    for (const inn of innings) {
      const balls = oversToBalls(inn.overs as number) as number;
      expect(inn.runRate).toBeCloseTo((inn.runs as number) / (balls / 6), 6);
    }
    expect(innings[2].runRate).toBeCloseTo(487 / ((oversToBalls(134.3) as number) / 6), 2);
  });

  it('shows the latest innings each side batted on the headline', () => {
    const model = buildMatchViewModel({ match: testMatch, timeline: testTimeline });
    expect(model.headline.home?.score).toBe('238/10');
    expect(model.headline.away?.score).toBe('487/6');
    // Never the aggregate the API's team score field carries.
    expect(model.headline.home?.score).not.toBe('342/10');
    expect(model.headline.away?.score).not.toBe('637/6');
  });

  it('gives every side the same headline number everywhere on the page', () => {
    const model = buildMatchViewModel({ match: testMatch, timeline: testTimeline });
    const fromInnings = model.innings.filter((i) => i.side === 'home');
    const last = fromInnings[fromInnings.length - 1];
    expect(latestInningsFor(model.innings, 'home')?.score).toBe(last.score);
    expect(model.headline.home?.score).toBe(last.score);
  });
});

/* ─── Completed state ────────────────────────────────────────── */

describe('a completed match', () => {
  const model = buildMatchViewModel({ match: testMatch, timeline: testTimeline });

  it('is the completed phase', () => {
    expect(model.phase).toBe('completed');
    expect(model.isOver).toBe(true);
  });

  it('has no batting side, so nothing can show a live batting state', () => {
    expect(model.battingSide).toBeNull();
    expect(model.currentInnings).toBeNull();
  });

  it('marks every innings complete', () => {
    expect(model.innings.every((i) => i.isComplete)).toBe(true);
  });

  it('reports the winner, resolved from the provider competitor id', () => {
    expect(model.winnerId).toBe('sr:competitor:107203');
    expect(model.winnerSide).toBe('away');
    expect(model.winnerName).toBe('India');
  });

  it('reports the toss, resolved from the provider competitor id', () => {
    const toss = readToss(testMatch, testTimeline);
    expect(toss.side).toBe('away');
    expect(toss.decision).toBe('bat');
    expect(model.tossText).toBe('India won the toss and chose to bat');
  });

  it('prefers the API result line over anything derived', () => {
    expect(model.result).toBe('India won by 295 runs');
  });

  it('reads the format, venue, series and match number from the payload', () => {
    expect(model.formatLabel).toBe('Test');
    expect(model.oversLimit).toBeNull();
    expect(model.multiInnings).toBe(true);
    expect(model.venueCity).toBe('Perth');
    expect(model.venueCountry).toBe('Australia');
    expect(model.timeZone).toBe('Australia/West');
    expect(model.tournamentId).toBe('sr:tournament:27220');
    expect(model.seasonName).toBe('Test Series Australia vs India 24/25');
    expect(model.matchNumber).toBe(1);
  });
});

/* ─── Limited overs ──────────────────────────────────────────── */

describe('a completed limited-overs match', () => {
  const model = buildMatchViewModel({ match: odi, timeline: odiTimeline });

  it('maps one innings to each side', () => {
    expect(model.innings.map((i) => i.side)).toEqual(['away', 'home']);
    expect(model.innings.map((i) => i.score)).toEqual(['320/5', '260/10']);
  });

  it('agrees with the API side scores, because a two-innings match has one each', () => {
    expect(model.headline.home?.score).toBe('260/10');
    expect(model.headline.away?.score).toBe('320/5');
  });

  it('has a 50-over limit and is not flagged multi-innings', () => {
    expect(model.oversLimit).toBe(50);
    expect(model.multiInnings).toBe(false);
    expect(model.formatLabel).toBe('ODI');
  });

  it('has no batting side and no target', () => {
    expect(model.battingSide).toBeNull();
    expect(model.target).toBeNull();
  });
});

/* ─── Upcoming ───────────────────────────────────────────────── */

describe('an upcoming match', () => {
  const upcoming = {
    matchId: 'sr:match:72868722',
    status: 'upcoming',
    matchStatus: 'not_started',
    tournament: 'Global T20 Canada',
    venue: null,
    scheduled: '2026-07-31T15:00:00+00:00',
    teams: ['MIS', 'SUR'],
    teamNames: ['Mississauga Bangla Tigers', 'Surrey Jaguars'],
    teamScores: null,
    currentInnings: null,
    displayScore: null,
    displayOvers: null,
    periodScores: null,
    result: null,
    lastEvent: { over: 0, runs: 0, type: 'none' },
  } as unknown as Record<string, unknown>;

  const model = buildMatchViewModel({ match: upcoming, timeline: null });

  it('is the upcoming phase with no innings at all', () => {
    expect(model.phase).toBe('upcoming');
    expect(model.isUpcoming).toBe(true);
    expect(model.innings).toEqual([]);
    expect(model.headline).toEqual({ home: null, away: null });
  });

  it('names both sides from the teams array and teamNames', () => {
    expect(model.home.name).toBe('Mississauga Bangla Tigers');
    expect(model.away.name).toBe('Surrey Jaguars');
    expect(model.home.code).toBe('MIS');
    expect(model.away.code).toBe('SUR');
  });

  it('invents no result, no situation and no target', () => {
    expect(model.result).toBeNull();
    expect(model.target).toBeNull();
    expect(model.battingSide).toBeNull();
    expect(model.situation).toContain('yet to start');
  });

  it('leaves the venue empty rather than printing a dash', () => {
    expect(model.venue).toBeNull();
  });
});

/* ─── Abandoned ──────────────────────────────────────────────── */

describe('a cancelled or abandoned match', () => {
  const cancelled = {
    matchId: 'sr:match:72726938',
    status: 'cancelled',
    matchStatus: 'postponed',
    tournament: 'Global T20 Canada',
    teams: ['MIS', 'SUR'],
    teamNames: ['Mississauga Bangla Tigers', 'Surrey Jaguars'],
    teamScores: { home: { code: 'MIS', name: 'MIS', score: '', overs: '' }, away: { code: 'SUR', name: 'SUR', score: '', overs: '' } },
    currentInnings: null,
    periodScores: null,
    displayScore: null,
    displayOvers: null,
    result: null,
    lastEvent: { over: 0, runs: 0, type: 'none' },
  } as unknown as Record<string, unknown>;

  const model = buildMatchViewModel({ match: cancelled, timeline: null });

  it('is the abandoned phase and is over', () => {
    expect(model.phase).toBe('abandoned');
    expect(model.isOver).toBe(true);
  });

  it('keeps the official reason from the provider', () => {
    expect(model.statusReason).toBe('postponed');
    expect(model.situation).toContain('called off');
    expect(model.situation).toContain('postponed');
  });

  it('never claims a batting side or a result', () => {
    expect(model.battingSide).toBeNull();
    expect(model.currentInnings).toBeNull();
  });
});

/* ─── Live ───────────────────────────────────────────────────── */

describe('a live match', () => {
  const live = {
    matchId: 'sr:match:live1',
    status: 'live',
    matchStatus: '2nd innings',
    tournament: 'ODI Series',
    teams: {
      home: { code: 'PAK', name: 'Pakistan', score: '200/3', overs: '30' },
      away: { code: 'NZ', name: 'New Zealand', score: '134/2', overs: '20.4' },
    },
    teamNames: ['Pakistan', 'New Zealand'],
    currentInnings: { battingTeam: 'NZ', runs: 134, wickets: 2, overs: 20.4, runRate: 6.47 },
    displayScore: null,
    displayOvers: null,
    periodScores: [
      { type: 'inning', number: 1, home_score: 200, home_wickets: 3, away_score: 0, display_overs: 30 },
      { type: 'inning', number: 2, home_score: 0, away_score: 134, away_wickets: 2, display_overs: 20.4 },
    ],
    result: null,
    lastEvent: { over: 20.4, runs: 1, type: 'runs' },
  } as unknown as Record<string, unknown>;

  const liveTimeline = {
    sport_event: {
      competitors: [
        { id: 'sr:competitor:pa', name: 'Pakistan', abbreviation: 'PAK', qualifier: 'home' },
        { id: 'sr:competitor:nz', name: 'New Zealand', abbreviation: 'NZ', qualifier: 'away' },
      ],
      tournament: { id: 'sr:tournament:1', name: 'ODI Series', type: 'odi' },
    },
    sport_event_status: {
      status: 'inprogress',
      match_status: '2nd innings',
      allotted_overs: 50,
      display_overs: 20.4,
      display_score: '134/2',
      period_scores: [
        { number: 1, home_score: 200, home_wickets: 3, away_score: 0, display_overs: 30 },
        { number: 2, home_score: 0, away_score: 134, away_wickets: 2, display_overs: 20.4 },
      ],
    },
    timeline: [],
  } as unknown as Record<string, unknown>;

  const model = buildMatchViewModel({ match: live, timeline: liveTimeline });

  it('is the live phase with a batting side', () => {
    expect(model.phase).toBe('live');
    expect(model.isLive).toBe(true);
    expect(model.battingSide).toBe('away');
    expect(model.currentInnings?.isComplete).toBe(false);
  });

  it('computes the chase from the first innings', () => {
    expect(model.target).toBe(201);
    expect(model.runsRemaining).toBe(67);
    // 300 balls allotted, 124 bowled.
    expect(model.ballsRemaining).toBe(176);
    expect(model.requiredRunRate).toBeCloseTo((67 / 176) * 6, 1);
  });

  it('says what is being chased, not who is batting', () => {
    expect(model.situation).toContain('Chasing 201');
    expect(model.situation).toContain('67 more runs');
  });

  it('prints the same live score in the innings list and the headline', () => {
    expect(model.currentInnings?.score).toBe('134/2');
    expect(model.headline.away?.score).toBe('134/2');
    expect(model.currentInnings?.oversLabel).toBe('20.4');
  });
});

describe('an innings break', () => {
  const inningsBreak = {
    matchId: 'sr:match:ib1',
    status: 'live',
    matchStatus: '1st innings',
    teams: {
      home: { code: 'PAK', name: 'Pakistan', score: '200/10', overs: '41.3' },
      away: { code: 'NZ', name: 'New Zealand', score: '', overs: '' },
    },
    teamNames: ['Pakistan', 'New Zealand'],
    currentInnings: null,
    periodScores: [{ type: 'inning', number: 1, home_score: 200, home_wickets: 10, away_score: 0, display_overs: 41.3 }],
    displayScore: null,
    displayOvers: null,
    result: null,
    lastEvent: { over: 41.3, runs: 0, type: 'none' },
  } as unknown as Record<string, unknown>;

  const timeline = {
    sport_event: {
      competitors: [
        { id: 'a', name: 'Pakistan', abbreviation: 'PAK', qualifier: 'home' },
        { id: 'b', name: 'New Zealand', abbreviation: 'NZ', qualifier: 'away' },
      ],
    },
    sport_event_status: {
      status: 'inprogress',
      match_status: '1st innings',
      allotted_overs: 50,
      period_scores: [{ number: 1, home_score: 200, home_wickets: 10, away_score: 0, display_overs: 41.3 }],
    },
    timeline: [
      { id: 1, type: 'match_started', time: '2026-01-01T00:00:00+00:00' },
      { id: 2, type: 'period_start', time: '2026-01-01T00:00:01+00:00', period_name: 'First innings, home team' },
      { id: 3, type: 'period_start', time: '2026-01-01T03:00:00+00:00', period_name: 'Innings break' },
    ],
  } as unknown as Record<string, unknown>;

  it('is detected as an innings break, not a live innings', () => {
    const model = buildMatchViewModel({ match: inningsBreak, timeline });
    expect(model.phase).toBe('innings-break');
    expect(model.statusLabel).toBe('Innings break');
    expect(model.situation).toContain('Innings break before innings 2');
  });

  it('does not set a target, because there is no chase to state', () => {
    expect(buildMatchViewModel({ match: inningsBreak, timeline }).target).toBeNull();
  });
});

/* ─── Provider scorecard ─────────────────────────────────────── */

describe('the provider scorecard', () => {
  const cards = readProviderInningsCards(testTimeline);

  it('reads one card per innings', () => {
    expect(cards.map((c) => c.number)).toEqual([1, 2, 3, 4]);
  });

  it('names the batting side from the stable id, not the array position', () => {
    expect(cards[0].battingTeamName).toBe('India');
    expect(cards[0].bowlingTeamName).toBe('Australia');
    expect(cards[1].battingTeamName).toBe('Australia');
  });

  it('carries a real player id so a name can link to a player page', () => {
    expect(cards[0].batting[0].id).toMatch(/^sr:player:/);
  });

  it('uses the provider strike rate rather than recomputing it', () => {
    const first = cards[0].batting[0];
    expect(first.runs).not.toBeNull();
    expect(first.strikeRate).toBe(
      Number((((first.runs as number) / (first.balls as number)) * 100).toFixed(2)),
    );
  });

  it('keeps a partial over as a partial over', () => {
    const overs = cards.flatMap((c) => c.bowling.map((b) => b.overs));
    expect(overs).toContain('6.3');
    expect(overs).toContain('15.4');
  });

  it('is empty when the payload has no statistics', () => {
    expect(readProviderInningsCards({ sport_event: {}, timeline: [] })).toEqual([]);
    expect(readProviderInningsCards(null)).toEqual([]);
  });
});

describe('converting a one-based dismissal over to cricket notation', () => {
  it('turns over 50 ball 4 into 49.4', () => {
    // The real fixture's innings 1 ended at 49.4, and the last wicket is recorded
    // as "over 50.4".
    expect(dismissalOvers(50, 4)).toBe('49.4');
  });

  it('turns over 17 ball 2 into 16.2', () => {
    expect(dismissalOvers(17, 2)).toBe('16.2');
  });

  it('handles a first over', () => {
    expect(dismissalOvers(1, 1)).toBe('0.1');
  });

  it('treats a missing ball as the first ball of the over', () => {
    expect(dismissalOvers(10, null)).toBe('9.1');
  });

  it('returns nothing without an over', () => {
    expect(dismissalOvers(null, 3)).toBe('');
  });
});

describe('fall of wickets', () => {
  const cards = readProviderInningsCards(testTimeline);
  const fow = readFallOfWickets(testTimeline, cards[0]);

  it('lists every wicket in order', () => {
    expect(fow.length).toBe(10);
    expect(fow.map((f) => f.wicket)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('counts the last wicket at 49.4, matching the innings total', () => {
    const last = fow[fow.length - 1];
    expect(last.overs).toBe('49.4');
    expect(cards[0].batting.some((b) => b.dismissal?.overs === '49.4')).toBe(true);
  });

  it('records who was out and how', () => {
    const first = fow[0];
    expect(first.batter).toBeTruthy();
    expect(first.dismissal).toBeTruthy();
  });
});

/* ─── Squads ─────────────────────────────────────────────────── */

describe('squads derived from the scorecard', () => {
  const squads = readSquads(testTimeline);

  it('finds a full eleven for each side', () => {
    expect(squads.home.length).toBeGreaterThanOrEqual(10);
    expect(squads.away.length).toBeGreaterThanOrEqual(10);
  });

  it('assigns players to the side that actually batted them', () => {
    // India batted innings 1 and 3, so the first batting order is India's.
    const indiaFirst = cardsFor(1)[0];
    const indiaPlayer = indiaFirst.batting[0].name;
    expect(squads.away.some((p) => p.name === indiaPlayer)).toBe(true);
  });

  it('returns empty lists when there is no scorecard', () => {
    expect(readSquads({ sport_event: {} })).toEqual({ home: [], away: [] });
  });
});

function cardsFor(n: number) {
  return readProviderInningsCards(testTimeline).filter((c) => c.number === n);
}

/* ─── Performers ─────────────────────────────────────────────── */

describe('top performers, derived from the real scorecard', () => {
  const scorecards = extractInningsScorecards(testMatch, testTimeline);

  it('finds a top batter with runs, balls, fours, sixes and a strike rate', () => {
    const best = topBatter(scorecards);
    expect(best).not.toBeNull();
    expect(best!.runs).toBeGreaterThan(0);
    expect(best!.balls).toBeGreaterThan(0);
    expect(typeof best!.strikeRate).toBe('number');
  });

  it('picks the highest scorer, not the first row of the scorecard', () => {
    const figures = aggregateBatters(scorecards);
    const best = topBatter(scorecards)!;
    expect(best.runs).toBe(Math.max(...figures.map((f) => f.runs)));
  });

  it('breaks a runs tie on the higher strike rate', () => {
    const tied = [
      {
        number: 1,
        label: '1',
        battingTeam: 'A',
        bowlingTeam: 'B',
        batting: [
          { name: 'Slow', runs: 50, balls: 50, fours: 5, sixes: 0, sr: 100 },
          { name: 'Quick', runs: 50, balls: 25, fours: 5, sixes: 0, sr: 200 },
        ],
        bowling: [],
      },
    ];
    expect(topBatter(tied)?.name).toBe('Quick');
  });

  it('finds a top bowler with wickets, runs, overs, maidens and an economy', () => {
    const best = topBowler(scorecards);
    expect(best).not.toBeNull();
    expect(best!.wickets).toBeGreaterThan(0);
    expect(best!.overs).toMatch(/^\d+(\.\d)?$/);
    expect(typeof best!.economy).toBe('number');
  });

  it('breaks a wickets tie on the lower economy', () => {
    const tied = [
      {
        number: 1,
        label: '1',
        battingTeam: 'A',
        bowlingTeam: 'B',
        batting: [],
        bowling: [
          { name: 'Costly', overs: '10', maidens: 0, runs: 60, wickets: 3, econ: 6 },
          { name: 'Tidy', overs: '10', maidens: 1, runs: 40, wickets: 3, econ: 4 },
        ],
      },
    ];
    expect(topBowler(tied)?.name).toBe('Tidy');
  });

  it('sums a Test bowler across both spells rather than double counting', () => {
    const figures = aggregateBowlers(scorecards);
    // A Test bowler bowls in two innings; the aggregate must be one entry.
    const names = new Set(figures.map((f) => f.name));
    expect(names.size).toBe(figures.length);
  });

  it('recomputes the overs figure after summing both spells, not the first one', () => {
    // Regression: the aggregate took its overs from whichever innings the bowler
    // appeared in first, so a bowler taking 8/72 across 18 + 12 overs printed
    // "in 18 ov" beside an economy of 2.40 — two numbers describing different spans.
    const twoSpell = [
      {
        number: 1,
        label: '1',
        battingTeam: 'A',
        bowlingTeam: 'B',
        batting: [],
        bowling: [
          { name: 'Bumrah', overs: '18', maidens: 6, runs: 30, wickets: 5, econ: 1.67 },
        ],
      },
      {
        number: 2,
        label: '2',
        battingTeam: 'A',
        bowlingTeam: 'B',
        batting: [],
        bowling: [
          { name: 'Bumrah', overs: '12', maidens: 1, runs: 42, wickets: 3, econ: 3.5 },
        ],
      },
    ];
    const figure = aggregateBowlers(twoSpell)[0];
    expect(figure.balls).toBe(180);
    expect(figure.overs).toBe('30');
    expect(figure.wickets).toBe(8);
    expect(figure.runs).toBe(72);
    expect(figure.maidens).toBe(7);
    // 72 runs in 30 overs. If `overs` were still 18 this would read 4.00.
    expect(figure.economy).toBeCloseTo(2.4, 2);
  });

  it('agrees with the real fixture: Bumrah 8/72 in 30 overs at 2.40', () => {
    const figure = aggregateBowlers(scorecards).find((f) => f.name.includes('Bumrah'));
    expect(figure).toBeDefined();
    expect(figure!.wickets).toBe(8);
    expect(figure!.runs).toBe(72);
    expect(figure!.overs).toBe('30');
    expect(figure!.economy).toBeCloseTo(2.4, 2);
  });

  it('has no top performer when the scorecard is empty', () => {
    expect(topBatter([])).toBeNull();
    expect(topBowler([])).toBeNull();
  });
});

describe('player of the match', () => {
  it('is null when the API does not name one', () => {
    // `winnerId` is a team competitor id, not a player, so it must not be read as one.
    expect(playerOfTheMatch(testMatch)).toBeNull();
    expect(playerOfTheMatch(odi)).toBeNull();
    expect(playerOfTheMatch(null)).toBeNull();
  });

  it('is returned only when the API actually provides one', () => {
    expect(
      playerOfTheMatch({ playerOfTheMatch: { name: 'A Player', id: 'sr:player:9' } }),
    ).toEqual({ name: 'A Player', id: 'sr:player:9' });
  });
});

/* ─── Existing extraction still works ────────────────────────── */

describe('the shared scorecard extractor prefers the provider figures', () => {
  it('returns a card per innings for the real Test', () => {
    const cards = extractInningsScorecards(testMatch, testTimeline);
    expect(cards.map((c) => c.number)).toEqual([1, 2, 3, 4]);
  });

  it('labels innings 3 as the side that batted it', () => {
    const cards = extractInningsScorecards(testMatch, testTimeline);
    expect(cards[2].battingTeam).toBe('India');
    expect(cards[2].bowlingTeam).toBe('Australia');
  });

  it('still falls back to ball replay when there is no provider scorecard', () => {
    const cards = extractInningsScorecards(testMatch, {
      timeline: [
        {
          inning: 1,
          over_number: 1,
          batting_params: { striker: { name: 'Smith' }, runs_scored: 1 },
          bowling_params: { bowler: { name: 'Bumrah' } },
        },
      ],
    } as never);
    expect(cards).toHaveLength(1);
    expect(cards[0].batting[0].name).toBe('Smith');
  });
});

describe('the shared squad extractor still falls back to the scorecard', () => {
  it('returns both sides for the real Test', () => {
    const squads = extractSquads(testMatch, testTimeline);
    expect(squads.home.length).toBeGreaterThan(0);
    expect(squads.away.length).toBeGreaterThan(0);
  });
});
