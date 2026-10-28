import { describe, it, expect } from '@jest/globals';
import {
  pickTeamIdFromCandidates,
  tiedTopTeamIds,
  WOMEN_TEAM_RE,
  withoutWomenMarker,
  looksLikePlayerVersusQuery,
  scoreTeamCandidate,
} from './assistant-team-resolve.util.js';

describe('assistant-team-resolve.util', () => {
  it('prefers IND for ind over substring matches', () => {
    const india = { id: 'sr:competitor:107203', name: 'India', abbr: 'IND', country: 'India' };
    const franchise = { id: 'sr:competitor:999', name: 'Rawalpindi Pindiz', abbr: 'RPI', country: 'Pakistan' };
    expect(scoreTeamCandidate('ind', india)).toBeGreaterThan(scoreTeamCandidate('ind', franchise));
    expect(pickTeamIdFromCandidates('ind', [franchise, india])).toBe(india.id);
  });

  it('resolves pak to Pakistan', () => {
    const pak = { id: 'sr:competitor:107204', name: 'Pakistan', abbr: 'PAK', country: 'Pakistan' };
    expect(pickTeamIdFromCandidates('pak', [pak])).toBe(pak.id);
  });

  it('detects player vs player phrasing', () => {
    expect(looksLikePlayerVersusQuery('Babar Azam', 'Mohammad Rizwan')).toBe(true);
    expect(looksLikePlayerVersusQuery('ind', 'pak')).toBe(false);
    expect(looksLikePlayerVersusQuery('Lahore', 'Karachi')).toBe(false);
  });
});

describe('teams that share a name', () => {
  const pakistanSides = [
    { id: 'sr:competitor:142704', name: 'Pakistan', abbr: 'PAK', country: 'Pakistan' },
    { id: 'sr:competitor:247875', name: 'Pakistan', abbr: 'PAK', country: 'Pakistan' },
    { id: 'sr:competitor:1058555', name: 'Pakistan Legends', abbr: 'PAK', country: null },
  ];

  it('reports both tied sides instead of giving up', () => {
    expect(pickTeamIdFromCandidates('Pakistan', pakistanSides)).toBeNull();
    expect(tiedTopTeamIds('Pakistan', pakistanSides).sort()).toEqual(
      ['sr:competitor:142704', 'sr:competitor:247875'].sort(),
    );
  });

  it('reports nothing when one team clearly wins', () => {
    expect(tiedTopTeamIds('Pakistan Legends', pakistanSides)).toEqual([]);
  });

  it('recognises and strips a women marker', () => {
    expect(WOMEN_TEAM_RE.test('Pakistan Women')).toBe(true);
    expect(WOMEN_TEAM_RE.test("England Women's")).toBe(true);
    expect(WOMEN_TEAM_RE.test('India (W)')).toBe(true);
    expect(WOMEN_TEAM_RE.test('Pakistan')).toBe(false);
    expect(withoutWomenMarker("England Women's")).toBe('England');
  });
});
