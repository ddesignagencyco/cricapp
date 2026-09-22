import { describe, it, expect } from '@jest/globals';
import {
  pickTeamIdFromCandidates,
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
