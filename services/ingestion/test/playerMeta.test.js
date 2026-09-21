import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildPlayerFromLineupEntry, buildPlayerFromProfile } from '../src/playerMeta.js';

describe('playerMeta', () => {
  it('maps lineup country_code and birth', () => {
    const row = buildPlayerFromLineupEntry(
      {
        id: 'sr:player:1',
        name: 'Bennet, Brian',
        date_of_birth: '2003-11-10',
        country_code: 'ZWE',
        nationality: 'Zimbabwe',
        type: 'batsman',
      },
      'sr:competitor:1',
    );
    assert.equal(row.countryCode, 'ZWE');
    assert.equal(row.birth, '2003-11-10');
    assert.equal(row.role, 'batsman');
  });

  it('maps profile height and jersey from roles', () => {
    const row = buildPlayerFromProfile({
      player: {
        id: 'sr:player:646278',
        name: 'Smith, Steve',
        height: 176,
        country_code: 'AUS',
        type: 'batsman',
        batting_style: 'right_handed_batsman',
      },
      roles: [{ active: true, jersey_number: 49, team: { id: 'sr:competitor:142690' } }],
    });
    assert.equal(row.height, 176);
    assert.equal(row.countryCode, 'AUS');
    assert.equal(row.jerseyNumber, 49);
    assert.equal(row.battingStyle, 'right_handed_batsman');
  });
});
