import { gradePrediction, winningSide } from '../lib/predictions';

// Sydney Sixers v Perth Scorchers, 21 Oct 2026: stored pre-match call was 50/50.
const sysPes = {
  status: 'completed',
  teamNames: ['Sydney Sixers', 'Perth Scorchers'],
  teamScores: {
    home: { id: 'sr:competitor:305408', name: 'Sydney Sixers', code: 'SYS', score: '149/8' },
    away: { id: 'sr:competitor:305416', name: 'Perth Scorchers', code: 'PES', score: '134/7' },
  },
  winnerId: 'sr:competitor:305408',
  result: 'Sydney Sixers won by 15 runs',
};

describe('winningSide', () => {
  it('uses winnerId first', () => {
    expect(winningSide(sysPes)).toBe('home');
  });

  it('falls back to the side named in the result when winnerId is missing', () => {
    expect(winningSide({ ...sysPes, winnerId: null, result: 'Perth Scorchers won by 2 wickets' })).toBe('away');
  });

  it('prefers the longer name (Pakistan Women is not Pakistan)', () => {
    const match = {
      teamNames: ['Pakistan', 'Pakistan Women'],
      teamScores: { home: { name: 'Pakistan' }, away: { name: 'Pakistan Women' } },
      result: 'Pakistan Women won by 5 wickets',
    };
    expect(winningSide(match)).toBe('away');
  });

  it('has no winner for a tie or no result', () => {
    expect(winningSide({ ...sysPes, winnerId: null, result: 'Match tied' })).toBeNull();
  });
});

describe('gradePrediction', () => {
  it('calls a 50/50 "no call", not a correct guess', () => {
    expect(gradePrediction({ homeWinProb: 0.5, awayWinProb: 0.5 }, sysPes)).toEqual({ kind: 'no-call', winner: 'home' });
  });

  it('marks a right favourite correct', () => {
    expect(gradePrediction({ homeWinProb: 0.66, awayWinProb: 0.34 }, sysPes)).toEqual({
      kind: 'correct', favourite: 'home', pct: 66, winner: 'home',
    });
  });

  it('marks a wrong favourite wrong instead of hiding it', () => {
    expect(gradePrediction({ homeWinProb: 0.3, awayWinProb: 0.7 }, sysPes)).toEqual({
      kind: 'wrong', favourite: 'away', pct: 70, winner: 'home',
    });
  });

  it('has nothing to grade without a winner', () => {
    expect(gradePrediction({ homeWinProb: 0.7, awayWinProb: 0.3 }, { ...sysPes, winnerId: null, result: 'No result' })).toEqual({ kind: 'no-winner' });
  });
});
