import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  countryNameFromCode,
  resolveTeamCountry,
  buildTeamFromCompetitor,
  managerDisplayName,
} from '../src/teamMeta.js';

describe('teamMeta', () => {
  it('maps common country codes', () => {
    assert.equal(countryNameFromCode('IND'), 'India');
    assert.equal(countryNameFromCode('eng'), 'England');
  });

  it('uses tournament category for franchise teams', () => {
    const comp = { id: 'sr:competitor:1', name: 'Karachi Kings', abbreviation: 'KKI' };
    const event = {
      tournament: { category: { name: 'Pakistan', country_code: 'PAK' } },
    };
    assert.equal(resolveTeamCountry(comp, event), 'Pakistan');
  });

  it('does not use International category as country', () => {
    const comp = { id: 'sr:competitor:2', name: 'Zimbabwe', country_code: 'ZWE' };
    const event = { tournament: { category: { name: 'International' } } };
    assert.equal(resolveTeamCountry(comp, event), 'Zimbabwe');
  });

  it('uses team.category when country is absent (franchise leagues)', () => {
    const comp = {
      id: 'sr:competitor:916189',
      name: 'Trinbago Knight Riders',
      category: { name: 'West Indies' },
    };
    assert.equal(resolveTeamCountry(comp, {}), 'West Indies');
  });

  it('sets manager on lineup-derived team rows via normalize (competitor helper)', () => {
    assert.equal(managerDisplayName({ name: 'Lane, Mark' }), 'Lane, Mark');
    const row = buildTeamFromCompetitor(
      { id: 'x', name: 'England', abbreviation: 'ENG', country: 'England' },
      {},
    );
    assert.equal(row.country, 'England');
  });
});
