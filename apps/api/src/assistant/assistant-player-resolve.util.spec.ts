import { describe, it, expect } from '@jest/globals';
import {
  pickPlayerIdFromCandidates,
  playerNameSearchVariants,
} from './assistant-player-resolve.util.js';

describe('assistant-player-resolve.util', () => {
  it('generates Sportradar last-first variant', () => {
    expect(playerNameSearchVariants('Babar Azam')).toContain('Azam, Babar');
  });

  it('matches Babar Azam query to Azam, Babar row', () => {
    const id = pickPlayerIdFromCandidates(
      [{ id: 'sr:player:1', fullName: 'Azam, Babar' }],
      'Babar Azam',
    );
    expect(id).toBe('sr:player:1');
  });
});
