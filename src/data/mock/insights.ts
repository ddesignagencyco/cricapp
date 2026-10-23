import type { ModelPerformance, Prediction, Ranking, Standing } from '../types';

const now = Date.now();
const ago = (minutes: number) => new Date(now - minutes * 60_000).toISOString();

const MODEL = 'cric-wp 0.4.2';

export const predictions: Record<string, Prediction> = {
  m1: {
    matchId: 'm1',
    modelVersion: MODEL,
    generatedAt: ago(0.5),
    winA: 0.38,
    confidence: 'Medium',
    projected: { teamId: 'pak', low: 172, high: 190, mid: 181 },
    history: [
      { over: 0, p: 0.46 },
      { over: 1, p: 0.48 },
      { over: 2, p: 0.47 },
      { over: 3, p: 0.52 },
      { over: 4, p: 0.51 },
      { over: 5, p: 0.55 },
      { over: 6, p: 0.57 },
      { over: 7, p: 0.49, event: 'wicket' },
      { over: 8, p: 0.48 },
      { over: 9, p: 0.5 },
      { over: 10, p: 0.56, event: 'six' },
      { over: 11, p: 0.54 },
      { over: 12, p: 0.46, event: 'wicket' },
      { over: 13, p: 0.44 },
      { over: 14, p: 0.36, event: 'wicket' },
      { over: 15, p: 0.41, event: 'six' },
      { over: 16, p: 0.37 },
      { over: 16.5, p: 0.38 },
    ],
    topBatters: [
      { playerId: 'fakhar', p: 0.42 },
      { playerId: 'farhan', p: 0.31 },
      { playerId: 'brevis', p: 0.12 },
    ],
    topBowlers: [
      { playerId: 'shaheen', p: 0.29 },
      { playerId: 'rabada', p: 0.24 },
      { playerId: 'rauf', p: 0.19 },
    ],
    venue: [
      { label: 'Avg 1st innings', value: '182', tone: 'neutral' },
      { label: 'Chasing wins (last 10)', value: '6', tone: 'good' },
      { label: 'Pace share of wickets', value: '62%', tone: 'neutral' },
      { label: 'Dew expected', value: 'Moderate', tone: 'good' },
    ],
    weather: { temp: 27, humidity: 48, wind: 11, rain: 0, summary: 'Clear evening' },
    tossAdjusted: { before: 0.44, after: 0.47, note: 'Bowling first in Rawalpindi lifts the chasing side by about 3 points, mainly from dew in the second innings.' },
    why: [
      { label: 'Required rate above 12', delta: -6.1, detail: 'Chases needing 12+ an over from 17 overs succeed 28% of the time at this venue.' },
      { label: 'Set batter at the crease', delta: 3.4, detail: 'Fakhar is 27* (18) with a 150 strike rate; set batters convert late chases far more often.' },
      { label: 'Rabada has 3 balls left in his spell', delta: -1.2, detail: 'South Africa\'s best death bowler still has one over to come after this one.' },
      { label: 'Seven wickets in hand', delta: 2.2, detail: 'Pakistan can attack every ball without exposing the tail.' },
    ],
    momentum: 0.44,
    pressure: 0.71,
    inputs: ['Ball-by-ball state (16.3 ov)', 'Venue history (48 T20s)', 'Player form (last 10 inns)', 'Weather & dew model', 'Toss & innings order'],
  },
  m5: {
    matchId: 'm5',
    modelVersion: MODEL,
    generatedAt: ago(45),
    winA: 0.56,
    confidence: 'Medium',
    projected: { teamId: 'pak', low: 168, high: 189, mid: 178 },
    topBatters: [
      { playerId: 'farhan', p: 0.24 },
      { playerId: 'babar', p: 0.21 },
      { playerId: 'qdk', p: 0.18 },
    ],
    topBowlers: [
      { playerId: 'abrar', p: 0.27 },
      { playerId: 'shaheen', p: 0.22 },
      { playerId: 'jansen', p: 0.16 },
    ],
    venue: [
      { label: 'Avg 1st innings', value: '176', tone: 'neutral' },
      { label: 'Spin economy', value: '7.1', tone: 'good' },
      { label: 'Toss winner won', value: '58%', tone: 'neutral' },
      { label: 'Dew expected', value: 'Heavy', tone: 'good' },
    ],
    weather: { temp: 25, humidity: 61, wind: 8, rain: 5, summary: 'Mild, light haze' },
    why: [
      { label: 'Home conditions', delta: 4.0, detail: 'Pakistan have won 9 of their last 12 T20Is in Lahore.' },
      { label: 'Spin-friendly surface', delta: 2.5, detail: 'Abrar and Sufiyan average under 17 here.' },
      { label: 'South Africa top order form', delta: -1.8, detail: 'de Kock and Brevis are both striking above 150 this series.' },
    ],
    inputs: ['Squads & availability', 'Venue history (61 T20s)', 'Head-to-head (last 5 yrs)', 'Weather forecast', 'Player form (last 10 inns)'],
  },
  m6: {
    matchId: 'm6',
    modelVersion: MODEL,
    generatedAt: ago(120),
    winA: 0.68,
    confidence: 'High',
    projected: { teamId: 'ind', low: 176, high: 201, mid: 188 },
    topBatters: [
      { playerId: 'gill', p: 0.26 },
    ],
    topBowlers: [
      { playerId: 'bumrah', p: 0.31 },
    ],
    venue: [
      { label: 'Avg 1st innings', value: '178', tone: 'neutral' },
      { label: 'Chasing wins (last 10)', value: '5', tone: 'neutral' },
    ],
    weather: { temp: 29, humidity: 40, wind: 6, rain: 0, summary: 'Clear' },
    why: [
      { label: 'Home side, ranked No. 1', delta: 9.0, detail: 'India have won 80% of home T20Is since 2024.' },
    ],
    inputs: ['Squads & availability', 'Venue history', 'Rankings'],
  },
  m7: {
    matchId: 'm7',
    modelVersion: MODEL,
    generatedAt: ago(3000),
    winA: 0.53,
    confidence: 'Low',
    projected: { teamId: 'sa', low: 160, high: 184, mid: 172 },
    topBatters: [],
    topBowlers: [],
    venue: [],
    weather: { temp: 26, humidity: 50, wind: 9, rain: 0, summary: 'Clear' },
    why: [],
    inputs: [],
    outcome: 'correct',
  },
  m8: {
    matchId: 'm8',
    modelVersion: MODEL,
    generatedAt: ago(2500),
    winA: 0.74,
    confidence: 'High',
    projected: { teamId: 'afg', low: 230, high: 268, mid: 249 },
    topBatters: [],
    topBowlers: [],
    venue: [],
    weather: { temp: 22, humidity: 55, wind: 14, rain: 0, summary: 'Breezy' },
    why: [],
    inputs: [],
    outcome: 'correct',
  },
  m10: {
    matchId: 'm10',
    modelVersion: MODEL,
    generatedAt: '2026-05-18T18:00:00.000Z',
    winA: 0.47,
    confidence: 'Low',
    projected: { teamId: 'iu', low: 164, high: 190, mid: 177 },
    topBatters: [],
    topBowlers: [],
    venue: [],
    weather: { temp: 34, humidity: 30, wind: 7, rain: 0, summary: 'Hot' },
    why: [],
    inputs: [],
    outcome: 'incorrect',
  },
};

export const modelPerformance: ModelPerformance = {
  modelVersion: MODEL,
  since: '2026-03-01',
  total: 214,
  correct: 141,
  brier: 0.208,
  byFormat: [
    { format: 'T20', total: 152, accuracy: 0.64 },
    { format: 'ODI', total: 46, accuracy: 0.7 },
    { format: 'Test', total: 16, accuracy: 0.69 },
  ],
  bands: [
    { band: '50–60%', predicted: 0.55, actual: 0.53, count: 88 },
    { band: '60–70%', predicted: 0.65, actual: 0.63, count: 71 },
    { band: '70–80%', predicted: 0.75, actual: 0.78, count: 39 },
    { band: '80%+', predicted: 0.85, actual: 0.81, count: 16 },
  ],
};

export const standings: Record<string, Standing[]> = {
  psl11: [
    { teamId: 'lq', played: 10, won: 7, lost: 3, noResult: 0, points: 14, nrr: 0.912, form: ['W', 'W', 'L', 'W', 'W'], qualified: true },
    { teamId: 'iu', played: 10, won: 6, lost: 3, noResult: 1, points: 13, nrr: 0.604, form: ['W', 'L', 'W', 'N', 'W'], qualified: true },
    { teamId: 'ms', played: 10, won: 6, lost: 4, noResult: 0, points: 12, nrr: 0.211, form: ['L', 'W', 'W', 'L', 'W'], qualified: true },
    { teamId: 'pz', played: 10, won: 5, lost: 5, noResult: 0, points: 10, nrr: -0.087, form: ['W', 'L', 'L', 'W', 'L'], qualified: true },
    { teamId: 'kk', played: 10, won: 3, lost: 6, noResult: 1, points: 7, nrr: -0.654, form: ['L', 'L', 'W', 'N', 'L'] },
    { teamId: 'qg', played: 10, won: 2, lost: 8, noResult: 0, points: 4, nrr: -1.012, form: ['L', 'W', 'L', 'L', 'L'] },
  ],
  'pak-sa-t20': [
    { teamId: 'pak', played: 1, won: 1, lost: 0, noResult: 0, points: 2, nrr: 0.412, form: ['W'] },
    { teamId: 'sa', played: 1, won: 0, lost: 1, noResult: 0, points: 0, nrr: -0.412, form: ['L'] },
  ],
  nt20: [
    { teamId: 'kb', played: 6, won: 5, lost: 1, noResult: 0, points: 10, nrr: 1.104, form: ['W', 'W', 'W', 'L', 'W'] },
    { teamId: 'lw', played: 6, won: 4, lost: 2, noResult: 0, points: 8, nrr: 0.387, form: ['W', 'L', 'W', 'W', 'L'] },
  ],
};

export const teamRankings: Record<'T20' | 'ODI' | 'Test', Ranking[]> = {
  T20: [
    { rank: 1, id: 'ind', rating: 271, change: 0, matches: 54 },
    { rank: 2, id: 'aus', rating: 262, change: 0, matches: 31 },
    { rank: 3, id: 'eng', rating: 254, change: 1, matches: 38 },
    { rank: 4, id: 'nz', rating: 251, change: -1, matches: 35 },
    { rank: 5, id: 'sa', rating: 246, change: 0, matches: 33 },
    { rank: 6, id: 'pak', rating: 243, change: 1, matches: 46 },
    { rank: 7, id: 'wi', rating: 238, change: -1, matches: 37 },
    { rank: 8, id: 'sl', rating: 230, change: 0, matches: 40 },
    { rank: 9, id: 'afg', rating: 226, change: 0, matches: 29 },
    { rank: 10, id: 'ban', rating: 219, change: 0, matches: 41 },
  ],
  ODI: [
    { rank: 1, id: 'ind', rating: 122, change: 0 },
    { rank: 2, id: 'aus', rating: 113, change: 0 },
    { rank: 3, id: 'pak', rating: 108, change: 1 },
    { rank: 4, id: 'nz', rating: 107, change: -1 },
    { rank: 5, id: 'sa', rating: 103, change: 0 },
    { rank: 6, id: 'sl', rating: 101, change: 0 },
    { rank: 7, id: 'eng', rating: 96, change: 0 },
    { rank: 8, id: 'afg', rating: 92, change: 0 },
  ],
  Test: [
    { rank: 1, id: 'aus', rating: 123, change: 0 },
    { rank: 2, id: 'sa', rating: 116, change: 0 },
    { rank: 3, id: 'eng', rating: 113, change: 0 },
    { rank: 4, id: 'ind', rating: 107, change: 0 },
    { rank: 5, id: 'nz', rating: 96, change: 0 },
    { rank: 6, id: 'sl', rating: 90, change: 1 },
    { rank: 7, id: 'pak', rating: 87, change: -1 },
    { rank: 8, id: 'wi', rating: 74, change: 0 },
  ],
};

export const playerRankings: Record<'batters' | 'bowlers', Ranking[]> = {
  batters: [
    { rank: 1, id: 'babar', rating: 812, change: 2 },
    { rank: 2, id: 'gill', rating: 798, change: -1 },
    { rank: 3, id: 'brevis', rating: 771, change: 4 },
    { rank: 4, id: 'rizwan', rating: 744, change: -1 },
    { rank: 5, id: 'markram', rating: 731, change: 0 },
    { rank: 6, id: 'saim', rating: 702, change: 3 },
    { rank: 7, id: 'qdk', rating: 690, change: -2 },
  ],
  bowlers: [
    { rank: 1, id: 'bumrah', rating: 768, change: 0 },
    { rank: 2, id: 'abrar', rating: 741, change: 3 },
    { rank: 3, id: 'shaheen', rating: 729, change: -1 },
    { rank: 4, id: 'rabada', rating: 702, change: 0 },
    { rank: 5, id: 'sufiyan', rating: 688, change: 5 },
    { rank: 6, id: 'rauf', rating: 671, change: -1 },
  ],
};

/** Head-to-head in T20Is (sample). */
export const headToHead: Record<string, { played: number; aWins: number; bWins: number; noResult: number; last5: string[] }> = {
  'pak-sa': { played: 25, aWins: 13, bWins: 12, noResult: 0, last5: ['pak', 'sa', 'pak', 'sa', 'pak'] },
};
