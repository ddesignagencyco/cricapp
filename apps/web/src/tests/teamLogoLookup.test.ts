import { lookupTeamLogo } from '../components/TeamLogosProvider';

const logos = {
  'id:cb:team:334': 'https://img.test/psz-by-id.png',
  'abbr:psz': 'https://img.test/psz-by-abbr.png',
  'abbr:kag': 'https://img.test/kag.png',
  'name:kathmandu gorkhas': 'https://img.test/kag-by-name.png',
  'name:united tigers': 'https://img.test/ut.png',
};

describe('lookupTeamLogo', () => {
  it('prefers the id, then the abbreviation, then the name', () => {
    expect(lookupTeamLogo(logos, { teamId: 'cb:team:334', code: 'PSZ', name: 'Peshawar Zalmi' })).toBe('https://img.test/psz-by-id.png');
    expect(lookupTeamLogo(logos, { code: 'PSZ', name: 'x' })).toBe('https://img.test/psz-by-abbr.png');
    expect(lookupTeamLogo(logos, { code: 'ZZZ', name: 'United Tigers' })).toBe('https://img.test/ut.png');
  });

  it('is case- and whitespace-insensitive, since cards carry codes in any case', () => {
    expect(lookupTeamLogo(logos, { teamId: ' CB:TEAM:334 ' })).toBe('https://img.test/psz-by-id.png');
    expect(lookupTeamLogo(logos, { code: 'kag' })).toBe('https://img.test/kag.png');
    expect(lookupTeamLogo(logos, { name: 'KATHMANDU GORKHAS' })).toBe('https://img.test/kag-by-name.png');
  });

  it('returns null when nothing matches, so the initials fallback is used', () => {
    expect(lookupTeamLogo(logos, { teamId: 'cb:team:1', code: 'NOPE', name: 'Nobody' })).toBeNull();
    expect(lookupTeamLogo({}, { code: 'PSZ' })).toBeNull();
    expect(lookupTeamLogo(logos, {})).toBeNull();
  });
});
